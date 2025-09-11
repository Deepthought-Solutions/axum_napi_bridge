import { test, expect } from '@playwright/test'
import { handleRequest } from '../index.js'

test('should get a successful response from the root route', async () => {
  const response = await handleRequest('GET', '/', null, null)
  const parsedResponse = JSON.parse(response)
  expect(parsedResponse.status).toBe(200)
  expect(parsedResponse.body).toBe('Hello from the example app!')
})

test('should get a successful response from the /test route', async () => {
  const response = await handleRequest('GET', '/test', null, null)
  const parsedResponse = JSON.parse(response)
  expect(parsedResponse.status).toBe(200)
  expect(parsedResponse.body).toBe('This is a test route.')
})
