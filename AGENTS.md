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

4.  **Preferred testing method**

    Build and run the sample app using passenger :

    ```bash
    cd sample
    npm install
    napi build
    passenger start --app-type node --startup-file server.js &
    curl http://172.17.0.3:3000/test | grep "This is a test route."
    ```

## Development Notes

- **Dependency Management:** The project depends on `axum`, `hyper`, and `tokio`. Care must be taken to ensure that the versions of these crates are compatible. The `Cargo.toml` file has been configured with compatible versions. If you need to update a dependency, be sure to check for compatibility with the rest of the stack.
- **`http-body-util`:** This crate is used to handle request and response bodies. It provides the `BodyExt` trait, which is necessary for working with `axum` bodies.
- **Troubleshooting:** If you encounter build errors related to trait bounds or dependency conflicts (e.g., `http::HeaderName` vs `hyper::header::HeaderName`), it's likely due to incompatible versions of `axum`, `hyper`, or `http-body-util`. Use `cargo tree` to inspect the dependency graph and ensure that there is only one version of each of these crates.

## Branching Convention

To maintain a clean and organized git history, please adhere to the following branch naming convention:

**Format:** `[prefix]/[subject]`

- **`[prefix]`**: A short, descriptive keyword that indicates the type of change.
- **`[subject]`**: A concise summary of the change, written in kebab-case.

### Prefixes

- **`feature/`**: For new features (e.g., `feature/add-user-authentication`).
- **`fix/`**: For bug fixes (e.g., `fix/resolve-memory-leak`).
- **`docs/`**: For documentation changes (e.g., `docs/update-readme`).
- **`chore/`**: For routine maintenance, refactoring, or build-related tasks (e.g., `chore/configure-ci-pipeline`).

### Best Practices

- Keep branch names short and descriptive.
- Use dashes (`-`) to separate words in the subject.
- Reference issue numbers if applicable (e.g., `fix/issue-123-login-bug`).

## Performance Improvement Suggestions

The `axum_napi_bridge` provides a high-performance foundation by leveraging Rust's efficiency and Tokio's asynchronous runtime. To further enhance performance, consider the following strategies:

### Caching

- **Middleware:** Use `axum` middleware like `tower-http::catch_panic` or custom middleware to cache responses for frequently accessed routes. For more advanced caching, consider integrating a caching layer like Redis or Memcached.

### Connection Pooling

- **Handled by Hyper:** The underlying HTTP server, `hyper`, manages connection pooling automatically. For most use cases, the default configuration is sufficient. For high-throughput scenarios, you may need to tune the `hyper` server settings, which can be done when setting up the `axum` server.

### Task Scheduling

- **Tokio's Work-Stealing Scheduler:** Tokio's multithreaded, work-stealing scheduler is highly efficient for most asynchronous workloads. If you have specific tasks that are CPU-bound or blocking, consider using `tokio::task::spawn_blocking` to move them to a dedicated thread pool, preventing them from blocking the main async runtime.

### Memory Management

- **Custom Allocators:** While Rust's default allocator is generally performant, you can sometimes achieve better performance for specific allocation patterns by using a different global allocator, such as `jemallocator` or `mimalloc`. This can be particularly effective in highly concurrent applications.

### Monitoring

- **Prometheus:** Integrate the `axum-prometheus` crate to expose Prometheus metrics from your `axum` application. This allows you to monitor key performance indicators (KPIs) like request latency, throughput, and error rates, which is crucial for identifying performance bottlenecks in a production environment.
