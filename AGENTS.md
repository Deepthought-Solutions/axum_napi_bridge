To test this module, find and install PhusionPassenger :

```bash
cd example

python3 -m venv .venv
pip install -r requirements.txt
pip install --no-cache-dir maturin
maturin develop

passenger start --app-type wsgi --port 8080 --python /home/app/axum-wsgi/example/.venv/bin/python &

timeout 30s bash -c 'until curl -sSf http://localhost:8080/ > /dev/null; do echo "..."; sleep 1; done'

if curl -s http://localhost:8080/ | grep -q "Hello from your Axum app!"; then
  echo "Test PASSED: Found expected string in response."
  RESULT=0
else
  echo "Test FAILED: Did not find expected string in response."
  echo "--- Apache Error Log ---"
  cat /var/log/apache2/error.log
  echo "------------------------"
  RESULT=1
fi

```