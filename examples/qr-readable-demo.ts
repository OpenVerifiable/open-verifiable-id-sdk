#!/usr/bin/env tsx

import { generateQRCode, encodeData, decodeData } from '../src/utils/qr-code'
import { writeFileSync } from 'fs'
import { join } from 'path'

async function demoReadableQRCode() {
  console.log('🔍 Human-Readable QR Code Demo')
  console.log('==============================\n')

  // Example 1: Simple readable text (no encoding)
  const readableString = 'Hello World! This is a readable QR code.'
  console.log('1. Generating QR code for readable text...')
  console.log('   String being encoded:', JSON.stringify(readableString))
  const readableQR = await generateQRCode(readableString, { compress: false })
  const svgContent = Buffer.from(readableQR.split(',')[1], 'base64').toString()
  writeFileSync(join(process.cwd(), 'test-results', 'readable-text.svg'), svgContent)
  console.log('✅ Readable QR Code generated')
  console.log('   📁 Saved as: test-results/readable-text.svg')
  console.log('   📱 Scan this to see: "Hello World! This is a readable QR code."\n')

  // Example 2: URL QR code
  console.log('2. Generating QR code for a URL...')
  const urlQR = await generateQRCode('https://github.com/open-verifiable/open-verifiable-id-sdk', { compress: false })
  const urlSvgContent = Buffer.from(urlQR.split(',')[1], 'base64').toString()
  writeFileSync(join(process.cwd(), 'test-results', 'github-url.svg'), urlSvgContent)
  console.log('✅ URL QR Code generated')
  console.log('   📁 Saved as: test-results/github-url.svg')
  console.log('   📱 Scan this to open: https://github.com/open-verifiable/open-verifiable-id-sdk\n')

  // Example 3: Contact information (vCard format)
  console.log('3. Generating QR code for contact info...')
  const contactInfo = `BEGIN:VCARD
VERSION:3.0
FN:John Doe
ORG:Open Verifiable
TEL:+1-555-123-4567
EMAIL:john.doe@example.com
URL:https://openverifiable.org
END:VCARD`
  
  const contactQR = await generateQRCode(contactInfo, { compress: false })
  const contactSvgContent = Buffer.from(contactQR.split(',')[1], 'base64').toString()
  writeFileSync(join(process.cwd(), 'test-results', 'contact-info.svg'), contactSvgContent)
  console.log('✅ Contact QR Code generated')
  console.log('   📁 Saved as: test-results/contact-info.svg')
  console.log('   📱 Scan this to add contact: John Doe from Open Verifiable\n')

  // Example 4: WiFi network info
  console.log('4. Generating QR code for WiFi network...')
  const wifiInfo = `WIFI:S:MyWiFiNetwork;T:WPA;P:MyPassword123;;`
  
  const wifiQR = await generateQRCode(wifiInfo, { compress: false })
  const wifiSvgContent = Buffer.from(wifiQR.split(',')[1], 'base64').toString()
  writeFileSync(join(process.cwd(), 'test-results', 'wifi-network.svg'), wifiSvgContent)
  console.log('✅ WiFi QR Code generated')
  console.log('   📁 Saved as: test-results/wifi-network.svg')
  console.log('   📱 Scan this to connect to WiFi: MyWiFiNetwork\n')

  // Example 5: Plain JSON (no compression)
  console.log('5. Generating QR code for readable JSON...')
  const readableJSON = {
    message: "This is a readable JSON object",
    timestamp: new Date().toISOString(),
    author: "Open Verifiable SDK",
    version: "1.0.0",
    features: ["QR Code Generation", "Credential Management", "DID Support"]
  }
  
  const jsonQR = await generateQRCode(JSON.stringify(readableJSON, null, 2), { compress: false })
  const jsonSvgContent = Buffer.from(jsonQR.split(',')[1], 'base64').toString()
  writeFileSync(join(process.cwd(), 'test-results', 'readable-json.svg'), jsonSvgContent)
  console.log('✅ JSON QR Code generated')
  console.log('   📁 Saved as: test-results/readable-json.svg')
  console.log('   📱 Scan this to see readable JSON data\n')

  console.log('🎉 Human-Readable QR Codes Generated!')
  console.log('📁 Check these files in test-results/:')
  console.log('   - readable-text.svg (simple text)')
  console.log('   - github-url.svg (opens GitHub)')
  console.log('   - contact-info.svg (adds contact)')
  console.log('   - wifi-network.svg (connects to WiFi)')
  console.log('   - readable-json.svg (shows JSON data)')
  console.log('\n💡 These QR codes will show readable content when scanned!')
}

// Run the demo
demoReadableQRCode().catch(console.error) 