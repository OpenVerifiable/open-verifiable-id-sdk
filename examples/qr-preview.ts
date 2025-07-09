#!/usr/bin/env tsx

import { decodeData } from '../src/utils/qr-code'

// The encoded data from our demo
const helloWorldEncoded = 'SGVsbG8gV29ybGQ=' // "Hello World" in base64
const complexDataEncoded = 'eJyrVspILFayMtRRKk5JLEqxsjLQ0VHKK8pJzVGyMjQw0FEqTsxLzSlWsqpVqgUAjq0J8Q==' // Compressed JSON

console.log('🔍 QR Code Content Preview')
console.log('==========================\n')

console.log('1. Simple QR Code Content:')
try {
  const decoded = decodeData(helloWorldEncoded, { compressed: false })
  console.log('   Decoded:', decoded)
} catch (error) {
  console.log('   Error decoding:', error.message)
}

console.log('\n2. Complex QR Code Content:')
try {
  const decoded = decodeData(complexDataEncoded, { compressed: true })
  const parsed = JSON.parse(decoded)
  console.log('   Decoded JSON:')
  console.log('   ', JSON.stringify(parsed, null, 2))
} catch (error) {
  console.log('   Error decoding:', error.message)
}

console.log('\n💡 These are the actual contents that would be revealed when scanning the QR codes!') 