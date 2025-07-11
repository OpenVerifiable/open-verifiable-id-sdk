/**
 * End-to-End QR Code Workflow Test
 * 
 * This test covers the complete workflow for QR code generation,
 * data encoding/decoding, and credential exchange.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { generateQRCode, encodeData, decodeData } from '../../src/utils/qr-code'
import { PackageAgent } from '../../src/core/agents/package-agent'
import { writeFileSync, existsSync, unlinkSync } from 'fs'
import { join } from 'path'

describe.skip('End-to-End QR Code Workflow', () => {
  let packageAgent: PackageAgent
  const testPrivateKey = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
  const testOutputDir = join(process.cwd(), 'test-results')

  beforeEach(async () => {
    packageAgent = new PackageAgent({
      packageName: '@open-verifiable/qr-test',
      packageVersion: '1.0.0'
    })
    await packageAgent.initialize()
  })

  afterEach(async () => {
    if (packageAgent) {
      await packageAgent.cleanup()
    }
  })

  describe('QR Code Generation and Data Exchange', () => {
    it.skip('should complete full QR workflow: credential creation → QR generation → data encoding → decoding → verification', async () => {
      // Step 1: Create a credential to exchange
      console.log('📜 Step 1: Creating credential for QR exchange...')
      const didResult = await packageAgent.createDID('key', {
        alias: 'qr-test-did',
        options: {
          privateKeyHex: testPrivateKey.slice(0, 64),
          keyType: 'Ed25519'
        }
      })

      const credential = await packageAgent.issueCredential({
        '@context': ['https://www.w3.org/ns/credentials/v2'],
        type: ['VerifiableCredential', 'QRExchangeCredential'],
        issuer: didResult.did,
        credentialSubject: {
          id: 'did:example:qr-subject',
          name: 'QR Test User',
          email: 'qr-test@example.com',
          exchangeId: 'qr-exchange-123'
        },
        validFrom: new Date().toISOString()
      })

      expect(credential.id).toBeDefined()
      expect(credential.issuer).toBe(didResult.did)
      console.log('✅ Credential created for QR exchange')

      // Step 2: Generate QR code for simple text
      console.log('🔍 Step 2: Generating QR code for simple text...')
      const simpleText = 'Hello QR World'
      const simpleQR = await generateQRCode(simpleText)
      
      expect(simpleQR).toBeDefined()
      expect(simpleQR).toMatch(/^data:image\/svg\+xml;base64,/)
      expect(simpleQR.length).toBeGreaterThan(100)
      console.log('✅ Simple QR code generated')

      // Step 3: Generate QR code for credential data
      console.log('🔍 Step 3: Generating QR code for credential data...')
      const credentialData = {
        type: 'credential-exchange',
        version: '1.0',
        data: {
          credentialId: credential.id,
          issuer: credential.issuer,
          subject: credential.credentialSubject.id,
          timestamp: new Date().toISOString()
        }
      }

      const credentialQR = await generateQRCode(JSON.stringify(credentialData), { compress: true })
      expect(credentialQR).toBeDefined()
      expect(credentialQR).toMatch(/^data:image\/png;base64,/)
      console.log('✅ Credential QR code generated')

      // Step 4: Test data encoding and decoding
      console.log('🔄 Step 4: Testing data encoding/decoding...')
      const originalData = {
        message: 'Test QR message',
        number: 42,
        array: [1, 2, 3],
        credential: credentialData
      }

      // Encode with compression
      const encoded = encodeData(originalData, { compress: true })
      expect(encoded).toBeDefined()
      expect(encoded.length).toBeGreaterThan(0)

      // Decode and verify
      const decodedStr = decodeData(encoded)
      const decoded = JSON.parse(decodedStr)
      
      expect(decoded.message).toBe(originalData.message)
      expect(decoded.number).toBe(originalData.number)
      expect(decoded.array).toEqual(originalData.array)
      expect(decoded.credential).toEqual(originalData.credential)
      console.log('✅ Data encoding/decoding successful')

      // Step 5: Test compression benefits
      console.log('📊 Step 5: Testing compression benefits...')
      const largeData = {
        credential: {
          id: credential.id,
          type: credential.type,
          issuer: credential.issuer,
          validFrom: credential.validFrom,
          credentialSubject: {
            ...credential.credentialSubject,
            additionalData: {
              metadata: 'This is additional metadata for testing compression',
              tags: ['test', 'qr', 'workflow'],
              preferences: {
                theme: 'dark',
                language: 'en',
                notifications: true
              }
            }
          }
        }
      }

      const uncompressed = encodeData(largeData, { compress: false })
      const compressed = encodeData(largeData, { compress: true })
      
      expect(compressed.length).toBeLessThan(uncompressed.length)
      const compressionRatio = ((1 - compressed.length / uncompressed.length) * 100).toFixed(1)
      console.log(`✅ Compression working: ${compressionRatio}% reduction`)

      // Step 6: Save QR codes to files for inspection
      console.log('💾 Step 6: Saving QR codes to files...')
      if (!existsSync(testOutputDir)) {
        // Create directory if it doesn't exist
        const fs = require('fs')
        fs.mkdirSync(testOutputDir, { recursive: true })
      }

      // Save simple QR
      const simpleSvgContent = Buffer.from(simpleQR.split(',')[1], 'base64').toString()
      const simpleQrPath = join(testOutputDir, 'e2e-simple-qr.svg')
      writeFileSync(simpleQrPath, simpleSvgContent)
      expect(existsSync(simpleQrPath)).toBe(true)

      // Save credential QR
      const credentialSvgContent = Buffer.from(credentialQR.split(',')[1], 'base64').toString()
      const credentialQrPath = join(testOutputDir, 'e2e-credential-qr.svg')
      writeFileSync(credentialQrPath, credentialSvgContent)
      expect(existsSync(credentialQrPath)).toBe(true)

      console.log('✅ QR codes saved to test-results/')

      // Step 7: Verify credential after QR round-trip
      console.log('🔍 Step 7: Verifying credential after QR round-trip...')
      const verificationResult = await packageAgent.verifyCredential(credential)
      expect(verificationResult.isValid).toBe(true)
      console.log('✅ Credential verification successful after QR workflow')

      console.log('🎉 QR workflow completed successfully!')
    })

    it('should handle QR workflow with different data types', async () => {
      const testCases = [
        { name: 'string', data: 'Simple string data' },
        { name: 'number', data: 42 },
        { name: 'array', data: [1, 2, 3, 'test'] },
        { name: 'object', data: { key: 'value', nested: { data: 'test' } } },
        { name: 'boolean', data: true },
        { name: 'null', data: null }
      ]

      for (const testCase of testCases) {
        console.log(`Testing QR with ${testCase.name} data...`)
        
        const qrCode = await generateQRCode(JSON.stringify(testCase.data))
        expect(qrCode).toBeDefined()
        expect(qrCode).toMatch(/^data:image\/png;base64,/)

        const encoded = encodeData(testCase.data, { compress: true })
        const decodedStr = decodeData(encoded)
        const decoded = JSON.parse(decodedStr)
        
        expect(decoded).toEqual(testCase.data)
        console.log(`✅ ${testCase.name} data test passed`)
      }
    })

    it('should handle QR workflow errors gracefully', async () => {
      // Test with very large data (should still work but might be slow)
      const largeData = {
        data: 'x'.repeat(1000), // 1KB of data
        array: Array.from({ length: 100 }, (_, i) => i),
        nested: {
          level1: { level2: { level3: { data: 'deep nested data' } } }
        }
      }

      const qrCode = await generateQRCode(JSON.stringify(largeData), { compress: true })
      expect(qrCode).toBeDefined()

      const encoded = encodeData(largeData, { compress: true })
      const decodedStr = decodeData(encoded)
      const decoded = JSON.parse(decodedStr)
      
      expect(decoded.data).toBe(largeData.data)
      expect(decoded.array).toEqual(largeData.array)
      expect(decoded.nested.level1.level2.level3.data).toBe(largeData.nested.level1.level2.level3.data)

      console.log('✅ Large data QR test passed')
    })
  })

  describe('QR Code Credential Exchange Simulation', () => {
    it('should simulate complete credential exchange via QR codes', async () => {
      // Create issuer agent
      const issuerAgent = new PackageAgent({
        packageName: '@open-verifiable/issuer',
        packageVersion: '1.0.0'
      })
      await issuerAgent.initialize()

      // Create verifier agent
      const verifierAgent = new PackageAgent({
        packageName: '@open-verifiable/verifier',
        packageVersion: '1.0.0'
      })
      await verifierAgent.initialize()

      try {
        // Step 1: Issuer creates credential
        const issuerDid = await issuerAgent.createDID('key', {
          alias: 'issuer-did',
          options: {
            privateKeyHex: testPrivateKey.slice(0, 64),
            keyType: 'Ed25519'
          }
        })

        const credential = await issuerAgent.issueCredential({
          '@context': ['https://www.w3.org/ns/credentials/v2'],
          type: ['VerifiableCredential', 'ExchangeTestCredential'],
          issuer: issuerDid.did,
          credentialSubject: {
            id: 'did:example:exchange-subject',
            name: 'Exchange Test User',
            exchangeId: 'exchange-123'
          },
          validFrom: new Date().toISOString()
        })

        // Step 2: Generate QR code for credential exchange
        const exchangeData = {
          type: 'credential-exchange',
          version: '1.0',
          credential: credential,
          issuer: issuerDid.did,
          timestamp: new Date().toISOString()
        }

        const qrCode = await generateQRCode(JSON.stringify(exchangeData), { compress: true })
        expect(qrCode).toBeDefined()

        // Step 3: Simulate QR code scanning and data extraction
        const encoded = encodeData(exchangeData, { compress: true })
        const decodedStr = decodeData(encoded)
        const decoded = JSON.parse(decodedStr)

        expect(decoded.type).toBe('credential-exchange')
        expect(decoded.credential.id).toBe(credential.id)
        expect(decoded.issuer).toBe(issuerDid.did)

        // Step 4: Verifier processes the credential
        const receivedCredential = decoded.credential
        const verificationResult = await verifierAgent.verifyCredential(receivedCredential)
        
        expect(verificationResult.isValid).toBe(true)
        expect(receivedCredential.issuer).toBe(issuerDid.did)

        // Step 5: Store the received credential
        await verifierAgent.storeCredential(receivedCredential)
        const storedCredentials = await verifierAgent.listCredentials()
        expect(storedCredentials.some(c => c.id === receivedCredential.id)).toBe(true)

        console.log('✅ Complete credential exchange simulation successful')

      } finally {
        await issuerAgent.cleanup()
        await verifierAgent.cleanup()
      }
    })
  })
}) 