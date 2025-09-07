import pytest
import requests
import subprocess
import time
import os

# Define the host and port
HOST = "127.0.0.1"
PORT = 8100
SERVER_ADDRESS = f"http://{HOST}:{PORT}"

@pytest.fixture(scope="module")
def server():
    """Fixture to run the gunicorn server in a background process."""

    # Command to run gunicorn. We run it from the parent directory (`example/`)
    # so that it can find the `app` module.
    command = [
        "gunicorn",
        "app:app",
        "--bind", f"{HOST}:{PORT}",
        "--workers", "1",
    ]

    # Start gunicorn as a subprocess.
    # We need to run it from the `example` directory so it can find the `app` module.
    process = subprocess.Popen(command, cwd="example")

    # Give the server a moment to start and check if it's running.
    # We'll try to connect a few times before failing.
    retries = 5
    while retries > 0:
        time.sleep(1)
        try:
            requests.get(SERVER_ADDRESS, timeout=1)
            # If we get here, the server is up
            break
        except (requests.exceptions.ConnectionError, requests.exceptions.ReadTimeout):
            retries -= 1
            if retries == 0:
                # Cleanup process before failing
                process.terminate()
                process.wait()
                pytest.fail("Gunicorn server failed to start in time.")

    # Check if the process exited prematurely
    if process.poll() is not None:
        pytest.fail(f"Gunicorn server process exited unexpectedly with code {process.poll()}.")

    yield SERVER_ADDRESS

    # Teardown: terminate the server
    process.terminate()
    process.wait(timeout=5)


def test_hello_world(server):
    """Test that the server returns 'Hello from your Axum app!'."""
    url = f"{server}/"
    response = requests.get(url, timeout=5)
    assert response.status_code == 200
    assert response.text == "Hello from your Axum app!"

def test_foo_route(server):
    """Test that the /foo route works."""
    url = f"{server}/foo"
    response = requests.get(url, timeout=5)
    assert response.status_code == 200
    assert response.text == "Hello from /foo"
