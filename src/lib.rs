// Re-exports for the macro
#[doc(hidden)]
pub use axum;
#[doc(hidden)]
pub use http_body_util;
#[doc(hidden)]
pub use napi;
#[doc(hidden)]
pub use napi_derive;
#[doc(hidden)]
pub use once_cell;
#[doc(hidden)]
pub use serde;
#[doc(hidden)]
pub use serde_json;
#[doc(hidden)]
pub use tower;

#[macro_export]
macro_rules! napi_axum_bridge {
  ($router_creator:ident) => {
    use $crate::axum::{
      body::{Body, Bytes},
      http::{
        header::{HeaderMap, HeaderName, HeaderValue},
        Request,
      },
      Router,
    };
    use $crate::http_body_util::BodyExt;
    use $crate::napi::bindgen_prelude::*;
    use $crate::napi_derive::napi;
    use $crate::once_cell::sync::OnceCell;
    use $crate::serde::Serialize;
    use $crate::serde_json;
    use $crate::tower::ServiceExt;

    static ROUTER: OnceCell<Router> = OnceCell::new();

    fn headers_vec_to_map(h: &[(String, String)]) -> HeaderMap {
      let mut map = HeaderMap::new();
      for (k, v) in h {
        if let Ok(name) = HeaderName::try_from(k.as_str()) {
          if let Ok(value) = HeaderValue::try_from(v.as_str()) {
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
      pub body: String,
    }

    fn init_router() {
      ROUTER.get_or_init($router_creator);
    }

    #[napi]
    pub async fn handle_request(
      method: String,
      path: String,
      headers: Option<Vec<(String, String)>>,
      body: Option<Buffer>,
    ) -> Result<String> {
      init_router();
      let router = ROUTER.get().expect("router initialized").clone();
      let body_bytes = body.map(|b| b.to_vec()).unwrap_or_else(Vec::new);

      let mut request_builder = Request::builder()
        .method(method.as_str())
        .uri(path.as_str());

      if let Some(hdrs) = headers {
        let header_map = headers_vec_to_map(&hdrs);
        if let Some(headers) = request_builder.headers_mut() {
          *headers = header_map;
        }
      }

      let request = request_builder
        .body(Body::from(body_bytes))
        .map_err(|e| napi::Error::from_reason(format!("request build: {}", e)))?;

      let resp = router
        .oneshot(request)
        .await
        .map_err(|e| napi::Error::from_reason(format!("router error: {}", e)))?;

      let status = resp.status().as_u16();
      let headers_out = resp
        .headers()
        .iter()
        .map(|(k, v)| (k.as_str().to_string(), v.to_str().unwrap_or("").to_string()))
        .collect::<Vec<_>>();
      let bytes: Bytes = resp
        .into_body()
        .collect()
        .await
        .map_err(|e| napi::Error::from_reason(format!("body error: {}", e)))?
        .to_bytes();
      let body_text = String::from_utf8_lossy(&bytes).to_string();

      let js_resp = JsResponse {
        status,
        headers: headers_out,
        body: body_text,
      };
      let json = serde_json::to_string(&js_resp)
        .map_err(|e| napi::Error::from_reason(format!("serde error: {}", e)))?;
      Ok(json)
    }
  };
}
