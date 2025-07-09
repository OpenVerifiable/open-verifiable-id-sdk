/**
 * CredentialKeyManager Tests
 * 
 * Tests the integration of key management with credential operations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  CredentialKeyManager,
  CredentialKeyBundle,
  KeyExportOptions,
  KeyImportOptions,
  CrossDeviceSyncData
} from '../../src/core/credentialing/key-manager'
import {
  VerifiableCredential_2_0,
  SecureStorage,
  OvIdAgent,
  CredentialTemplate,
  AgentType,
  ValidationResult,
  AccessLogEntry
} from '../../src/types'

// Mock SecureStorage
class MockSecureStorage implements SecureStorage {
  private credentials = new Map<string, VerifiableCredential_2_0>()
  private keys = new Map<string, string>()
  private recoveryPhrases = new Map<string, string>()
  private accessLog: AccessLogEntry[] = []

  async storeCredential(credentialId: string, credential: VerifiableCredential_2_0): Promise<void> {
    this.credentials.set(credentialId, credential)
  }

  async retrieveCredential(credentialId: string): Promise<VerifiableCredential_2_0 | null> {
    return this.credentials.get(credentialId) || null
  }

  async deleteCredential(credentialId: string): Promise<void> {
    this.credentials.delete(credentialId)
  }

  async storeKey(keyId: string, privateKey: Uint8Array): Promise<void> {
    this.keys.set(keyId, Buffer.from(privateKey).toString('base64'))
  }

  async retrieveKey(keyId: string): Promise<Uint8Array | null> {
    const key = this.keys.get(keyId)
    return key ? Buffer.from(key, 'base64') : null
  }

  async deleteKey(keyId: string): Promise<void> {
    this.keys.delete(keyId)
  }

  async exportKey(keyId: string, format: 'base64' | 'hex'): Promise<string> {
    const key = this.keys.get(keyId)
    if (!key) throw new Error(`Key not found: ${keyId}`)
    
    if (format === 'hex') {
      return Buffer.from(key, 'base64').toString('hex')
    }
    return key
  }

  async importKey(keyId: string, key: string, format: 'base64' | 'hex'): Promise<void> {
    if (format === 'hex') {
      const buffer = Buffer.from(key, 'hex')
      this.keys.set(keyId, buffer.toString('base64'))
    } else {
      this.keys.set(keyId, key)
    }
  }

  async exportRecoveryPhrase(keyId: string, format: 'base64' | 'hex'): Promise<string> {
    const phrase = this.recoveryPhrases.get(keyId)
    if (!phrase) throw new Error(`Recovery phrase not found: ${keyId}`)
    
    if (format === 'hex') {
      return Buffer.from(phrase, 'base64').toString('hex')
    }
    return phrase
  }

  async importRecoveryPhrase(keyId: string, phrase: string, format: 'base64' | 'hex'): Promise<void> {
    if (format === 'hex') {
      const buffer = Buffer.from(phrase, 'hex')
      this.recoveryPhrases.set(keyId, buffer.toString('base64'))
    } else {
      this.recoveryPhrases.set(keyId, phrase)
    }
  }

  async exportBackup(passphrase: string): Promise<string> {
    return 'mock-backup-data'
  }

  async importBackup(data: string, passphrase: string): Promise<void> {
    // Mock implementation
  }

  async rotateEncryptionKey(oldPassphrase: string, newPassphrase: string): Promise<void> {
    // Mock implementation
  }

  async getAccessLog(): Promise<AccessLogEntry[]> {
    return this.accessLog
  }

  async clear(): Promise<void> {
    this.credentials.clear()
    this.keys.clear()
    this.recoveryPhrases.clear()
    this.accessLog = []
  }

  // Add test helper methods
  addMockKey(keyId: string, key: string) {
    this.keys.set(keyId, key)
  }

  addMockRecoveryPhrase(keyId: string, phrase: string) {
    this.recoveryPhrases.set(keyId, phrase)
  }
}

// Mock Agent
class MockAgent implements OvIdAgent {
  readonly id = 'did:example:agent'
  readonly agentId = 'did:example:agent'
  readonly agentType = AgentType.USER

  getType(): string {
    return 'mock'
  }

  async issueCredential(template: CredentialTemplate): Promise<VerifiableCredential_2_0> {
    return {
      '@context': template['@context'],
      id: `urn:uuid:mock-${Date.now()}`,
      type: template.type,
      issuer: template.issuer || this.id,
      validFrom: new Date().toISOString(),
      credentialSubject: template.credentialSubject
    }
  }

  async verifyCredential(credential: VerifiableCredential_2_0): Promise<ValidationResult> {
    return {
      isValid: true,
      validationErrors: [],
      warnings: []
    }
  }

  // Other required methods
  async getCredential(id: string): Promise<VerifiableCredential_2_0 | null> { return null }
  async storeCredential(credential: VerifiableCredential_2_0): Promise<void> {}
  async deleteCredential(id: string): Promise<void> {}
  async listCredentials(): Promise<VerifiableCredential_2_0[]> { return [] }
  async initialize(): Promise<void> {}
  async cleanup(): Promise<void> {}
  async destroy(): Promise<void> {}
  registerPlugin(): void {}
  getPlugin(): undefined { return undefined }
  listPlugins(): [] { return [] }
}

// Helper functions
// Counter to ensure unique credential IDs in tests
let credentialIdCounter = 0

function createMockCredential(issuer = 'did:example:issuer'): VerifiableCredential_2_0 {
  credentialIdCounter++
  return {
    '@context': ['https://www.w3.org/ns/credentials/v2'],
    id: `urn:uuid:test-${credentialIdCounter}`,
    type: ['VerifiableCredential', 'TestCredential'],
    issuer,
    validFrom: new Date().toISOString(),
    credentialSubject: {
      id: 'did:example:subject',
      testProperty: 'testValue'
    }
  }
}

function createExportOptions(overrides: Partial<KeyExportOptions> = {}): KeyExportOptions {
  return {
    includePrivateKey: true,
    includeRecoveryPhrase: false,
    format: 'base64',
    encrypt: false,
    ...overrides
  }
}

function createImportOptions(overrides: Partial<KeyImportOptions> = {}): KeyImportOptions {
  return {
    format: 'base64',
    encrypted: false,
    validate: true,
    ...overrides
  }
}

describe('CredentialKeyManager', () => {
  let storage: MockSecureStorage
  let agent: MockAgent
  let keyManager: CredentialKeyManager

  beforeEach(async () => {
    storage = new MockSecureStorage()
    await storage.clear() // Ensure clean state
    agent = new MockAgent()
    keyManager = new CredentialKeyManager(storage, agent)
  })

  describe('exportCredentialBundle', () => {
    it('should export a credential bundle with keys', async () => {
      // Setup
      const credential = createMockCredential()
      await storage.storeCredential(credential.id, credential)
      
      const keyId = `${credential.issuer}#key-1`
      storage.addMockKey(keyId, 'mock-private-key-base64')
      
      const exportOptions = createExportOptions()

      // Execute
      const bundle = await keyManager.exportCredentialBundle(credential.id, exportOptions)

      // Verify
      expect(bundle.credential).toEqual(credential)
      expect(bundle.keyData.keyId).toBe(keyId)
      expect(bundle.keyData.privateKey).toBe('mock-private-key-base64')
      expect(bundle.metadata.bundleId).toMatch(/^bundle:/)
      expect(bundle.metadata.issuerDID).toBe(credential.issuer)
      expect(bundle.metadata.subjectDID).toBe(credential.credentialSubject.id)
    })

    it('should handle missing credentials', async () => {
      const exportOptions = createExportOptions()

      await expect(
        keyManager.exportCredentialBundle('non-existent-id', exportOptions)
      ).rejects.toThrow('Credential not found: non-existent-id')
    })

    it('should export with recovery phrase when requested', async () => {
      // Setup
      const credential = createMockCredential()
      await storage.storeCredential(credential.id, credential)
      
      const keyId = `${credential.issuer}#key-1`
      storage.addMockKey(keyId, 'mock-private-key-base64')
      storage.addMockRecoveryPhrase(keyId, 'mock-recovery-phrase')
      
      const exportOptions = createExportOptions({ includeRecoveryPhrase: true })

      // Execute
      const bundle = await keyManager.exportCredentialBundle(credential.id, exportOptions)

      // Verify
      expect(bundle.keyData.recoveryPhrase).toBe('mock-recovery-phrase')
    })
  })

  describe('importCredentialBundle', () => {
    it('should import a credential bundle and restore keys', async () => {
      // Setup
      const credential = createMockCredential()
      const bundle: CredentialKeyBundle = {
        credential,
        keyData: {
          keyId: `${credential.issuer}#key-1`,
          publicKey: 'mock-public-key',
          privateKey: 'mock-private-key-base64'
        },
        metadata: {
          bundleId: 'test-bundle-123',
          created: new Date().toISOString(),
          issuerDID: credential.issuer as string,
          subjectDID: credential.credentialSubject.id,
          format: 'base64',
          encrypted: false
        }
      }
      
      const importOptions = createImportOptions()

      // Execute
      await keyManager.importCredentialBundle(bundle, importOptions)

      // Verify
      const storedCredential = await storage.retrieveCredential(credential.id)
      expect(storedCredential).toEqual(credential)
      
      const retrievedKey = await storage.exportKey(bundle.keyData.keyId, 'base64')
      expect(retrievedKey).toBe('mock-private-key-base64')
    })

    it('should validate bundle when requested', async () => {
      // Setup invalid bundle
      const invalidBundle = {
        credential: null,
        keyData: {},
        metadata: {}
      } as any

      const importOptions = createImportOptions({ validate: true })

      // Execute & Verify
      await expect(
        keyManager.importCredentialBundle(invalidBundle, importOptions)
      ).rejects.toThrow('Invalid bundle structure')
    })
  })

  describe('createCrossDeviceSyncData', () => {
    it('should create sync data with multiple credential bundles', async () => {
      // Setup
      const credential1 = createMockCredential('did:example:issuer1')
      const credential2 = createMockCredential('did:example:issuer2')
      
      await storage.storeCredential(credential1.id, credential1)
      await storage.storeCredential(credential2.id, credential2)
      
      storage.addMockKey(`${credential1.issuer}#key-1`, 'key1-data')
      storage.addMockKey(`${credential2.issuer}#key-1`, 'key2-data')
      
      const credentialIds = [credential1.id, credential2.id]
      const exportOptions = createExportOptions()

      // Execute
      const syncData = await keyManager.createCrossDeviceSyncData(
        credentialIds,
        'device-123',
        exportOptions
      )

      // Verify
      expect(syncData.bundles).toHaveLength(2)
      expect(syncData.metadata.sourceDeviceId).toBe('device-123')
      expect(syncData.metadata.totalBundles).toBe(2)
      expect(syncData.metadata.syncId).toMatch(/^sync:/)
    })

    it('should handle partial failures gracefully', async () => {
      // Setup - only one valid credential
      const credential = createMockCredential()
      await storage.storeCredential(credential.id, credential)
      storage.addMockKey(`${credential.issuer}#key-1`, 'key-data')
      
      const credentialIds = [credential.id, 'non-existent-id']
      const exportOptions = createExportOptions()

      // Execute
      const syncData = await keyManager.createCrossDeviceSyncData(
        credentialIds,
        'device-123',
        exportOptions
      )

      // Verify - should only include the valid credential
      expect(syncData.bundles).toHaveLength(1)
      expect(syncData.metadata.totalBundles).toBe(1)
    })
  })

  describe('importCrossDeviceSyncData', () => {
    it('should import all bundles in sync data', async () => {
      // Setup
      const credential1 = createMockCredential('did:example:issuer1')
      const credential2 = createMockCredential('did:example:issuer2')
      
      const syncData: CrossDeviceSyncData = {
        bundles: [
          {
            credential: credential1,
            keyData: {
              keyId: `${credential1.issuer}#key-1`,
              publicKey: 'pub1',
              privateKey: 'priv1'
            },
            metadata: {
              bundleId: 'bundle1',
              created: new Date().toISOString(),
              issuerDID: credential1.issuer as string,
              subjectDID: credential1.credentialSubject.id,
              format: 'base64',
              encrypted: false
            }
          },
          {
            credential: credential2,
            keyData: {
              keyId: `${credential2.issuer}#key-1`,
              publicKey: 'pub2',
              privateKey: 'priv2'
            },
            metadata: {
              bundleId: 'bundle2',
              created: new Date().toISOString(),
              issuerDID: credential2.issuer as string,
              subjectDID: credential2.credentialSubject.id,
              format: 'base64',
              encrypted: false
            }
          }
        ],
        metadata: {
          sourceDeviceId: 'device-source',
          syncId: 'sync-123',
          timestamp: new Date().toISOString(),
          totalBundles: 2
        }
      }

      const importOptions = createImportOptions({ validate: false })

      // Execute
      await keyManager.importCrossDeviceSyncData(syncData, 'device-target', importOptions)

      // Verify
      const storedCred1 = await storage.retrieveCredential(credential1.id)
      const storedCred2 = await storage.retrieveCredential(credential2.id)
      expect(storedCred1).toEqual(credential1)
      expect(storedCred2).toEqual(credential2)
      
      const key1 = await storage.exportKey(`${credential1.issuer}#key-1`, 'base64')
      const key2 = await storage.exportKey(`${credential2.issuer}#key-1`, 'base64')
      expect(key1).toBe('priv1')
      expect(key2).toBe('priv2')
    })
  })

  describe('issueAndBundleCredential', () => {
    it('should issue a credential and create an exportable bundle', async () => {
      // Setup
      const template: CredentialTemplate = {
        '@context': ['https://www.w3.org/ns/credentials/v2'],
        type: ['VerifiableCredential', 'TestCredential'],
        issuer: agent.id,
        credentialSubject: {
          id: 'did:example:subject',
          testProperty: 'testValue'
        }
      }
      
      const exportOptions = createExportOptions()

      // Mock key for the agent's DID
      storage.addMockKey(`${agent.id}#key-1`, 'agent-private-key')

      // Execute
      const bundle = await keyManager.issueAndBundleCredential(template, exportOptions)

      // Verify
      expect(bundle.credential.type).toEqual(template.type)
      expect(bundle.credential.issuer).toBe(agent.id)
      expect(bundle.keyData.keyId).toBe(`${agent.id}#key-1`)
      
      // Verify credential was stored
      const storedCredential = await storage.retrieveCredential(bundle.credential.id)
      expect(storedCredential).toEqual(bundle.credential)
    })

    it('should fail when no agent is configured', async () => {
      // Setup key manager without agent
      const keyManagerNoAgent = new CredentialKeyManager(storage)
      const template: CredentialTemplate = {
        '@context': ['https://www.w3.org/ns/credentials/v2'],
        type: ['VerifiableCredential'],
        issuer: 'did:example:issuer',
        credentialSubject: { id: 'did:example:subject' }
      }
      const exportOptions = createExportOptions()

      // Execute & Verify
      await expect(
        keyManagerNoAgent.issueAndBundleCredential(template, exportOptions)
      ).rejects.toThrow('Agent required for credential issuance')
    })
  })

  describe('getCredentialKeyAuditLog', () => {
    it('should return filtered audit log for credential operations', async () => {
      // This test demonstrates the interface but actual audit logging
      // would need to be implemented in the storage layer
      const auditLog = await keyManager.getCredentialKeyAuditLog()
      expect(Array.isArray(auditLog)).toBe(true)
    })
  })
}) 