# Axum N-API Bridge

This library provides a macro to easily expose an [Axum](https://github.com/tokio-rs/axum) web server, written in Rust, to a Node.js application using [NAPI-rs](https://napi.rs/).

This allows you to write high-performance, memory-safe web services in Rust and seamlessly integrate them into a Node.js environment.

## How it Works

The library provides a macro, `napi_axum_bridge!`, which generates the necessary N-API boilerplate to bridge your Axum `Router` to Node.js. It creates an exported function `handle_request` that can be called from JavaScript with request details.

## Getting Started

### Prerequisites

-   [Rust](https://www.rust-lang.org/tools/install)
-   [Node.js](https://nodejs.org/)
-   `@napi-rs/cli`

### Usage

1.  **Set up your `Cargo.toml`**

    You will need to add this library and its dependencies to your `Cargo.toml`. Because the bridge uses macros from several other crates, you need to include them as direct dependencies in your project.

    ```toml
    [package]
    name = "my-axum-app"
    version = "0.1.0"
    edition = "2021"

    [lib]
    crate-type = ["cdylib"]

    [dependencies]
    axum = "0.7"
    tokio = { version = "1", features = ["macros", "rt-multi-thread"] }

    # The bridge library
    axum_napi_bridge = { git = "https://github.com/your-repo/axum-napi-bridge" } # Or use a path dependency

    # Dependencies required by the bridge's macros
    serde = { version = "1.0", features = ["derive"] }
    serde_json = "1.0"
    napi = { version = "3.0.0", features = ["tokio_rt", "serde-json"] }
    napi-derive = "3.0.0"

    [build-dependencies]
    napi-build = "2"
    ```

2.  **Use the macro in your Rust code**

    In your `src/lib.rs`, define a function that returns your Axum `Router`, and then pass it to the `napi_axum_bridge!` macro.

    ```rust
    use axum::routing::get;
    use axum_napi_bridge::napi_axum_bridge;

    fn my_app() -> axum::Router {
        axum::Router::new()
            .route("/", get(|| async { "Hello from my app!" }))
            .route("/foo", get(|| async { "This is the /foo route." }))
    }

    // This generates the bridge code
    napi_axum_bridge!(my_app);
    ```

3.  **Set up your `package.json`**

    You will need a `package.json` to manage the build process.

    ```json
    {
      "name": "my-axum-app",
      "version": "1.0.0",
      "main": "index.js",
      "scripts": {
        "build": "napi build --release"
      },
      "dependencies": {
        "@napi-rs/cli": "^3.0.0"
      }
    }
    ```

4.  **Build and run**

    ```bash
    npm install
    npm run build
    ```

    You can now `require` the generated `.node` file in your JavaScript code and use the `handleRequest` function.

## Example

For a working example, you can create the following files in a new project.

### `Cargo.toml`

```toml
[package]
name = "example-axum-app"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
axum = "0.7"
tokio = { version = "1", features = ["macros", "rt-multi-thread"] }
axum_napi_bridge = { path = ".." } # Assuming the example is in a subdirectory
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
napi = { version = "3.0.0", features = ["tokio_rt", "serde-json"] }
napi-derive = "3.0.0"

[build-dependencies]
napi-build = "2"
```

### `src/lib.rs`

```rust
use axum::routing::get;
use axum_napi_bridge::napi_axum_bridge;

fn my_app() -> axum::Router {
    axum::Router::new()
        .route("/", get(|| async { "Hello from the example app!" }))
        .route("/test", get(|| async { "This is a test route." }))
}

napi_axum_bridge!(my_app);
```

### `package.json`

```json
{
  "name": "example-axum-app",
  "version": "1.0.0",
  "description": "An example Axum app using the axum-napi-bridge.",
  "main": "index.js",
  "scripts": {
    "build": "napi build --release",
    "test": "node index.js"
  },
  "dependencies": {
    "@napi-rs/cli": "^3.0.0"
  }
}
```

### `index.js`
```javascript
const { handleRequest } = require('./index.node');

async function main() {
  // Test the root route
  let response = await handleRequest('GET', '/', null, null);
  let parsed = JSON.parse(response);
  console.log('Response from /:', parsed);
  if (parsed.status !== 200 || parsed.body !== 'Hello from the example app!') {
    throw new Error('Test failed for /');
  }

  // Test the /test route
  response = await handleRequest('GET', '/test', null, null);
  parsed = JSON.parse(response);
  console.log('Response from /test:', parsed);
  if (parsed.status !== 200 || parsed.body !== 'This is a test route.') {
    throw new Error('Test failed for /test');
  }

  console.log('All tests passed!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
```