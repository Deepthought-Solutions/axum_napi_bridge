import Koa from 'koa'

const app = new Koa()

interface ResponseBody {
  status: number
  headers: { 'content-type': string }
  body: string
}

app.use(async (ctx) => {
  if (ctx.method === 'GET') {
    if (ctx.path === '/') {
      ctx.body = {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: 'Hello from the example app!',
      }
    } else if (ctx.path === '/test') {
      ctx.body = {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: 'This is a test route.',
      }
    } else if (ctx.path === '/concurrent-test') {
      await new Promise((resolve) => setTimeout(resolve, 50))
      ctx.body = {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: 'Concurrent test route.',
      }
    } else {
      ctx.status = 404
      ctx.body = {
        status: 404,
        headers: { 'content-type': 'application/json' },
        body: 'Not Found',
      }
    }
  }
})

// Export for benchmarking use
async function handleKoaRequest(method: string, path: string): Promise<string> {
  let response: ResponseBody

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
    await new Promise((resolve) => setTimeout(resolve, 50))
    response = {
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: 'Concurrent test route.',
    }
  } else {
    response = {
      status: 404,
      headers: { 'content-type': 'application/json' },
      body: 'Not Found',
    }
  }

  return JSON.stringify(response)
}

export { app, handleKoaRequest }
