import io
from axum_wsgi import AxumWsgi

app = AxumWsgi()

def start_response(status, headers, exc_info=None):
    print("status:", status)
    print("headers:", headers)

environ = {
    "REQUEST_METHOD": "POST",
    "PATH_INFO": "/",
    "QUERY_STRING": "foo=bar",
    "CONTENT_TYPE": "text/plain",
    "CONTENT_LENGTH": "11",
    "HTTP_USER_AGENT": "curl/7.79",
    "wsgi.input": io.BytesIO(b"Hello world"),
}

response_iter = app(environ, start_response)

for chunk in response_iter:
    print("body:", chunk.decode())

