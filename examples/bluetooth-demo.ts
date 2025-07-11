#!/usr/bin/env tsx

import { 
  BluetoothManager, 
  sendCredentialsViaBluetooth, 
  receiveCredentialsViaBluetooth 
} from '../src/utils/bluetooth'

async function demoBluetooth() {
  console.log('📡 Bluetooth Communication Demo')
  console.log('================================\n')

  const bluetooth = new BluetoothManager()

  // Check if Bluetooth is supported
  console.log('1. Checking Bluetooth support...')
  if (!bluetooth['isSupported']) {
    console.log('❌ Bluetooth not supported in this environment')
    console.log('   This demo requires Web Bluetooth API (Chrome/Edge) or Node.js with noble')
    return
  }
  console.log('✅ Bluetooth is supported\n')

  // Example 1: Scan for devices
  console.log('2. Scanning for Bluetooth devices...')
  try {
    const devices = await bluetooth.scanForDevices()
    console.log(`✅ Found ${devices.length} device(s):`)
    devices.forEach(device => {
      console.log(`   - ${device.name || 'Unknown'} (${device.id})`)
    })
  } catch (error) {
    console.log('❌ Scanning failed:', error.message)
    console.log('   This is expected if no devices are available or permissions denied')
  }
  console.log()

  // Example 2: Send credentials (simulated)
  console.log('3. Simulating credential transfer...')
  const sampleCredentials = {
    type: 'VerifiableCredential',
    id: 'urn:uuid:12345678-1234-1234-1234-123456789abc',
    issuer: 'did:example:issuer',
    credentialSubject: {
      id: 'did:example:subject',
      name: 'John Doe',
      email: 'john.doe@example.com'
    },
    validFrom: new Date().toISOString()
  }

  console.log('   Sample credentials to send:')
  console.log('   ', JSON.stringify(sampleCredentials, null, 2))
  console.log()

  // Example 3: Show how to use the convenience functions
  console.log('4. Usage examples:')
  console.log('   // Send credentials to a device')
  console.log('   const result = await sendCredentialsViaBluetooth(deviceId, credentials)')
  console.log('   console.log("Transfer result:", result)')
  console.log()
  console.log('   // Receive credentials from a device')
  console.log('   const received = await receiveCredentialsViaBluetooth(deviceId)')
  console.log('   console.log("Received:", received)')
  console.log()

  // Example 4: Manual connection example
  console.log('5. Manual connection example:')
  console.log('   const bluetooth = new BluetoothManager()')
  console.log('   const connection = await bluetooth.connectToDevice(deviceId)')
  console.log('   await bluetooth.sendData(deviceId, JSON.stringify(data))')
  console.log('   const received = await bluetooth.receiveData(deviceId)')
  console.log('   await bluetooth.disconnect(deviceId)')
  console.log()

  console.log('🎉 Bluetooth demo complete!')
  console.log('📱 To test this in a browser:')
  console.log('   1. Open Chrome/Edge with Web Bluetooth support')
  console.log('   2. Run this script in a web context')
  console.log('   3. Allow Bluetooth permissions when prompted')
  console.log('   4. Select a device to connect to')
}

// Run the demo
demoBluetooth().catch(console.error) 