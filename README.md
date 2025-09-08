# Axum NAPI Bridge

This project demonstrates how to bridge an [Axum](https://github.com/tokio-rs/axum) web server, written in Rust, to a Node.js application using [NAPI-rs](https://napi.rs/).

This allows you to write high-performance, memory-safe web services in Rust and seamlessly integrate them into a Node.js environment.

## How it Works

The Rust code in `src/lib.rs` creates an Axum `Router`. A single function, `handle_request`, is exposed to Node.js via NAPI-rs. This function takes HTTP request components (method, path, headers, body) as arguments, passes them to the Axum router, and returns the response as a JSON string.

The Node.js code in `index.js` can then call this native Rust function.

## Getting Started

### Prerequisites

-   [Rust](https://www.rust-lang.org/tools/install)
-   [Node.js](https://nodejs.org/)
-   `@napi-rs/cli`

### Build

1.  **Install the NAPI-rs CLI:**
    ```bash
    npm install -g @napi-rs/cli
    ```

2.  **Install project dependencies:**
    ```bash
    npm install
    ```

3.  **Build the native addon:**
    This command compiles the Rust code and links it into a native Node.js addon.
    ```bash
    napi build --release
    ```

### Run

After a successful build, you can run the example tests to see it in action:

```bash
npm test
```

This will execute the tests in `__test__/index.spec.ts`, which call the native Rust code.