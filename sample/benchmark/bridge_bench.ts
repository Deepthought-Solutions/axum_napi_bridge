import { Bench } from 'tinybench'
import { handleRequest } from '../index.js'

const b = new Bench()

b.add('Native GET /', async () => {
  await handleRequest('GET', '/', null, null)
})

await b.run()

console.table(b.table())
