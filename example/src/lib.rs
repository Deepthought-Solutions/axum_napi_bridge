use axum_wsgi::{axum, axum_wsgi};
use axum::{routing::get, Router};

fn app() -> Router {
    Router::new()
        .route("/", get(|| async { "Hello from your Axum app!" }))
        .route("/foo", get(|| async { "Hello from /foo" }))
}

axum_wsgi!(example_axum_app, app);
