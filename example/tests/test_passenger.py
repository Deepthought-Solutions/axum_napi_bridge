import pytest
import requests
import subprocess
import time
import os

# Define the host and port. Use a different port than test_server.py
# to avoid potential conflicts.
HOST = "127.0.0.1"
PORT = 8101
SERVER_ADDRESS = f"http://{HOST}:{PORT}"

@pytest.fixture(scope="module")
def passenger_server():
    """
    Fixture to run a gunicorn server with the Passenger-compatible
    `passenger_wsgi:application` entry point.
    """

    # Command to run gunicorn. We point it to the passenger_wsgi.py file.
    command = [
        "gunicorn",
        "passenger_wsgi:application",
        "--bind", f"{HOST}:{PORT}",
        "--workers", "1",
    ]

    # Start gunicorn as a subprocess.
    # We need to run it from the `example` directory so it can find the `passenger_wsgi` module.
    process = subprocess.Popen(command, cwd="example")

    # Give the server a moment to start and check if it's running.
    retries = 5
    while retries > 0:
        time.sleep(1)
        try:
            response = requests.get(SERVER_ADDRESS, timeout=1)
            # Check if the server is responding with a valid status code
            if response.status_code == 200:
                break
        except (requests.exceptions.ConnectionError, requests.exceptions.ReadTimeout):
            retries -= 1
            if retries == 0:
                # Cleanup process before failing
                process.terminate()
                process.wait()
                pytest.fail("Gunicorn server (for Passenger test) failed to start in time.")

    # Check if the process exited prematurely
    if process.poll() is not None:
        pytest.fail(f"Gunicorn server process (for Passenger test) exited unexpectedly with code {process.poll()}.")

    yield SERVER_ADDRESS

    # Teardown: terminate the server
    process.terminate()
    process.wait(timeout=5)


def test_passenger_hello_world(passenger_server):
    """
    Test that the server, when run in a Passenger-like configuration,
    returns the expected 'Hello' message.
    """
    url = f"{passenger_server}/"
    response = requests.get(url, timeout=5)
    assert response.status_code == 200
    assert response.text == "Hello from your Axum app!"

def test_passenger_foo_route(passenger_server):
    """Test that the /foo route works in the Passenger-like configuration."""
    url = f"{passenger_server}/foo"
    response = requests.get(url, timeout=5)
    assert response.status_code == 200
    assert response.text == "Hello from /foo"
