// ESM wrapper for the CommonJS NAPI module
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const nativeBinding = require('./index.cjs')

export const { handleRequest } = nativeBinding
