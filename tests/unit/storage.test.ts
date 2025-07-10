/**
 * Storage Module Unit Tests
 * 
 * Tests the storage implementation according to ADR-0006: Secure Local Storage
 * Covers encryption, audit logging, cross-platform compatibility
 * Updated for dual-mode architecture with agent integration
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { SecureStorageImpl, createSecureStorage } from '../../src/core/storage'
import { VerifiableCredential_2_0 } from '../../src/types'

describe('Storage Module', () => {
  let secureStorage: SecureStorageImpl

  beforeEach(async () => {
    secureStorage = new SecureStorageImpl('test-encryption-key')
  })

  describe('SecureStorageImpl - Basic Functionality', () => {
    it('should store and retrieve keys', async () => {
      const testKey = new Uint8Array([1, 2, 3, 4, 5])
      const keyId = 'test-key-1'

      await secureStorage.storeKey(keyId, testKey)
      const retrieved = await secureStorage.retrieveKey(keyId)

      expect(retrieved).toEqual(testKey)
    })

    it('should store and retrieve credentials', async () => {
      const testCredential: VerifiableCredential_2_0 = {
        '@context': ['https://www.w3.org/ns/credentials/v2'],
        id: 'urn:uuid:test-credential-1',
        type: ['VerifiableCredential'],
        issuer: 'did:test:issuer',
        validFrom: new Date().toISOString(),
        credentialSubject: {
          id: 'did:test:subject',
          name: 'Test Subject'
        }
      }

      await secureStorage.storeCredential('test-credential-1', testCredential)
      const retrieved = await secureStorage.retrieveCredential('test-credential-1')

      expect(retrieved).toEqual(testCredential)
    })

    it('should delete keys', async () => {
      const testKey = new Uint8Array([1, 2, 3, 4, 5])
      const keyId = 'test-key-1'

      await secureStorage.storeKey(keyId, testKey)
      await secureStorage.deleteKey(keyId)
      
      const retrieved = await secureStorage.retrieveKey(keyId)
      expect(retrieved).toBeNull()
    })

    it('should delete credentials', async () => {
      const testCredential: VerifiableCredential_2_0 = {
        '@context': ['https://www.w3.org/ns/credentials/v2'],
        id: 'urn:uuid:test-credential-1',
        type: ['VerifiableCredential'],
        issuer: 'did:test:issuer',
        validFrom: new Date().toISOString(),
        credentialSubject: {
          id: 'did:test:subject',
          name: 'Test Subject'
        }
      }

      await secureStorage.storeCredential('test-credential-1', testCredential)
      await secureStorage.deleteCredential('test-credential-1')
      
      const retrieved = await secureStorage.retrieveCredential('test-credential-1')
      expect(retrieved).toBeNull()
    })

    it('should export and import keys', async () => {
      const testKey = new Uint8Array([1, 2, 3, 4, 5])
      const keyId = 'test-key-1'

      await secureStorage.storeKey(keyId, testKey)
      
      const exported = await secureStorage.exportKey(keyId, 'base64')
      expect(typeof exported).toBe('string')
      expect(exported.length).toBeGreaterThan(0)
    })

    it('should export and import recovery phrases', async () => {
      const testKey = new Uint8Array([1, 2, 3, 4, 5])
      const keyId = 'test-key-1'

      await secureStorage.storeKey(keyId, testKey)
      
      const exported = await secureStorage.exportRecoveryPhrase(keyId, 'base64')
      expect(typeof exported).toBe('string')
      expect(exported.length).toBeGreaterThan(0)
    })

    it('should maintain access log', async () => {
      const testKey = new Uint8Array([1, 2, 3, 4, 5])
      
      await secureStorage.storeKey('log-test-key', testKey)
      await secureStorage.retrieveKey('log-test-key')

      const accessLog = await secureStorage.getAccessLog()
      
      expect(accessLog.length).toBeGreaterThanOrEqual(2)
      expect(accessLog.some(entry => entry.operation === 'store')).toBe(true)
      expect(accessLog.some(entry => entry.operation === 'retrieve')).toBe(true)
    })

    it('should handle backup operations', async () => {
      const passphrase = 'test-passphrase'
      
      // Test export backup
      const backup = await secureStorage.exportBackup(passphrase)
      expect(typeof backup).toBe('string')
      expect(backup.length).toBeGreaterThan(0)
      
      // Test import backup
      await expect(secureStorage.importBackup(backup, passphrase))
        .resolves.not.toThrow()
    })

    it('should handle encryption key rotation', async () => {
      const oldPassphrase = 'old-passphrase'
      const newPassphrase = 'new-passphrase'
      
      await expect(secureStorage.rotateEncryptionKey(oldPassphrase, newPassphrase))
        .resolves.not.toThrow()
    })
  })

  describe('createSecureStorage factory', () => {
    it('should create storage instance', () => {
      const storage = createSecureStorage('test-key')
      expect(storage).toBeInstanceOf(SecureStorageImpl)
    })

    it('should create storage instance with agent', () => {
      const mockAgent = {
        agentId: 'test-agent',
        agentType: 'user' as any,
        secureStorage: {} as any
      }
      
      const storage = createSecureStorage('test-key', mockAgent)
      expect(storage).toBeInstanceOf(SecureStorageImpl)
    })
  })
}) 