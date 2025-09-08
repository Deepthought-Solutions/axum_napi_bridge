/// Re-export for use in the macro
pub use axum;
pub use futures_util;
pub use http_body_util;
pub use hyper;
pub use pyo3;
pub use tokio;
pub use tower;

#[macro_export]
macro_rules! axum_wsgi {
    ($py_module_name:ident, $app_creator:path) => {
        mod __axum_wsgi_private {
            use super::*;
            use $crate::axum::body::Body;
            use $crate::axum::Router;
            use $crate::http_body_util::BodyExt;
            use $crate::hyper::{body::Incoming, Request, Response};
            use $crate::pyo3::exceptions::PyTypeError;
            use $crate::pyo3::prelude::*;
            use $crate::pyo3::types::{PyAny, PyBytes, PyDict};
            use $crate::tokio::runtime::Runtime;
            use $crate::tower::ServiceExt;
            use std::io::{Cursor, Read};

            const CHUNK_SIZE: usize = 8192;

            #[pyclass]
            pub struct ResponseIterator {
                cursor: Cursor<Vec<u8>>,
            }

            #[pymethods]
            impl ResponseIterator {
                fn __iter__(slf: PyRef<Self>) -> PyRef<Self> {
                    slf
                }

                fn __next__(&mut self, py: Python) -> PyResult<Option<Py<PyBytes>>> {
                    let mut chunk = vec![0; CHUNK_SIZE];
                    match self.cursor.read(&mut chunk) {
                        Ok(0) => Ok(None), // End of stream
                        Ok(n) => {
                            Ok(Some(PyBytes::new(py, &chunk[..n]).into()))
                        }
                        Err(e) => Err(PyTypeError::new_err(format!("Error reading body chunk: {}", e))),
                    }
                }
            }

            #[pyclass]
            pub struct AxumWsgi {
                app: Router,
                rt: Runtime,
            }

            #[pymethods]
            impl AxumWsgi {
                #[new]
                fn new() -> PyResult<Self> {
                    let app = $app_creator();
                    let rt = $crate::tokio::runtime::Builder::new_multi_thread()
                        .enable_all()
                        .build()
                        .unwrap();
                    Ok(AxumWsgi { app, rt })
                }

                fn __call__(
                    &self,
                    py: Python,
                    environ: &PyAny,
                    start_response: &PyAny,
                ) -> PyResult<ResponseIterator> {
                    let environ: &PyDict = environ
                        .downcast()
                        .map_err(|_| PyTypeError::new_err("environ must be dict"))?;

                    let method = environ
                        .get_item("REQUEST_METHOD")
                        .and_then(|m| m.extract::<&str>().ok())
                        .unwrap_or("GET");
                    let path = environ
                        .get_item("PATH_INFO")
                        .and_then(|p| p.extract::<&str>().ok())
                        .unwrap_or("/");

                    let query = environ
                        .get_item("QUERY_STRING")
                        .and_then(|q| q.extract::<&str>().ok())
                        .unwrap_or("");
                    let full_uri = if query.is_empty() {
                        path.to_string()
                    } else {
                        format!("{}?{}", path, query)
                    };

                    let mut req_builder = Request::builder().method(method).uri(full_uri);

                    if let Some(ct) =
                        environ.get_item("CONTENT_TYPE").and_then(|v| v.extract::<String>().ok())
                    {
                        req_builder = req_builder.header("content-type", ct);
                    }

                    if let Some(cl) =
                        environ.get_item("CONTENT_LENGTH").and_then(|v| v.extract::<String>().ok())
                    {
                        req_builder = req_builder.header("content-length", cl);
                    }

                    let body = if let Some(input) = environ.get_item("wsgi.input") {
                        if let Ok(b) = input.call_method0("read")?.extract::<&[u8]>() {
                            Body::from(b.to_vec())
                        } else {
                            Body::empty()
                        }
                    } else {
                        Body::empty()
                    };

                    let req = req_builder.body(body).unwrap();

                    let app = self.app.clone();
                    let (resp, body_bytes) = self.rt.block_on(async move {
                        let svc = app.into_service();
                        let resp = svc.oneshot(req).await.unwrap();
                        let (parts, body) = resp.into_parts();
                        let body_bytes = body.collect().await.unwrap().to_bytes();
                        (Response::from_parts(parts, Body::empty()), body_bytes.to_vec())
                    });

                    let status_line = format!(
                        "{} {}",
                        resp.status().as_u16(),
                        resp.status().canonical_reason().unwrap_or("")
                    );
                    let headers: Vec<(String, String)> = resp
                        .headers()
                        .iter()
                        .map(|(k, v)| (k.to_string(), v.to_str().unwrap_or("").to_string()))
                        .collect();

                    start_response.call1((status_line, headers))?;

                    Ok(ResponseIterator {
                        cursor: Cursor::new(body_bytes),
                    })
                }
            }
        }

        #[$crate::pyo3::prelude::pymodule]
        fn $py_module_name(
            _py: $crate::pyo3::prelude::Python,
            m: &$crate::pyo3::prelude::PyModule,
        ) -> $crate::pyo3::prelude::PyResult<()> {
            m.add_class::<__axum_wsgi_private::AxumWsgi>()?;
            m.add_class::<__axum_wsgi_private::ResponseIterator>()?;
            Ok(())
        }
    };
}
