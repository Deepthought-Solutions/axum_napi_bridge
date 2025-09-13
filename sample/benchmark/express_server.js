import express from 'express'
const app = express()
app.get('/', (req, res) => {
  res.json({
    status: 200,
    headers: { 'content-type': 'application/json' },
    body: 'Hello from the example app!',
  })
})
app.get('/test', (req, res) => {
  res.json({
    status: 200,
    headers: { 'content-type': 'application/json' },
    body: 'This is a test route.',
  })
})
app.get('/concurrent-test', (req, res) => {
  setTimeout(() => {
    res.json({
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: 'Concurrent test route.',
    })
  }, 50)
})
// Export for benchmarking use
function handleExpressRequest(method, path) {
  return new Promise((resolve) => {
    let response
    if (method === 'GET' && path === '/') {
      response = {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: 'Hello from the example app!',
      }
    } else if (method === 'GET' && path === '/test') {
      response = {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: 'This is a test route.',
      }
    } else if (method === 'GET' && path === '/concurrent-test') {
      setTimeout(() => {
        resolve(
          JSON.stringify({
            status: 200,
            headers: { 'content-type': 'application/json' },
            body: 'Concurrent test route.',
          }),
        )
      }, 50)
      return
    } else {
      response = {
        status: 404,
        headers: { 'content-type': 'application/json' },
        body: 'Not Found',
      }
    }
    resolve(JSON.stringify(response))
  })
}
export { app, handleExpressRequest }
