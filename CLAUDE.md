# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **axum_napi_bridge**, a Rust library that bridges Axum web servers to Node.js using NAPI-rs. The project provides a macro `napi_axum_bridge!` that generates the necessary N-API boilerplate to expose Axum routers as Node.js native modules, enabling high-performance Rust web services to be called from JavaScript.

## Architecture

### Core Components

- **`src/lib.rs`**: Contains the main `napi_axum_bridge!` macro that generates bridge code between Axum and Node.js
- **`sample/`**: Working example implementation showing how to use the bridge in practice
- **Workspace structure**: The project uses a Cargo workspace with the main library and sample app as separate members

### Key Dependencies

- **Axum 0.8.4**: Web framework for the Rust side
- **NAPI-rs 3.0**: Node.js addon framework for Rust
- **Tokio**: Async runtime (full features enabled)
- **Hyper/Tower**: HTTP and middleware stack
- **Serde**: JSON serialization between Rust and JavaScript

## Development Commands

### Root Project Commands

```bash
# Build the library (release mode)
npm run build

# Build debug version  
npm run build:debug

# Run tests
npm test

# Format code
npm run format

# Lint code
npm run lint

# Run benchmarks
npm run bench

# Install pre-commit hook
npm run install-hook
```

### Sample App Commands

```bash
cd sample

# Build the sample app
npm run build

# Run tests on the bridge
npm test

# Run end-to-end tests
npm run test:e2e

# Run performance benchmarks
npm run bench
npm run bench:concurrent

# Start the HTTP server
node server.js
```

## Development Workflow

### Pre-commit Hook

The pre-commit hook automatically runs a comprehensive test suite before allowing commits. To install the hook:

```bash
npm run install-hook
```

The hook is versioned in `scripts/pre-commit-hook.sh` and includes:

1. **Main library tests**: Runs `npm test` in the root directory
2. **Sample app tests**: Runs `npm test` in the sample directory
3. **Sample app benchmarks**: Runs `npm run bench` in the sample directory to ensure performance integrity
4. **Passenger Nginx tests**: Runs `npm run test:passenger` to verify Nginx + Passenger deployment
5. **Passenger Apache tests**: Runs `npm run test:passenger:apache` to verify Apache + Passenger deployment

The hook uses colored output for better visibility and proper error handling with `set -e`. All tests must pass before commits are allowed.

### Building and Testing

1. **Build the main library**: Run `npm run build` in the root directory
2. **Test with sample app**: 
   ```bash
   cd sample
   npm install
   npm run build
   npm test
   ```

### Sample App Structure

The sample app demonstrates the complete usage pattern:

- **`sample/src/bridge.rs`**: Defines the Axum router and applies the `napi_axum_bridge!` macro
- **`sample/server.js`**: HTTP server that uses the generated `.node` file
- **`sample/tests/bridge.spec.ts`**: Unit tests for the bridge functionality
- **`sample/benchmark/`**: Performance benchmarks for the bridge

### Testing Strategy

- **Unit tests**: Use `ava` framework to test the bridge directly via `handleRequest` function
- **Integration tests**: Use Playwright for end-to-end testing with the HTTP server
  - **CI Mode**: Run Playwright tests in headless mode without browser reports using `--headed=false --reporter=list`
  - Local development can use full browser features, but CI must run headless
  - **Note**: To test locally as Claude acting as CI, set environment variable `CI=true`
- **Passenger tests**: **CRITICAL REQUIREMENT** - Test deployment with Phusion Passenger (both Nginx and Apache variants) using Docker containers. These tests are mandatory and verify production deployment scenarios
- **Benchmarks**: Performance testing using `tinybench` for direct calls and concurrent request testing

### Phusion Passenger Testing

The library **must** be tested with Phusion Passenger as it's a primary deployment target:

- **`npm run test:passenger`**: Tests Nginx + Passenger deployment using `Dockerfile.passenger`
- **`npm run test:passenger:apache`**: Tests Apache + Passenger deployment using `Dockerfile.apache`
- Both tests use Docker containers to simulate production environments
- Passenger tests are included in CI/CD pipeline and cannot be removed or disabled

### Docker Image Constraints

When working with Docker images in this project:
- **Avoid Docker Hub (docker.io) images** when possible due to rate limiting and pull restrictions in CI/CD environments
- **Prefer alternative registries** that do not apply usage limitations:
  - GitHub Container Registry (ghcr.io) 
  - Quay.io (quay.io)
  - Other public registries without strict rate limits
- If Docker Hub images must be used, ensure they are cached or mirrored to avoid CI failures
- For Phusion Passenger images, use the most reliable registry available that provides the required tags

## Key Implementation Details

### The Bridge Macro

The `napi_axum_bridge!` macro in `src/lib.rs`:
- Takes a function that returns an `axum::Router`
- Generates a `handle_request` function that can be called from JavaScript
- Handles request/response serialization between Node.js and Rust
- Uses `OnceCell` for lazy router initialization
- Returns JSON-serialized responses with status, headers, and body

### Request/Response Flow

1. JavaScript calls `handleRequest(method, path, headers, body)`
2. Rust converts JS types to Axum HTTP types
3. Router processes the request asynchronously
4. Response is serialized back to JSON for JavaScript consumption

## Formatting and Linting

- **Prettier**: Used for JavaScript/TypeScript formatting (printWidth: 120, no semicolons)
- **oxlint**: Used for JavaScript/TypeScript linting
- **cargo fmt**: Used for Rust formatting (see `rustfmt.toml`)
- **taplo**: Used for TOML formatting

## Dependencies Management

When adding dependencies:
- Add to `Cargo.toml` workspace dependencies first
- Reference workspace versions in member crates
- Ensure compatibility between Axum, Hyper, and HTTP crates versions
- Use `cargo tree` to inspect dependency conflicts

## Branch Strategy

Follow the branch naming convention from `AGENTS.md`:
- `feature/` - New features
- `fix/` - Bug fixes  
- `docs/` - Documentation changes
- `chore/` - Maintenance tasks