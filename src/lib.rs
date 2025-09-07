use axum::{routing::get, Router};
use futures_util::StreamExt;
use hyper::{body::Incoming, Body, Request, Response};
use pyo3::exceptions::PyTypeError;
use pyo3::prelude::*;
use pyo3::types::{PyAny, PyBytes, PyDict};
use tokio::runtime::Runtime;
use tower::ServiceExt;

/// Itérateur Python pour streamer la réponse Axum
#[pyclass]
struct ResponseIterator {
    body: Option<Incoming>,
    rt: Runtime,
}

#[pymethods]
impl ResponseIterator {
    fn __iter__(slf: PyRef<Self>) -> PyRef<Self> {
        slf
    }

    fn __next__(&mut self, py: Python) -> PyResult<Option<Py<PyBytes>>> {
        if let Some(body) = &mut self.body {
            match self.rt.block_on(body.next()) {
                Some(Ok(frame)) => {
                    if let Some(chunk) = frame.data_ref() {
                        return Ok(Some(PyBytes::new(py, chunk).into()));
                    } else {
                        return self.__next__(py); // ignorer les frames non-data
                    }
                }
                Some(Err(e)) => return Err(PyTypeError::new_err(format!("body error: {}", e))),
                None => {
                    self.body = None;
                    return Ok(None);
                }
            }
        }
        Ok(None)
    }
}

/// Classe exposée à Python
#[pyclass]
struct AxumWsgi {
    app: Router,
    rt: Runtime,
}

#[pymethods]
impl AxumWsgi {
    #[new]
    fn new() -> PyResult<Self> {
        let app = Router::new().route("/", get(|| async { "Hello from Axum streaming!" }));
        let rt = Runtime::new().unwrap();
        Ok(AxumWsgi { app, rt })
    }

    /// WSGI entrypoint
    fn __call__(&self, py: Python, environ: &PyAny, start_response: &PyAny) -> PyResult<ResponseIterator> {
        let environ: &PyDict = environ.downcast().map_err(|_| PyTypeError::new_err("environ must be dict"))?;

        let method = environ.get_item("REQUEST_METHOD").and_then(|m| m.extract::<&str>().ok()).unwrap_or("GET");
        let path = environ.get_item("PATH_INFO").and_then(|p| p.extract::<&str>().ok()).unwrap_or("/");
        let query = environ.get_item("QUERY_STRING").and_then(|q| q.extract::<&str>().ok()).unwrap_or("");
        let full_uri = if query.is_empty() { path.to_string() } else { format!("{}?{}", path, query) };

        let mut req = Request::builder()
            .method(method)
            .uri(full_uri)
            .body(Body::empty())
            .unwrap();

        if let Some(ct) = environ.get_item("CONTENT_TYPE").and_then(|v| v.extract::<String>().ok()) {
            req.headers_mut().insert("content-type", ct.parse().unwrap());
        }

        if let Some(cl) = environ.get_item("CONTENT_LENGTH").and_then(|v| v.extract::<String>().ok()) {
            req.headers_mut().insert("content-length", cl.parse().unwrap());
        }

        if let Some(input) = environ.get_item("wsgi.input") {
            if let Ok(b) = input.call_method0("read")?.extract::<&[u8]>() {
                *req.body_mut() = Body::from(b.to_vec());
            }
        }

        let app = self.app.clone();
        let resp: Response<Incoming> = self.rt.block_on(async move {
            let svc = app.into_service();
            svc.oneshot(req).await.unwrap()
        });

        let status_line = format!("{} {}", resp.status().as_u16(), resp.status().canonical_reason().unwrap_or(""));
        let headers: Vec<(String, String)> = resp
            .headers()
            .iter()
            .map(|(k, v)| (k.to_string(), v.to_str().unwrap_or("").to_string()))
            .collect();

        start_response.call1((status_line, headers))?;

        Ok(ResponseIterator { body: Some(resp.into_body()), rt: Runtime::new().unwrap() })
    }
}

#[pymodule]
fn axum_wsgi(_py: Python, m: &PyModule) -> PyResult<()> {
    m.add_class::<AxumWsgi>()?;
    m.add_class::<ResponseIterator>()?;
    Ok(())
}

