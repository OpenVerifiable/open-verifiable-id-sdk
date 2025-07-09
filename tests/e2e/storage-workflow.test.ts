/**
 * End-to-End Storage and Backup Workflow Test
 * 
 * This test covers the complete workflow for secure storage,
 * backup/restore, and cross-device synchronization.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PackageAgent } from '../../src/core/agents/package-agent'
import { CredentialKeyManager } from '../../src/core/credentialing/credential-key-manager'
import { createSecureStorage } from '../../src/core/storage'

describe('End-to-End Storage and Backup Workflow', () => {
  let packageAgent: PackageAgent
  let keyManager: CredentialKeyManager
  let storage: any
  const testPrivateKey = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
  const testPassphrase = 'test-passphrase-123'

  beforeEach(async () => {
    // Create secure storage
    storage = createSecureStorage()
    
    // Create key manager
    keyManager = new CredentialKeyManager(storage)
    
    // Create package agent
    packageAgent = new PackageAgent({
      packageName: '@open-verifiable/storage-test',
      packageVersion: '1.0.0'
    })
    await packageAgent.initialize()
  })

  afterEach(async () => {
    if (packageAgent) await packageAgent.cleanup()
    if (storage) await storage.clear()
  })

  describe('Secure Storage and Credential Management', () => {
    it('should complete full storage workflow: credential creation → storage → retrieval → backup → restore', async () => {
      // Step 1: Create multiple credentials
      console.log('📜 Step 1: Creating multiple credentials...')
      const senderDid = await packageAgent.createDID('key', {
        alias: 'storage-test-did',
        options: {
          privateKeyHex: testPrivateKey.slice(0, 64),
          keyType: 'Ed25519'
        }
      })

      const credentials = []
      for (let i = 0; i < 3; i++) {
        const credential = await packageAgent.issueCredential({
          '@context': ['https://www.w3.org/ns/credentials/v2'],
          type: ['VerifiableCredential', 'StorageTestCredential'],
          issuer: senderDid.did,
          credentialSubject: {
            id: `did:example:storage-subject-${i}`,
            name: `Storage Test User ${i}`,
            index: i,
            timestamp: new Date().toISOString()
          },
          validFrom: new Date().toISOString()
        })
        credentials.push(credential)
      }

      expect(credentials).toHaveLength(3)
      console.log('✅ Multiple credentials created')

      // Step 2: Store credentials
      console.log('💾 Step 2: Storing credentials...')
      for (const credential of credentials) {
        await packageAgent.storeCredential(credential)
      }

      const storedCredentials = await packageAgent.listCredentials()
      expect(storedCredentials.length).toBeGreaterThanOrEqual(3)
      
      for (const credential of credentials) {
        expect(storedCredentials.some(c => c.id === credential.id)).toBe(true)
      }
      console.log('✅ All credentials stored successfully')

      // Step 3: Verify stored credentials
      console.log('🔍 Step 3: Verifying stored credentials...')
      for (const credential of credentials) {
        const verificationResult = await packageAgent.verifyCredential(credential)
        expect(verificationResult.isValid).toBe(true)
      }
      console.log('✅ All stored credentials verified')

      // Step 4: Create credential bundles
      console.log('📦 Step 4: Creating credential bundles...')
      const bundles = []
      for (const credential of credentials) {
        const bundle = await keyManager.exportCredentialBundle(credential.id, {
          includePrivateKey: true,
          includeRecoveryPhrase: false,
          format: 'base64',
          encrypt: false
        })
        bundles.push(bundle)
      }

      expect(bundles).toHaveLength(3)
      for (const bundle of bundles) {
        expect(bundle.credential).toBeDefined()
        expect(bundle.keyData).toBeDefined()
        expect(bundle.metadata).toBeDefined()
      }
      console.log('✅ Credential bundles created')

      // Step 5: Create cross-device sync data
      console.log('🔄 Step 5: Creating cross-device sync data...')
      const credentialIds = credentials.map(c => c.id)
      const syncData = await keyManager.createCrossDeviceSyncData(
        credentialIds,
        'test-device-1',
        {
          includePrivateKey: true,
          includeRecoveryPhrase: false,
          format: 'base64',
          encrypt: false
        }
      )

      expect(syncData.bundles).toHaveLength(3)
      expect(syncData.metadata.sourceDeviceId).toBe('test-device-1')
      expect(syncData.metadata.totalBundles).toBe(3)
      expect(syncData.metadata.syncId).toMatch(/^sync:/)
      console.log('✅ Cross-device sync data created')

      // Step 6: Export backup
      console.log('💾 Step 6: Exporting backup...')
      const backupData = await storage.exportBackup(testPassphrase)
      expect(backupData).toBeDefined()
      expect(backupData.length).toBeGreaterThan(0)
      console.log('✅ Backup exported successfully')

      // Step 7: Clear storage and restore from backup
      console.log('🔄 Step 7: Clearing storage and restoring from backup...')
      await storage.clear()
      
      const emptyCredentials = await packageAgent.listCredentials()
      expect(emptyCredentials.length).toBe(0)

      await storage.importBackup(backupData, testPassphrase)
      console.log('✅ Backup imported successfully')

      // Step 8: Verify restored credentials
      console.log('🔍 Step 8: Verifying restored credentials...')
      const restoredCredentials = await packageAgent.listCredentials()
      expect(restoredCredentials.length).toBeGreaterThanOrEqual(3)

      for (const credential of credentials) {
        const found = restoredCredentials.find(c => c.id === credential.id)
        expect(found).toBeDefined()
        
        const verificationResult = await packageAgent.verifyCredential(found)
        expect(verificationResult.isValid).toBe(true)
      }
      console.log('✅ All restored credentials verified')

      // Step 9: Import cross-device sync data
      console.log('📥 Step 9: Importing cross-device sync data...')
      await keyManager.importCrossDeviceSyncData(syncData, 'test-device-2', {
        format: 'base64',
        encrypted: false,
        validate: true
      })

      const syncedCredentials = await packageAgent.listCredentials()
      expect(syncedCredentials.length).toBeGreaterThanOrEqual(3)
      console.log('✅ Cross-device sync data imported')

      // Step 10: Verify final state
      console.log('✅ Step 10: Verifying final state...')
      const finalCredentials = await packageAgent.listCredentials()
      expect(finalCredentials.length).toBeGreaterThanOrEqual(3)

      for (const credential of finalCredentials) {
        const verificationResult = await packageAgent.verifyCredential(credential)
        expect(verificationResult.isValid).toBe(true)
      }

      console.log('🎉 Storage workflow completed successfully!')
    })

    it('should handle storage workflow with encryption', async () => {
      // Create credential
      const senderDid = await packageAgent.createDID('key', {
        alias: 'encrypted-storage-did',
        options: {
          privateKeyHex: testPrivateKey.slice(0, 64),
          keyType: 'Ed25519'
        }
      })

      const credential = await packageAgent.issueCredential({
        '@context': ['https://www.w3.org/ns/credentials/v2'],
        type: ['VerifiableCredential', 'EncryptedStorageCredential'],
        issuer: senderDid.did,
        credentialSubject: {
          id: 'did:example:encrypted-subject',
          name: 'Encrypted Test User',
          secret: 'sensitive-data'
        },
        validFrom: new Date().toISOString()
      })

      // Store credential
      await packageAgent.storeCredential(credential)

      // Export encrypted bundle
      const encryptedBundle = await keyManager.exportCredentialBundle(credential.id, {
        includePrivateKey: true,
        includeRecoveryPhrase: false,
        format: 'base64',
        encrypt: true
      })

      expect(encryptedBundle.credential).toBeDefined()
      expect(encryptedBundle.keyData).toBeDefined()
      console.log('✅ Encrypted bundle created')

      // Import encrypted bundle
      await keyManager.importCredentialBundle(encryptedBundle, {
        format: 'base64',
        encrypted: true,
        validate: true
      })

      const storedCredentials = await packageAgent.listCredentials()
      expect(storedCredentials.some(c => c.id === credential.id)).toBe(true)
      console.log('✅ Encrypted bundle imported successfully')
    })

    it('should handle storage workflow errors gracefully', async () => {
      // Test with invalid backup data
      const invalidBackup = 'invalid-backup-data'
      
      await expect(
        storage.importBackup(invalidBackup, testPassphrase)
      ).rejects.toThrow()

      // Test with wrong passphrase
      const validBackup = await storage.exportBackup(testPassphrase)
      
      await expect(
        storage.importBackup(validBackup, 'wrong-passphrase')
      ).rejects.toThrow()

      // Test with non-existent credential
      await expect(
        keyManager.exportCredentialBundle('non-existent-id', {
          includePrivateKey: true,
          includeRecoveryPhrase: false,
          format: 'base64',
          encrypt: false
        })
      ).rejects.toThrow('Credential not found')

      console.log('✅ Storage error handling tests passed')
    })
  })

  describe('Key Rotation and Recovery', () => {
    it('should handle key rotation workflow', async () => {
      // Create initial credential
      const senderDid = await packageAgent.createDID('key', {
        alias: 'rotation-test-did',
        options: {
          privateKeyHex: testPrivateKey.slice(0, 64),
          keyType: 'Ed25519'
        }
      })

      const credential = await packageAgent.issueCredential({
        '@context': ['https://www.w3.org/ns/credentials/v2'],
        type: ['VerifiableCredential', 'RotationTestCredential'],
        issuer: senderDid.did,
        credentialSubject: {
          id: 'did:example:rotation-subject',
          name: 'Rotation Test User'
        },
        validFrom: new Date().toISOString()
      })

      await packageAgent.storeCredential(credential)

      // Export with recovery phrase
      const bundleWithRecovery = await keyManager.exportCredentialBundle(credential.id, {
        includePrivateKey: true,
        includeRecoveryPhrase: true,
        format: 'base64',
        encrypt: false
      })

      expect(bundleWithRecovery.keyData.recoveryPhrase).toBeDefined()
      console.log('✅ Bundle with recovery phrase created')

      // Simulate key rotation
      const newPrivateKey = 'fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321'
      
      // Create new DID with new key
      const newDid = await packageAgent.createDID('key', {
        alias: 'rotated-did',
        options: {
          privateKeyHex: newPrivateKey.slice(0, 64),
          keyType: 'Ed25519'
        }
      })

      // Issue new credential with rotated key
      const rotatedCredential = await packageAgent.issueCredential({
        '@context': ['https://www.w3.org/ns/credentials/v2'],
        type: ['VerifiableCredential', 'RotatedCredential'],
        issuer: newDid.did,
        credentialSubject: {
          id: 'did:example:rotated-subject',
          name: 'Rotated Test User',
          rotatedFrom: senderDid.did
        },
        validFrom: new Date().toISOString()
      })

      expect(rotatedCredential.issuer).toBe(newDid.did)
      expect(rotatedCredential.issuer).not.toBe(senderDid.did)
      
      const verificationResult = await packageAgent.verifyCredential(rotatedCredential)
      expect(verificationResult.isValid).toBe(true)
      console.log('✅ Key rotation workflow completed')
    })
  })

  describe('Audit and Access Logging', () => {
    it('should maintain audit logs for storage operations', async () => {
      // Create credential
      const senderDid = await packageAgent.createDID('key', {
        alias: 'audit-test-did',
        options: {
          privateKeyHex: testPrivateKey.slice(0, 64),
          keyType: 'Ed25519'
        }
      })

      const credential = await packageAgent.issueCredential({
        '@context': ['https://www.w3.org/ns/credentials/v2'],
        type: ['VerifiableCredential', 'AuditTestCredential'],
        issuer: senderDid.did,
        credentialSubject: {
          id: 'did:example:audit-subject',
          name: 'Audit Test User'
        },
        validFrom: new Date().toISOString()
      })

      // Perform various operations
      await packageAgent.storeCredential(credential)
      await packageAgent.verifyCredential(credential)
      await packageAgent.listCredentials()

      // Get audit log
      const auditLog = await storage.getAccessLog()
      expect(Array.isArray(auditLog)).toBe(true)
      expect(auditLog.length).toBeGreaterThan(0)

      // Verify audit entries
      const storeEntries = auditLog.filter(entry => entry.operation === 'store')
      const verifyEntries = auditLog.filter(entry => entry.operation === 'verify')
      const listEntries = auditLog.filter(entry => entry.operation === 'list')

      expect(storeEntries.length).toBeGreaterThan(0)
      expect(verifyEntries.length).toBeGreaterThan(0)
      expect(listEntries.length).toBeGreaterThan(0)

      console.log('✅ Audit logging working correctly')
    })
  })
}) 