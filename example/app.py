from example_axum_app import AxumWsgi

# The WSGI application object. Gunicorn will look for this variable.
app = AxumWsgi()
