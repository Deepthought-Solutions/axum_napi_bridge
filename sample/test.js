const { handleRequest } = require('./index.node');

async function main() {
  // Test the root route
  let response = await handleRequest('GET', '/', null, null);
  let parsed = JSON.parse(response);
  console.log('Response from /:', parsed);
  if (parsed.status !== 200 || parsed.body !== 'Hello from the example app!') {
    throw new Error('Test failed for /');
  }

  // Test the /test route
  response = await handleRequest('GET', '/test', null, null);
  parsed = JSON.parse(response);
  console.log('Response from /test:', parsed);
  if (parsed.status !== 200 || parsed.body !== 'This is a test route.') {
    throw new Error('Test failed for /test');
  }

  console.log('All tests passed!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
