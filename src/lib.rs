// src/lib.rs
use axum::{
    body::Body,
    http::{Request, HeaderMap},
    response::Response,
    routing::get,
    Router,
};
use hyper::body::to_bytes;
use once_cell::sync::OnceCell;
use napi::bindgen_prelude::*;
use napi_derive::napi;
use serde::Serialize;
use std::convert::TryFrom;
use tower::ServiceExt; // for `oneshot`

// Create the global router once
static ROUTER: OnceCell<Router> = OnceCell::new();

fn make_router() -> Router {
    Router::new()
        .route("/", get(|| async { "Hello from your Axum app!" }))
        .route("/foo", get(|| async { "Hello from /foo" }))
}

// Helper to convert headers Vec<(String,String)> -> HeaderMap
fn headers_vec_to_map(h: &[(String, String)]) -> HeaderMap {
    let mut map = HeaderMap::new();
    for (k, v) in h {
        if let Ok(name) = http::header::HeaderName::try_from(k.as_str()) {
            if let Ok(value) = http::HeaderValue::try_from(v.as_str()) {
                map.append(name, value);
            }
        }
    }
    map
}

#[derive(Serialize)]
pub struct JsResponse {
    pub status: u16,
    pub headers: Vec<(String, String)>,
    pub body: String, // base64 if binary needed (here we use text)
}

/// Initialize router once; called lazily
fn init_router() {
    ROUTER.get_or_init(|| make_router())
}

/// This is the exported async function. napi will make it return a Promise in Node.
#[napi]
pub async fn handle_request(
    method: String,
    path: String,
    headers: Option<Vec<(String, String)>>,
    body: Option<Buffer>, // napi::Buffer -> Vec<u8>
) -> Result<String> {
    // ensure router is initialized
    init_router();

    let router = ROUTER.get().expect("router initialized").clone();

    // Build request
    let body_bytes = body.map(|b| b.to_vec()).unwrap_or_else(Vec::new);
    let mut req_builder = Request::builder()
        .method(method.as_str())
        .uri(path.as_str());

    // Attach headers if any
    if let Some(hdrs) = &headers {
        let header_map = headers_vec_to_map(hdrs);
        let (mut parts, _body) = req_builder
            .body(())
            .expect("builder body")
            .into_parts(); // trick to get parts, we'll replace headers
        parts.headers = header_map;
        let request = Request::from_parts(parts, Body::from(body_bytes));
        // run
        let resp = router.oneshot(request).await.map_err(|e| {
            napi::Error::from_reason(format!("router error: {}", e))
        })?;

        // extract response
        let status = resp.status().as_u16();
        let headers_out = resp
            .headers()
            .iter()
            .map(|(k, v)| (k.as_str().to_string(), v.to_str().unwrap_or("").to_string()))
            .collect::<Vec<_>>();
        let bytes = to_bytes(resp.into_body())
            .await
            .map_err(|e| napi::Error::from_reason(format!("body error: {}", e)))?;
        let body_text = String::from_utf8_lossy(&bytes).to_string();

        let js_resp = JsResponse {
            status,
            headers: headers_out,
            body: body_text,
        };
        let json = serde_json::to_string(&js_resp)
            .map_err(|e| napi::Error::from_reason(format!("serde error: {}", e)))?;
        return Ok(json);
    } else {
        // No headers path (simpler)
        let request = req_builder
            .body(Body::from(body_bytes))
            .map_err(|e| napi::Error::from_reason(format!("request build: {}", e)))?;

        let resp = router.oneshot(request).await.map_err(|e| {
            napi::Error::from_reason(format!("router error: {}", e))
        })?;

        let status = resp.status().as_u16();
        let headers_out = resp
            .headers()
            .iter()
            .map(|(k, v)| (k.as_str().to_string(), v.to_str().unwrap_or("").to_string()))
            .collect::<Vec<_>>();
        let bytes = to_bytes(resp.into_body())
            .await
            .map_err(|e| napi::Error::from_reason(format!("body error: {}", e)))?;
        let body_text = String::from_utf8_lossy(&bytes).to_string();

        let js_resp = JsResponse {
            status,
            headers: headers_out,
            body: body_text,
        };
        let json = serde_json::to_string(&js_resp)
            .map_err(|e| napi::Error::from_reason(format!("serde error: {}", e)))?;
        return Ok(json);
    }
}
