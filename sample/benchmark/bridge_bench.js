import { Bench } from 'tinybench'
import { handleRequest } from '../index.mjs'
import { handleExpressRequest } from './express_server.js'
import { handleKoaRequest } from './koa_server.js'
const b = new Bench()
b.add('Bridged GET /', async () => {
  await handleRequest('GET', '/', null, null)
})
b.add('Express GET /', async () => {
  await handleExpressRequest('GET', '/')
})
b.add('Koa GET /', async () => {
  await handleKoaRequest('GET', '/')
})
await b.run()
console.table(b.table())
