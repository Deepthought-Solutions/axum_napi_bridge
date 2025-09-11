import { spawn } from 'child_process'
import fetch from 'node-fetch'

async function run() {
  console.log('Starting server...')
  const server = spawn('npx', ['tsx', 'server.ts'], { detached: true })

  // Wait for the server to start
  await new Promise((resolve) => setTimeout(resolve, 2000))

  const numRequests = 100
  const requests = []

  console.log(`Sending ${numRequests} concurrent requests...`)
  const startTime = Date.now()

  for (let i = 0; i < numRequests; i++) {
    requests.push(fetch('http://127.0.0.1:3001/concurrent-test'))
  }

  try {
    const responses = await Promise.all(requests)
    const allOk = responses.every((res) => res.ok)
    if (!allOk) {
      throw new Error('Some requests failed')
    }

    const duration = Date.now() - startTime
    console.log(`All requests completed in ${duration}ms.`)

    if (duration < 4000) {
      console.log('✅ Concurrent execution verified.')
    } else {
      console.error('❌ Concurrent execution could not be verified.')
      process.exitCode = 1
    }
  } catch (error) {
    console.error('Benchmark failed:', error)
    process.exitCode = 1
  } finally {
    console.log('Stopping server...')
    process.kill(-server.pid)
  }
}

run()
