import test from 'ava'
import { handleRequest } from '../index.node'

test('should get a successful response from the root route', async (t) => {
  const response = await handleRequest('GET', '/', null, null)
  const parsedResponse = JSON.parse(response)
  t.is(parsedResponse.status, 200)
  t.is(parsedResponse.body, 'Hello from the example app!')
})

test('should get a successful response from the /test route', async (t) => {
  const response = await handleRequest('GET', '/test', null, null)
  const parsedResponse = JSON.parse(response)
  t.is(parsedResponse.status, 200)
  t.is(parsedResponse.body, 'This is a test route.')
})
