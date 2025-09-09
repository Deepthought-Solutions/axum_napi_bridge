use axum::routing::get;
use axum_napi_bridge::napi_axum_bridge;

use std::time::Duration;
use tokio::time::sleep;

fn my_app() -> axum::Router {
    axum::Router::new()
        .route("/", get(|| async { "Hello from the example app!" }))
        .route("/test", get(|| async { "This is a test route." }))
        .route("/concurrent-test", get(|| async {
            sleep(Duration::from_millis(50)).await;
            "Concurrent test route."
        }))
}

napi_axum_bridge!(my_app);
