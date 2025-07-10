#!/usr/bin/env tsx

import { generateQRCode, encodeData, decodeData } from '../src/utils/qr-code'
import { writeFileSync } from 'fs'
import { join } from 'path'

async function demoQRCode() {
  console.log('🔍 QR Code Demo')
  console.log('==============\n')

  // Example 1: Simple text
  console.log('1. Generating QR code for "Hello World"...')
  const simpleQR = await generateQRCode('Hello World')
  console.log('✅ QR Code generated (SVG data URI)')
  console.log('   Length:', simpleQR.length, 'characters')
  console.log('   Starts with:', simpleQR.substring(0, 50) + '...')
  
  // Save to file for viewing
  const svgContent = Buffer.from(simpleQR.split(',')[1], 'base64').toString()
  writeFileSync(join(process.cwd(), 'test-results', 'hello-world.svg'), svgContent)
  console.log('   📁 Saved as: test-results/hello-world.svg\n')

  // Example 2: Complex JSON data
  console.log('2. Generating QR code for complex data...')
  const complexData = {
    type: 'credential-exchange',
    version: '1.0',
    data: {
      credentialId: 'urn:uuid:12345678-1234-1234-1234-123456789abc',
      issuer: 'did:example:issuer',
      subject: 'did:example:subject',
      timestamp: new Date().toISOString()
    }
  }
  
  const complexQR = await generateQRCode(complexData, { compress: true })
  const svgContent2 = Buffer.from(complexQR.split(',')[1], 'base64').toString()
  writeFileSync(join(process.cwd(), 'test-results', 'complex-data.svg'), svgContent2)
  console.log('✅ Complex QR Code generated')
  console.log('   📁 Saved as: test-results/complex-data.svg\n')

  // Example 3: Test encode/decode
  console.log('3. Testing encode/decode round-trip...')
  const original = { message: 'Test message', number: 42, array: [1, 2, 3] }
  const encoded = encodeData(original, { compress: true })
  const decodedStr = decodeData(encoded, { compressed: true })
  const decoded = JSON.parse(decodedStr)
  
  console.log('   Original:', original)
  console.log('   Encoded length:', encoded.length, 'characters')
  console.log('   Decoded matches:', JSON.stringify(original) === JSON.stringify(decoded))
  console.log('   ✅ Round-trip successful!\n')

  // Example 4: Show compression benefits
  console.log('4. Compression comparison...')
  const largeData = {
    credential: {
      id: 'urn:uuid:large-credential',
      type: ['VerifiableCredential', 'TestCredential'],
      issuer: 'did:example:large-issuer',
      validFrom: new Date().toISOString(),
      credentialSubject: {
        id: 'did:example:large-subject',
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1-555-123-4567',
        address: {
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zip: '12345',
          country: 'USA'
        },
        preferences: {
          theme: 'dark',
          language: 'en',
          notifications: true,
          privacy: 'high'
        }
      }
    }
  }

  const uncompressed = encodeData(largeData, { compress: false })
  const compressed = encodeData(largeData, { compress: true })
  
  console.log('   Uncompressed size:', uncompressed.length, 'characters')
  console.log('   Compressed size:', compressed.length, 'characters')
  console.log('   Compression ratio:', ((1 - compressed.length / uncompressed.length) * 100).toFixed(1) + '%')
  console.log('   ✅ Compression working!\n')

  console.log('🎉 Demo complete!')
  console.log('📁 Check the generated SVG files in test-results/')
  console.log('   - hello-world.svg (simple text)')
  console.log('   - complex-data.svg (JSON data)')
  console.log('\n💡 You can open these SVG files in any web browser to see the QR codes!')
}

// Run the demo
demoQRCode().catch(console.error) 