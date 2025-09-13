# Axum N-API Bridge

This library provides a macro to easily expose an [Axum](https://github.com/tokio-rs/axum) web server, written in Rust, to a Node.js application using [NAPI-rs](https://napi.rs/).

This allows you to write high-performance, memory-safe web services in Rust and seamlessly integrate them into a Node.js environment.

## ✅ Production-Ready with Phusion Passenger

**axum_napi_bridge** is fully tested and compatible with **Phusion Passenger**, the industry-standard application server for production Node.js deployments. The library supports both:

- **Nginx + Passenger** - High-performance reverse proxy with automatic process management
- **Apache + Passenger** - Full-featured web server with enterprise-grade features

All Passenger configurations are thoroughly tested in our CI/CD pipeline using Docker containers to ensure production reliability.

## How it Works

The library provides a macro, `napi_axum_bridge!`, which generates the necessary N-API boilerplate to bridge your Axum `Router` to Node.js. It creates an exported function `handle_request` that can be called from JavaScript with request details.

## Getting Started

### Prerequisites

- [Rust](https://www.rust-lang.org/tools/install)
- [Node.js](https://nodejs.org/)
- `@napi-rs/cli`

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
    axum = "0.8.4"
    tokio = { version = "1", features = ["full"] }

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

    In your `src/lib.rs` (or another source file like `src/bridge.rs`), define a function that returns your Axum `Router`, and then pass it to the `napi_axum_bridge!` macro.

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
build = "build.rs"

[lib]
crate-type = ["cdylib"]
path = "src/bridge.rs"

[dependencies]
axum = "0.8.4"
tokio = { version = "1", features = ["full"] }
axum_napi_bridge = "0.1.0"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
napi = { version = "3.0.0", features = ["tokio_rt", "serde-json"] }
napi-derive = "3.0.0"

[build-dependencies]
napi-build = "2"
```

### `src/bridge.rs`

```rust
use axum::routing::get;
use axum_napi_bridge::napi_axum_bridge;
use std::time::Duration;
use tokio::time::sleep;

fn my_app() -> axum::Router {
    axum::Router::new()
        .route("/", get(|| async { "Hello from the example app!" }))
        .route("/test", get(|| async { "This is a test route." }).post(|| async { "POST response from test route." }))
        .route("/concurrent-test", get(|| async {
            sleep(Duration::from_millis(50)).await;
            "Concurrent test route."
        }))
}

napi_axum_bridge!(my_app);
```

### `build.rs`

```rust
extern crate napi_build;

fn main() {
    napi_build::setup();
}
```

### `package.json`

```json
{
  "name": "example-axum-app",
  "version": "1.0.0",
  "description": "An example Axum app using the axum-napi-bridge.",
  "main": "index.js",
  "type": "module",
  "scripts": {
    "build": "napi build --release",
    "test": "playwright test tests/bridge.spec.ts",
    "test:e2e": "playwright test tests/example.spec.mjs",
    "test:passenger": "playwright test --config=playwright.passenger.config.mjs",
    "test:passenger:apache": "playwright test --config=playwright.apache.config.mjs",
    "bench": "npx tsc benchmark/bridge_bench.ts --outDir benchmark --target es2022 --module es2022 --esModuleInterop --skipLibCheck --moduleResolution node && node benchmark/bridge_bench.js"
  },
  "dependencies": {
    "@napi-rs/cli": "^3.1.5"
  },
  "devDependencies": {
    "@playwright/test": "^1.55.0",
    "tinybench": "^2.4.0",
    "typescript": "^5.2.2"
  }
}
```

### `tests/bridge.spec.ts`

```typescript
import { test, expect } from '@playwright/test'
import { handleRequest } from '../index.js'

test('GET /', async () => {
  const response = await handleRequest('GET', '/', null, null)
  const parsed = JSON.parse(response)
  expect(parsed.status).toBe(200)
  expect(parsed.body).toBe('Hello from the example app!')
})

test('GET /test', async () => {
  const response = await handleRequest('GET', '/test', null, null)
  const parsed = JSON.parse(response)
  expect(parsed.status).toBe(200)
  expect(parsed.body).toBe('This is a test route.')
})

test('POST /test', async () => {
  const response = await handleRequest('POST', '/test', null, null)
  const parsed = JSON.parse(response)
  expect(parsed.status).toBe(200)
  expect(parsed.body).toBe('POST response from test route.')
})
```

### `server.ts` (Optional HTTP Server)

```typescript
import { handleRequest } from './index.js'
import { createServer } from 'http'

const server = createServer(async (req, res) => {
  try {
    const body = await new Promise<string | null>((resolve) => {
      let data = ''
      req.on('data', (chunk) => (data += chunk))
      req.on('end', () => resolve(data || null))
    })

    const result = await handleRequest(req.method!, req.url!, req.headers, body)
    const response = JSON.parse(result)

    res.writeHead(response.status, response.headers)
    res.end(response.body)
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain' })
    res.end('Internal Server Error')
  }
})

server.listen(process.env.PORT || 3000)
console.log(`Server listening on port ${process.env.PORT || 3000}`)
```

## Development

### Pre-commit Hook

To ensure code quality and prevent issues, install the pre-commit hook that runs all tests before commits:

```bash
npm run install-hook
```

The hook automatically runs:

- Main library tests
- Sample app tests
- Performance benchmarks
- Phusion Passenger deployment tests (Nginx + Apache)

All tests must pass before commits are allowed.

### Development Commands

```bash
# Install pre-commit hook
npm run install-hook

# Build the library
npm run build

# Run tests
npm test

# Format code
npm run format

# Lint code
npm run lint

# Run benchmarks
npm run bench
```

## Production Deployment with Phusion Passenger

### Nginx + Passenger

The bridge is fully compatible with Nginx + Passenger for high-performance production deployments:

```typescript
// server.ts
import { handleRequest } from './index.js'
import { createServer } from 'http'

const server = createServer(async (req, res) => {
  try {
    const body = await new Promise<string | null>((resolve) => {
      let data = ''
      req.on('data', (chunk) => (data += chunk))
      req.on('end', () => resolve(data || null))
    })

    const result = await handleRequest(req.method!, req.url!, req.headers, body)
    const response = JSON.parse(result)

    res.writeHead(response.status, response.headers)
    res.end(response.body)
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain' })
    res.end('Internal Server Error')
  }
})

server.listen(process.env.PORT || 3000)
console.log(`Server listening on port ${process.env.PORT || 3000}`)
```

### Apache + Passenger

The bridge also works seamlessly with Apache + Passenger for enterprise environments requiring advanced web server features.

### Docker Deployment

Pre-built Docker configurations are available in the repository:

- `Dockerfile.passenger` - Nginx + Passenger setup
- `Dockerfile.apache` - Apache + Passenger setup

Both configurations use official Phusion Passenger base images and are tested in CI/CD.

```

```
