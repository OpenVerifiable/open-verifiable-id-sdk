#!/usr/bin/env tsx

import { generateQRCode } from '../src/utils/qr-code'
import { writeFileSync } from 'fs'
import { join } from 'path'

async function generateDemoQR() {
  const demoUrl = 'https://8318a5bb48c5.ngrok-free.app/web-bluetooth-demo.html'
  
  console.log('🔗 Generating QR Code for Web Bluetooth Demo')
  console.log('=============================================\n')
  console.log('Demo URL:', demoUrl)
  console.log('📱 Scan this QR code with your phone to open the demo!\n')

  // Generate QR code for the demo URL
  const qrCode = await generateQRCode(demoUrl, { compress: false })
  const svgContent = Buffer.from(qrCode.split(',')[1], 'base64').toString()
  writeFileSync(join(process.cwd(), 'test-results', 'demo-url.svg'), svgContent)
  
  console.log('✅ QR Code generated: test-results/demo-url.svg')
  console.log('📁 Open this file in your browser to see the QR code')
  console.log('📱 Scan it with your phone to open the Web Bluetooth demo!')
  console.log()
  console.log('🎯 Next Steps:')
  console.log('   1. Open test-results/demo-url.svg in your browser')
  console.log('   2. Scan the QR code with your phone')
  console.log('   3. The demo page will open on your phone')
  console.log('   4. Use Web Bluetooth to connect and transfer data')
}

generateDemoQR().catch(console.error) 