import { test, expect } from '@playwright/test'

// Override the webServer config for this test file
test.use({ 
  baseURL: undefined,
})
import { spawn, type ChildProcess } from 'child_process'
import fetch from 'node-fetch'

const HOST = '127.0.0.1'
const PORT = 8080 // Docker container port
const SERVER_ADDRESS = `http://${HOST}:${PORT}`

let dockerProcess: ChildProcess | null = null
let containerId: string | null = null

test.beforeAll(async () => {
  console.log('Starting Docker build for Passenger test...')
  
  // Build the Docker image
  const buildProcess = spawn('docker', ['build', '-f', 'Dockerfile.passenger', '-t', 'axum-napi-passenger', '.'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe']
  })
  
  // Capture output for debugging
  let buildOutput = ''
  buildProcess.stdout?.on('data', (data) => {
    buildOutput += data.toString()
  })
  buildProcess.stderr?.on('data', (data) => {
    buildOutput += data.toString()
  })
  
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      buildProcess.kill()
      reject(new Error('Docker build timed out after 8 minutes'))
    }, 480000)
    
    buildProcess.on('close', (code) => {
      clearTimeout(timeout)
      if (code === 0) {
        console.log('Docker build completed successfully')
        resolve(code)
      } else {
        console.error('Docker build output:', buildOutput)
        reject(new Error(`Docker build failed with code ${code}. Output: ${buildOutput.slice(-500)}`))
      }
    })
  })

  console.log('Starting Docker container...')
  // Start the Docker container
  dockerProcess = spawn('docker', ['run', '-p', `${PORT}:80`, '--rm', 'axum-napi-passenger'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe']
  })
  
  // Log container output for debugging
  dockerProcess.stdout?.on('data', (data) => {
    console.log('Container stdout:', data.toString())
  })
  dockerProcess.stderr?.on('data', (data) => {
    console.error('Container stderr:', data.toString())
  })

  // Get container ID for cleanup
  const psProcess = spawn('docker', ['ps', '-q', '--filter', 'ancestor=axum-napi-passenger'], {
    stdio: 'pipe'
  })
  
  psProcess.stdout.on('data', (data) => {
    containerId = data.toString().trim()
  })

  // Wait for the server to start
  let attempts = 0
  const maxAttempts = 60 // Give more time for Docker container to start
  
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
      throw new Error('Docker Passenger server failed to start in time')
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

test('should get successful response from root route through Passenger', async () => {
  const response = await fetch(`${SERVER_ADDRESS}/`)
  expect(response.status).toBe(200)
  const text = await response.text()
  expect(text).toBe('Hello from the example app!')
})

test('should get successful response from test route through Passenger', async () => {
  const response = await fetch(`${SERVER_ADDRESS}/test`)
  expect(response.status).toBe(200)
  const text = await response.text()
  expect(text).toBe('This is a test route.')
})

test('should handle POST requests through Passenger', async () => {
  const response = await fetch(`${SERVER_ADDRESS}/test`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ test: 'data' })
  })
  expect(response.status).toBe(200)
})

test('should return 404 for non-existent route through Passenger', async () => {
  const response = await fetch(`${SERVER_ADDRESS}/nonexistent`)
  expect(response.status).toBe(404)
})