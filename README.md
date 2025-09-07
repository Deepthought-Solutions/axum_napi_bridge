# Axum-WSGI

This library provides a facility to take an existing `axum` app and expose it as a WSGI application, callable from Python. This allows you to write high-performance web backends in Rust with `axum` and serve them using standard Python WSGI servers.

## How it works

The library provides a Rust macro, `axum_wsgi!`, which you can use in your Rust code to generate the necessary boilerplate to expose your `axum::Router` as a Python module. You build your Rust code as a standard Python extension module (`.so` file on Linux, `.pyd` on Windows). A Python WSGI server can then import and run this module.

## Usage

Here's how to wrap your own `axum` application.

### 1. Create a new Rust library project

Your project should be a library that produces a `cdylib` (a C-style dynamic library that Python can load).

```bash
cargo new --lib my_axum_app
cd my_axum_app
```

### 2. Configure `Cargo.toml`

You need to add `axum_wsgi`, `pyo3`, `axum`, and `tokio`. You also need to configure your library to be a `cdylib`.

```toml
[package]
name = "my_axum_app"
version = "0.1.0"
edition = "2021"

[lib]
name = "my_axum_app"
crate-type = ["cdylib"]

[dependencies]
axum_wsgi = { git = "https://github.com/your-repo/axum-wsgi.git" } # Or use a path dependency
pyo3 = { version = "0.18", features = ["extension-module"] }
axum = "0.7"
tokio = { version = "1", features = ["macros", "rt-multi-thread"] }
```
*Note: When you publish your crate, you would use a version number for `axum_wsgi`.*

### 3. Write your `axum` app and wrap it

In your `src/lib.rs`, define a function that returns your `axum::Router`. Then, call the `axum_wsgi!` macro with the path to your function.

```rust
// src/lib.rs
use axum_wsgi::{axum, axum_wsgi};
use axum::{routing::get, Router};

// Your function that creates and returns the Axum Router
fn my_app() -> Router {
    Router::new()
        .route("/", get(|| async { "Hello, World!" }))
        .route("/api/rust", get(|| async { "This is the Rust API." }))
}

// Use the macro to generate the Python module
axum_wsgi!(my_app);
```

### 4. Build the Python extension

We recommend using [`maturin`](https://www.maturin.rs/) to build and manage your Rust-based Python packages.

```bash
# It's a good practice to use a virtual environment
python -m venv .venv
source .venv/bin/activate

# Install maturin
pip install maturin

# Build the wheel and install it in the current venv
maturin develop
```

### 5. Run with a Python WSGI server

Create a Python file (e.g., `server.py`) to run your app.

```python
# server.py
from wsgiref.simple_server import make_server
# The name here corresponds to the `name` in your [lib] section of Cargo.toml
from my_axum_app import AxumWsgi

# Create an instance of the WSGI app
app = AxumWsgi()

# Run the server
with make_server('127.0.0.1', 8000, app) as httpd:
    print("Serving on http://127.0.0.1:8000...")
    httpd.serve_forever()
```

Now run the server:
```bash
python server.py
```
You can now access your `axum` app at `http://127.0.0.1:8000/` and `http://127.0.0.1:8000/api/rust`.

## Building the Example

This repository contains a working example in the `example/` directory.

To build and run it:
```bash
# Navigate to the example directory
cd example

# Create a virtual environment
python -m venv .venv
source .venv/bin/activate

# Install maturin
pip install maturin

# Build and install the example app
maturin develop

# Run the python server
python app.py
```
The server will be running on `http://127.0.0.1:8000`.
