import { test, expect } from '@playwright/test'
import { spawn, type ChildProcess } from 'child_process'
import fetch from 'node-fetch'

// Override the webServer config for this test file
test.use({ 
  baseURL: undefined,
})

const HOST = '127.0.0.1'
const PORT = 8090 // Different port for Apache to avoid conflicts
const SERVER_ADDRESS = `http://${HOST}:${PORT}`

let dockerProcess: ChildProcess | null = null
let containerId: string | null = null

test.beforeAll(async () => {
  // Build the Docker image
  const buildProcess = spawn('docker', ['build', '-f', 'Dockerfile.apache', '-t', 'axum-napi-apache', '.'], {
    cwd: process.cwd(),
    stdio: 'inherit'
  })
  
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      buildProcess.kill()
      reject(new Error('Docker build timed out after 3 minutes'))
    }, 180000) // 3 minutes for Apache build
    
    buildProcess.on('close', (code) => {
      clearTimeout(timeout)
      if (code === 0) resolve(code)
      else reject(new Error(`Docker build failed with code ${code}`))
    })
  })

  // Start the Docker container
  dockerProcess = spawn('docker', ['run', '-p', `${PORT}:80`, '--rm', 'axum-napi-apache'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe']
  })

  // Get container ID for cleanup
  const psProcess = spawn('docker', ['ps', '-q', '--filter', 'ancestor=axum-napi-apache'], {
    stdio: 'pipe'
  })
  
  psProcess.stdout.on('data', (data) => {
    containerId = data.toString().trim()
  })

  // Wait for the server to start
  let attempts = 0
  const maxAttempts = 60 // Give more time for Apache container to start
  
  while (attempts < maxAttempts) {
    try {
      const response = await fetch(`${SERVER_ADDRESS}/`, { timeout: 2000 })
      if (response.status === 200) {
        break
      }
    } catch (error) {
      // Server not ready yet
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000))
    attempts++
    
    if (attempts === maxAttempts) {
      throw new Error('Docker Apache Passenger server failed to start in time')
    }
  }
})

test.afterAll(async () => {
  // Stop the Docker container
  if (containerId) {
    spawn('docker', ['stop', containerId], { stdio: 'inherit' })
  }
  
  if (dockerProcess) {
    dockerProcess.kill()
    // Wait a bit for graceful shutdown
    await new Promise(resolve => setTimeout(resolve, 3000))
  }
})

test('should get successful response from root route through Apache Passenger', async () => {
  const response = await fetch(`${SERVER_ADDRESS}/`)
  expect(response.status).toBe(200)
  const text = await response.text()
  expect(text).toBe('Hello from the example app!')
})

test('should get successful response from test route through Apache Passenger', async () => {
  const response = await fetch(`${SERVER_ADDRESS}/test`)
  expect(response.status).toBe(200)
  const text = await response.text()
  expect(text).toBe('This is a test route.')
})

test('should handle POST requests through Apache Passenger', async () => {
  const response = await fetch(`${SERVER_ADDRESS}/test`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ test: 'data' })
  })
  expect(response.status).toBe(200)
})

test('should return 404 for non-existent route through Apache Passenger', async () => {
  const response = await fetch(`${SERVER_ADDRESS}/nonexistent`)
  expect(response.status).toBe(404)
})

test('should handle concurrent requests through Apache Passenger', async () => {
  const promises = []
  for (let i = 0; i < 5; i++) {
    promises.push(fetch(`${SERVER_ADDRESS}/`))
  }
  
  const responses = await Promise.all(promises)
  
  for (const response of responses) {
    expect(response.status).toBe(200)
    const text = await response.text()
    expect(text).toBe('Hello from the example app!')
  }
})

test('should preserve request headers through Apache Passenger', async () => {
  const response = await fetch(`${SERVER_ADDRESS}/`, {
    headers: {
      'X-Custom-Header': 'test-value',
      'User-Agent': 'Apache-Test-Client'
    }
  })
  expect(response.status).toBe(200)
})