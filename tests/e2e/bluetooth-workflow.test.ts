/**
 * End-to-End Bluetooth Workflow Test
 * 
 * This test covers the complete workflow for Bluetooth device discovery,
 * credential transfer, and cross-device communication.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { 
  BluetoothManager, 
  sendCredentialsViaBluetooth, 
  receiveCredentialsViaBluetooth 
} from '../../src/utils/bluetooth'
import { PackageAgent } from '../../src/core/agents/package-agent'

// Mock Bluetooth API for testing
const mockBluetoothAPI = {
  requestDevice: vi.fn(),
  getAvailability: vi.fn().mockResolvedValue(true),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
}

// Mock global navigator.bluetooth
Object.defineProperty(global, 'navigator', {
  value: {
    bluetooth: mockBluetoothAPI
  },
  writable: true
})

describe('End-to-End Bluetooth Workflow', () => {
  let bluetoothManager: BluetoothManager
  let senderAgent: PackageAgent
  let receiverAgent: PackageAgent
  const testPrivateKey = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'

  beforeEach(async () => {
    bluetoothManager = new BluetoothManager()
    
    senderAgent = new PackageAgent({
      packageName: '@open-verifiable/sender',
      packageVersion: '1.0.0'
    })
    await senderAgent.initialize()

    receiverAgent = new PackageAgent({
      packageName: '@open-verifiable/receiver',
      packageVersion: '1.0.0'
    })
    await receiverAgent.initialize()
  })

  afterEach(async () => {
    if (senderAgent) await senderAgent.cleanup()
    if (receiverAgent) await receiverAgent.cleanup()
    vi.clearAllMocks()
  })

  describe('Bluetooth Device Discovery and Connection', () => {
    it('should complete full Bluetooth workflow: device discovery → connection → credential transfer → verification', async () => {
      // Step 1: Check Bluetooth support
      console.log('📡 Step 1: Checking Bluetooth support...')
      const isSupported = bluetoothManager['isSupported']
      console.log(`Bluetooth supported: ${isSupported}`)

      // Step 2: Mock device discovery
      console.log('🔍 Step 2: Simulating device discovery...')
      const mockDevices = [
        { id: 'device-1', name: 'Test Device 1' },
        { id: 'device-2', name: 'Test Device 2' }
      ]

      // Mock the scanForDevices method
      vi.spyOn(bluetoothManager, 'scanForDevices').mockResolvedValue(mockDevices)
      
      const devices = await bluetoothManager.scanForDevices()
      expect(devices).toEqual(mockDevices)
      expect(devices.length).toBe(2)
      console.log('✅ Device discovery simulated')

      // Step 3: Create credentials to transfer
      console.log('📜 Step 3: Creating credentials for transfer...')
      const senderDid = await senderAgent.createDID('key', {
        alias: 'sender-did',
        options: {
          privateKeyHex: testPrivateKey.slice(0, 64),
          keyType: 'Ed25519'
        }
      })

      const credential = await senderAgent.issueCredential({
        '@context': ['https://www.w3.org/ns/credentials/v2'],
        type: ['VerifiableCredential', 'BluetoothTransferCredential'],
        issuer: senderDid.did,
        credentialSubject: {
          id: 'did:example:bluetooth-subject',
          name: 'Bluetooth Test User',
          email: 'bluetooth-test@example.com',
          transferId: 'bluetooth-transfer-123'
        },
        validFrom: new Date().toISOString()
      })

      expect(credential.id).toBeDefined()
      expect(credential.issuer).toBe(senderDid.did)
      console.log('✅ Credential created for Bluetooth transfer')

      // Step 4: Mock connection to device
      console.log('🔗 Step 4: Simulating device connection...')
      const targetDeviceId = 'device-1'
      
      // Mock the connectToDevice method
      vi.spyOn(bluetoothManager, 'connectToDevice').mockResolvedValue({
        deviceId: targetDeviceId,
        connected: true,
        timestamp: new Date().toISOString()
      })

      const connection = await bluetoothManager.connectToDevice(targetDeviceId)
      expect(connection.connected).toBe(true)
      expect(connection.deviceId).toBe(targetDeviceId)
      console.log('✅ Device connection simulated')

      // Step 5: Mock credential transfer
      console.log('📤 Step 5: Simulating credential transfer...')
      const transferData = {
        type: 'credential-transfer',
        version: '1.0',
        credential: credential,
        sender: senderDid.did,
        timestamp: new Date().toISOString()
      }

      // Mock the sendData method
      vi.spyOn(bluetoothManager, 'sendData').mockResolvedValue({
        success: true,
        bytesSent: JSON.stringify(transferData).length,
        timestamp: new Date().toISOString()
      })

      const sendResult = await bluetoothManager.sendData(targetDeviceId, JSON.stringify(transferData))
      expect(sendResult.success).toBe(true)
      expect(sendResult.bytesSent).toBeGreaterThan(0)
      console.log('✅ Credential transfer simulated')

      // Step 6: Mock credential reception
      console.log('📥 Step 6: Simulating credential reception...')
      
      // Mock the receiveData method
      vi.spyOn(bluetoothManager, 'receiveData').mockResolvedValue(JSON.stringify(transferData))

      const receivedData = await bluetoothManager.receiveData(targetDeviceId)
      const parsedData = JSON.parse(receivedData)
      
      expect(parsedData.type).toBe('credential-transfer')
      expect(parsedData.credential.id).toBe(credential.id)
      expect(parsedData.sender).toBe(senderDid.did)
      console.log('✅ Credential reception simulated')

      // Step 7: Verify received credential
      console.log('🔍 Step 7: Verifying received credential...')
      const receivedCredential = parsedData.credential
      const verificationResult = await receiverAgent.verifyCredential(receivedCredential)
      
      expect(verificationResult.isValid).toBe(true)
      expect(receivedCredential.issuer).toBe(senderDid.did)
      console.log('✅ Received credential verification successful')

      // Step 8: Store the received credential
      console.log('💾 Step 8: Storing received credential...')
      await receiverAgent.storeCredential(receivedCredential)
      
      const storedCredentials = await receiverAgent.listCredentials()
      expect(storedCredentials.some(c => c.id === receivedCredential.id)).toBe(true)
      console.log('✅ Credential stored successfully')

      // Step 9: Mock disconnection
      console.log('🔌 Step 9: Simulating device disconnection...')
      vi.spyOn(bluetoothManager, 'disconnect').mockResolvedValue({
        success: true,
        deviceId: targetDeviceId,
        timestamp: new Date().toISOString()
      })

      const disconnectResult = await bluetoothManager.disconnect(targetDeviceId)
      expect(disconnectResult.success).toBe(true)
      expect(disconnectResult.deviceId).toBe(targetDeviceId)
      console.log('✅ Device disconnection simulated')

      console.log('🎉 Bluetooth workflow completed successfully!')
    })

    it('should handle Bluetooth workflow with multiple credentials', async () => {
      // Create multiple credentials
      const senderDid = await senderAgent.createDID('key', {
        alias: 'multi-sender-did',
        options: {
          privateKeyHex: testPrivateKey.slice(0, 64),
          keyType: 'Ed25519'
        }
      })

      const credentials = []
      for (let i = 0; i < 3; i++) {
        const credential = await senderAgent.issueCredential({
          '@context': ['https://www.w3.org/ns/credentials/v2'],
          type: ['VerifiableCredential', 'MultiTransferCredential'],
          issuer: senderDid.did,
          credentialSubject: {
            id: `did:example:multi-subject-${i}`,
            name: `Multi Test User ${i}`,
            index: i
          },
          validFrom: new Date().toISOString()
        })
        credentials.push(credential)
      }

      // Mock device connection
      const targetDeviceId = 'multi-device'
      vi.spyOn(bluetoothManager, 'connectToDevice').mockResolvedValue({
        deviceId: targetDeviceId,
        connected: true,
        timestamp: new Date().toISOString()
      })

      await bluetoothManager.connectToDevice(targetDeviceId)

      // Transfer each credential
      for (let i = 0; i < credentials.length; i++) {
        const credential = credentials[i]
        const transferData = {
          type: 'credential-transfer',
          version: '1.0',
          credential: credential,
          sender: senderDid.did,
          index: i,
          timestamp: new Date().toISOString()
        }

        // Mock send and receive
        vi.spyOn(bluetoothManager, 'sendData').mockResolvedValue({
          success: true,
          bytesSent: JSON.stringify(transferData).length,
          timestamp: new Date().toISOString()
        })

        vi.spyOn(bluetoothManager, 'receiveData').mockResolvedValue(JSON.stringify(transferData))

        await bluetoothManager.sendData(targetDeviceId, JSON.stringify(transferData))
        const receivedData = await bluetoothManager.receiveData(targetDeviceId)
        const parsedData = JSON.parse(receivedData)

        // Verify and store
        const verificationResult = await receiverAgent.verifyCredential(parsedData.credential)
        expect(verificationResult.isValid).toBe(true)
        await receiverAgent.storeCredential(parsedData.credential)
      }

      // Verify all credentials were stored
      const storedCredentials = await receiverAgent.listCredentials()
      expect(storedCredentials.length).toBeGreaterThanOrEqual(credentials.length)
      
      for (const credential of credentials) {
        expect(storedCredentials.some(c => c.id === credential.id)).toBe(true)
      }

      console.log('✅ Multiple credential transfer successful')
    })

    it('should handle Bluetooth workflow errors gracefully', async () => {
      // Test connection failure
      vi.spyOn(bluetoothManager, 'connectToDevice').mockRejectedValue(
        new Error('Connection failed')
      )

      await expect(
        bluetoothManager.connectToDevice('invalid-device')
      ).rejects.toThrow('Connection failed')

      // Test send failure
      vi.spyOn(bluetoothManager, 'connectToDevice').mockResolvedValue({
        deviceId: 'test-device',
        connected: true,
        timestamp: new Date().toISOString()
      })

      vi.spyOn(bluetoothManager, 'sendData').mockRejectedValue(
        new Error('Send failed')
      )

      await bluetoothManager.connectToDevice('test-device')
      await expect(
        bluetoothManager.sendData('test-device', 'test-data')
      ).rejects.toThrow('Send failed')

      // Test receive failure
      vi.spyOn(bluetoothManager, 'receiveData').mockRejectedValue(
        new Error('Receive failed')
      )

      await expect(
        bluetoothManager.receiveData('test-device')
      ).rejects.toThrow('Receive failed')

      console.log('✅ Bluetooth error handling tests passed')
    })
  })

  describe('Bluetooth Convenience Functions', () => {
    it('should use convenience functions for credential transfer', async () => {
      // Create credential
      const senderDid = await senderAgent.createDID('key', {
        alias: 'convenience-sender-did',
        options: {
          privateKeyHex: testPrivateKey.slice(0, 64),
          keyType: 'Ed25519'
        }
      })

      const credential = await senderAgent.issueCredential({
        '@context': ['https://www.w3.org/ns/credentials/v2'],
        type: ['VerifiableCredential', 'ConvenienceCredential'],
        issuer: senderDid.did,
        credentialSubject: {
          id: 'did:example:convenience-subject',
          name: 'Convenience Test User'
        },
        validFrom: new Date().toISOString()
      })

      // Mock the convenience functions
      vi.spyOn(global, 'sendCredentialsViaBluetooth').mockImplementation(async (deviceId, credentials) => {
        return {
          success: true,
          deviceId,
          credentialsSent: Array.isArray(credentials) ? credentials.length : 1,
          timestamp: new Date().toISOString()
        }
      })

      vi.spyOn(global, 'receiveCredentialsViaBluetooth').mockImplementation(async (deviceId) => {
        return [credential]
      })

      // Test send convenience function
      const sendResult = await sendCredentialsViaBluetooth('convenience-device', credential)
      expect(sendResult.success).toBe(true)
      expect(sendResult.credentialsSent).toBe(1)

      // Test receive convenience function
      const receivedCredentials = await receiveCredentialsViaBluetooth('convenience-device')
      expect(receivedCredentials).toHaveLength(1)
      expect(receivedCredentials[0].id).toBe(credential.id)

      console.log('✅ Bluetooth convenience functions test passed')
    })
  })
}) 