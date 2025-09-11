const express = require('express')

const app = express()

app.get('/', (req, res) => {
  res.json({
    status: 200,
    headers: { 'content-type': 'application/json' },
    body: 'Hello from the example app!'
  })
})

app.get('/test', (req, res) => {
  res.json({
    status: 200,
    headers: { 'content-type': 'application/json' },
    body: 'This is a test route.'
  })
})

app.get('/concurrent-test', (req, res) => {
  setTimeout(() => {
    res.json({
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: 'Concurrent test route.'
    })
  }, 50)
})

// Export for benchmarking use
function handleExpressRequest(method, path) {
  return new Promise((resolve) => {
    if (method === 'GET' && path === '/') {
      resolve(JSON.stringify({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: 'Hello from the example app!'
      }))
    } else if (method === 'GET' && path === '/test') {
      resolve(JSON.stringify({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: 'This is a test route.'
      }))
    } else if (method === 'GET' && path === '/concurrent-test') {
      setTimeout(() => {
        resolve(JSON.stringify({
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: 'Concurrent test route.'
        }))
      }, 50)
    } else {
      resolve(JSON.stringify({
        status: 404,
        headers: { 'content-type': 'application/json' },
        body: 'Not Found'
      }))
    }
  })
}

module.exports = { app, handleExpressRequest }