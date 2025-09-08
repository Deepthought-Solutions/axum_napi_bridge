#!/bin/bash
set -e

echo "Starting entrypoint script..."

# 1. Start Apache/Passenger in the background
echo "Starting Apache with Phusion Passenger..."
# The default passenger container expects to be started via my_init.
# We will start the services via runit, which is what my_init does.
/etc/init.d/apache2 start

# 2. Wait for the server to be up.
echo "Waiting for server to start..."
timeout 30s bash -c 'until curl -sSf http://localhost/ > /dev/null; do echo "..."; sleep 1; done'
echo "Server started."

# 3. Run the curl test and check the output
echo "Running test..."
if curl -s http://localhost/ | grep -q "Hello from your Axum app!"; then
  echo "Test PASSED: Found expected string in response."
  RESULT=0
else
  echo "Test FAILED: Did not find expected string in response."
  echo "--- Apache Error Log ---"
  cat /var/log/apache2/error.log
  echo "------------------------"
  RESULT=1
fi

# 4. Stop Apache/Passenger
echo "Stopping Apache..."
/etc/init.d/apache2 stop

echo "Entrypoint script finished."
exit $RESULT
