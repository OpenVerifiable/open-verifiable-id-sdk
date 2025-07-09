#!/usr/bin/env tsx

import { generateQRCode, encodeData, decodeData } from '../src/utils/qr-code'
import { BluetoothManager, sendCredentialsViaBluetooth } from '../src/utils/bluetooth'
import { writeFileSync } from 'fs'
import { join } from 'path'

async function demoQRBluetoothCombo() {
  console.log('🔗 QR Code + Bluetooth Combo Demo')
  console.log('==================================\n')

  // Example 1: Generate QR code with device pairing info
  console.log('1. Generating QR code with device pairing info...')
  
  const deviceInfo = {
    type: 'device-pairing',
    deviceId: 'device-12345',
    deviceName: 'Open Verifiable Device',
    capabilities: ['bluetooth', 'qr-code', 'credentials'],
    bluetoothService: '0000ff00-0000-1000-8000-00805f9b34fb',
    timestamp: new Date().toISOString()
  }

  const pairingQR = await generateQRCode(JSON.stringify(deviceInfo, null, 2), { compress: false })
  const svgContent = Buffer.from(pairingQR.split(',')[1], 'base64').toString()
  writeFileSync(join(process.cwd(), 'test-results', 'device-pairing.svg'), svgContent)
  
  console.log('✅ Device pairing QR code generated')
  console.log('   📁 Saved as: test-results/device-pairing.svg')
  console.log('   📱 Scan this to get device pairing info')
  console.log('   📋 Content:', JSON.stringify(deviceInfo, null, 2))
  console.log()

  // Example 2: Generate QR code with Bluetooth connection instructions
  console.log('2. Generating QR code with Bluetooth connection instructions...')
  
  const connectionInstructions = {
    type: 'bluetooth-connection',
    steps: [
      '1. Enable Bluetooth on your device',
      '2. Open Bluetooth settings',
      '3. Look for "Open Verifiable Device"',
      '4. Tap to pair',
      '5. Enter PIN if prompted'
    ],
    deviceName: 'Open Verifiable Device',
    serviceUUID: '0000ff00-0000-1000-8000-00805f9b34fb',
    characteristicUUID: '0000ff01-0000-1000-8000-00805f9b34fb'
  }

  const connectionQR = await generateQRCode(JSON.stringify(connectionInstructions, null, 2), { compress: false })
  const connectionSvgContent = Buffer.from(connectionQR.split(',')[1], 'base64').toString()
  writeFileSync(join(process.cwd(), 'test-results', 'bluetooth-connection.svg'), connectionSvgContent)
  
  console.log('✅ Bluetooth connection QR code generated')
  console.log('   📁 Saved as: test-results/bluetooth-connection.svg')
  console.log('   📱 Scan this to get connection instructions')
  console.log()

  // Example 3: Generate QR code with credential transfer request
  console.log('3. Generating QR code with credential transfer request...')
  
  const transferRequest = {
    type: 'credential-transfer-request',
    requestId: 'req-67890',
    requestedCredentials: ['email', 'name', 'phone'],
    transferMethod: 'bluetooth',
    deviceId: 'device-12345',
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
  }

  const transferQR = await generateQRCode(JSON.stringify(transferRequest, null, 2), { compress: false })
  const transferSvgContent = Buffer.from(transferQR.split(',')[1], 'base64').toString()
  writeFileSync(join(process.cwd(), 'test-results', 'credential-transfer.svg'), transferSvgContent)
  
  console.log('✅ Credential transfer QR code generated')
  console.log('   📁 Saved as: test-results/credential-transfer.svg')
  console.log('   📱 Scan this to initiate credential transfer')
  console.log()

  // Example 4: Show the complete workflow
  console.log('4. Complete QR + Bluetooth Workflow:')
  console.log('   Step 1: User scans device-pairing.svg')
  console.log('   Step 2: User scans bluetooth-connection.svg')
  console.log('   Step 3: User scans credential-transfer.svg')
  console.log('   Step 4: Devices connect via Bluetooth')
  console.log('   Step 5: Credentials are transferred securely')
  console.log()

  // Example 5: Code example for the complete workflow
  console.log('5. Code example for the complete workflow:')
  console.log('   // 1. Generate pairing QR code')
  console.log('   const pairingQR = await generateQRCode(deviceInfo, { compress: false })')
  console.log()
  console.log('   // 2. User scans QR and connects via Bluetooth')
  console.log('   const bluetooth = new BluetoothManager()')
  console.log('   const devices = await bluetooth.scanForDevices()')
  console.log('   const device = devices.find(d => d.name === "Open Verifiable Device")')
  console.log()
  console.log('   // 3. Send credentials via Bluetooth')
  console.log('   const credentials = { name: "John Doe", email: "john@example.com" }')
  console.log('   const result = await sendCredentialsViaBluetooth(device.id, credentials)')
  console.log('   console.log("Transfer successful:", result.success)')
  console.log()

  console.log('🎉 QR + Bluetooth combo demo complete!')
  console.log('📁 Generated QR codes in test-results/:')
  console.log('   - device-pairing.svg (device info)')
  console.log('   - bluetooth-connection.svg (connection steps)')
  console.log('   - credential-transfer.svg (transfer request)')
  console.log()
  console.log('💡 This demonstrates how QR codes can be used to:')
  console.log('   • Share device pairing information')
  console.log('   • Provide connection instructions')
  console.log('   • Initiate secure data transfers')
  console.log('   • Enable seamless device-to-device communication')
}

// Run the demo
demoQRBluetoothCombo().catch(console.error) 