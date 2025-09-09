# Agent Instructions for axum_napi_bridge

This project bridges an Axum (Rust) web server to Node.js using NAPI-rs. It allows you to write a high-performance web server in Rust and call it from Node.js.

## Building the Project

The project uses a combination of Rust's Cargo and Node.js's npm.

1.  **Install NAPI-rs CLI:**
    The NAPI-rs CLI is required to build the project. Install it globally:
    ```bash
    npm install -g @napi-rs/cli
    ```

2.  **Install Node.js dependencies:**
    ```bash
    npm install
    ```

3.  **Build the Rust code:**
    The primary build command is:
    ```bash
    napi build --release
    ```
    This command compiles the Rust code into a `.node` file that can be loaded by Node.js.

4. **Preferred testing method**

    Build and run the sample app using passenger :
    ```bash
    cd sample
    npm install
    napi build
    passenger start --app-type node --startup-file server.js &
    curl http://172.17.0.3:3000/test | grep "This is a test route."
    ```

## Development Notes

-   **Dependency Management:** The project depends on `axum`, `hyper`, and `tokio`. Care must be taken to ensure that the versions of these crates are compatible. The `Cargo.toml` file has been configured with compatible versions. If you need to update a dependency, be sure to check for compatibility with the rest of the stack.
-   **`http-body-util`:** This crate is used to handle request and response bodies. It provides the `BodyExt` trait, which is necessary for working with `axum` bodies.
-   **Troubleshooting:** If you encounter build errors related to trait bounds or dependency conflicts (e.g., `http::HeaderName` vs `hyper::header::HeaderName`), it's likely due to incompatible versions of `axum`, `hyper`, or `http-body-util`. Use `cargo tree` to inspect the dependency graph and ensure that there is only one version of each of these crates.
