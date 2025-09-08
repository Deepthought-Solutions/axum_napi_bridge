use axum::routing::get;
use axum_napi_bridge::napi_axum_bridge;

fn my_app() -> axum::Router {
    axum::Router::new()
        .route("/", get(|| async { "Hello from the example app!" }))
        .route("/test", get(|| async { "This is a test route." }))
}

napi_axum_bridge!(my_app);
