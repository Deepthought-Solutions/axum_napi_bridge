from wsgiref.simple_server import make_server
# The name of the library is defined in `example/Cargo.toml`
from example_axum_app import AxumWsgi

# Create the WSGI app
app = AxumWsgi()

# Create a simple WSGI server
httpd = make_server('127.0.0.1', 8000, app)
print("Serving on http://127.0.0.1:8000")
httpd.serve_forever()
