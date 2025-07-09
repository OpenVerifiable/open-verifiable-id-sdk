/**
 * DID Module Unit Tests
 * 
 * Tests the DID management implementation according to ADR-0001: W3C VC 2.0 Migration
 * Covers DID creation, resolution, signing, and verification
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DIDManagerImpl, createDIDManager } from '../../src/core/did'
import { InMemoryStorage } from '../../src/core/storage/memory'
import { DIDCreationOptions, DIDDocument_2_0, VerifiableCredential_2_0 } from '../../src/types'

describe('DID Module', () => {
  let didManager: DIDManagerImpl
  let mockStorage: InMemoryStorage

  beforeEach(() => {
    mockStorage = new InMemoryStorage()
    
    // Create a mock agent for DID operations
    const mockAgent = {
      agentId: 'test-agent',
      agentType: 'user' as any,
      secureStorage: mockStorage,
      createDID: vi.fn().mockImplementation(async (method: string, options: any) => {
        // Mock DID creation for different methods
        if (method === 'unsupported') {
          throw new Error('Unsupported DID method: unsupported')
        }
        const didId = `did:${method}:test-${Date.now()}`
        return {
          did: didId,
          keys: [{
            kid: `${didId}#key-1`,
            type: 'Ed25519',
            publicKeyHex: 'test-public-key'
          }]
        }
      }),
      issueCredential: vi.fn(),
      verifyCredential: vi.fn(),
      initialize: vi.fn(),
      cleanup: vi.fn(),
      destroy: vi.fn(),
      registerPlugin: vi.fn(),
      getPlugin: vi.fn(),
      listPlugins: vi.fn(),
      keyManager: {
        generateKey: vi.fn().mockResolvedValue('test-key-id'),
        exportKey: vi.fn().mockResolvedValue('test-public-key'),
        sign: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4, 5])),
        verify: vi.fn().mockResolvedValue(true)
      } as any
    }
    
    didManager = new DIDManagerImpl(mockStorage, mockAgent)
  })

  describe('DIDManagerImpl - Basic Functionality', () => {
    it('should create a DID with key method', async () => {
      const options: DIDCreationOptions = {
        keyType: 'Ed25519',
        alias: 'test-did'
      }

      const result = await didManager.createDID('key', options)

      expect(result.did).toMatch(/^did:key:/)
      expect(result.document).toBeDefined()
      expect(result.document.id).toBe(result.did)
      expect(result.keyId).toBeDefined()
      expect(result.keyId).toMatch(/^did:key:.*#key-1$/)
      expect(result.credential).toBeDefined()
      expect(result.recoveryPhrase).toBeDefined()
    })

    it('should create a DID with web method', async () => {
      const options: DIDCreationOptions = {
        keyType: 'Ed25519',
        alias: 'test-web-did'
      }

      const result = await didManager.createDID('web', options)

      expect(result.did).toMatch(/^did:web:/)
      expect(result.document).toBeDefined()
      expect(result.document.id).toBe(result.did)
      expect(result.keyId).toMatch(/^did:web:.*#key-1$/)
    })

    it('should reject unsupported DID methods', async () => {
      const options: DIDCreationOptions = {
        keyType: 'Ed25519'
      }

      await expect(didManager.createDID('unsupported', options))
        .rejects.toThrow('Unsupported DID method: unsupported')
    })

    it('should import a DID', async () => {
      const testDID = 'did:key:test123'
      const testPrivateKey = new Uint8Array([1, 2, 3, 4, 5])

      const result = await didManager.importDID({
        did: testDID,
        privateKey: testPrivateKey,
        method: 'key'
      })

      expect(result.did).toBe(testDID)
      expect(result.document).toBeDefined()
      expect(result.credential).toBeDefined()
      expect(result.verified).toBe(true)
    })

    it('should resolve a DID', async () => {
      const testDID = 'did:key:test123'

      const result = await didManager.resolveDID(testDID)

      expect(result).toBeDefined()
      expect(result?.id).toBe(testDID)
    })

    it('should sign data with a DID', async () => {
      const testDID = 'did:key:test123'
      const testData = new Uint8Array([1, 2, 3, 4, 5])

      const result = await didManager.signWithDID(testDID, testData)

      expect(result.type).toBe('DataIntegrityProof')
      expect(result.cryptosuite).toBeDefined()
      expect(result.created).toBeDefined()
      expect(result.verificationMethod).toBeDefined()
      expect(result.proofPurpose).toBe('assertionMethod')
      expect(result.proofValue).toBeDefined()
    })

    it('should verify data with a DID', async () => {
      const testDID = 'did:key:test123'
      const testData = new Uint8Array([1, 2, 3, 4, 5])

      // First sign the data
      const proof = await didManager.signWithDID(testDID, testData)

      // Then verify it
      const isValid = await didManager.verifyWithDID(testDID, testData, proof)

      expect(isValid).toBe(true)
    })

    it('should list DIDs', async () => {
      const dids = await didManager.listDIDs()
      expect(Array.isArray(dids)).toBe(true)
    })

    it('should delete a DID', async () => {
      const testDID = 'did:key:test123'

      await expect(didManager.deleteDID(testDID))
        .resolves.not.toThrow()
    })

    it('should create a DID with cheqd method (testnet)', async () => {
      const options: DIDCreationOptions = {
        keyType: 'Ed25519',
        alias: 'test-cheqd-did',
        network: 'testnet'
      }

      const result = await didManager.createDID('cheqd', options)

      expect(result.did).toMatch(/^did:cheqd:testnet:/)
      expect(result.document.id).toBe(result.did)
    })

    it('should resolve the same DID from cache', async () => {
      const options: DIDCreationOptions = {}
      const { did } = await didManager.createDID('key', options)
      const first = await didManager.resolveDID(did)
      const second = await didManager.resolveDID(did)
      // second should come from cache, but same reference isn't necessary; validate equality
      expect(first?.id).toBe(second?.id)
    })
  })

  describe('createDIDManager factory', () => {
    it('should create DID manager instance', () => {
      const manager = createDIDManager(mockStorage)
      expect(manager).toBeInstanceOf(DIDManagerImpl)
    })

    it('should create DID manager with agent', () => {
      const mockAgent = {
        agentId: 'test-agent',
        agentType: 'user' as any,
        secureStorage: mockStorage,
        createDID: vi.fn(),
        issueCredential: vi.fn(),
        verifyCredential: vi.fn(),
        initialize: vi.fn(),
        cleanup: vi.fn(),
        destroy: vi.fn(),
        registerPlugin: vi.fn(),
        getPlugin: vi.fn(),
        listPlugins: vi.fn(),
        keyManager: {} as any
      }
      
      const manager = createDIDManager(mockStorage, mockAgent)
      expect(manager).toBeInstanceOf(DIDManagerImpl)
    })
  })

  describe('DID Document Structure', () => {
    it('should create valid DID document structure', async () => {
      const options: DIDCreationOptions = {
        keyType: 'Ed25519'
      }

      const result = await didManager.createDID('key', options)
      const document = result.document

      expect(document['@context']).toContain('https://www.w3.org/ns/did/v1')
      expect(document.id).toBe(result.did)
      expect(document.verificationMethod).toBeDefined()
      expect(Array.isArray(document.verificationMethod)).toBe(true)
      expect(document.authentication).toBeDefined()
      expect(Array.isArray(document.authentication)).toBe(true)
      expect(document.assertionMethod).toBeDefined()
      expect(Array.isArray(document.assertionMethod)).toBe(true)
    })
  })

  describe('Credential Creation', () => {
    it('should create DID assertion credential', async () => {
      const options: DIDCreationOptions = {
        keyType: 'Ed25519'
      }

      const result = await didManager.createDID('key', options)
      const credential = result.credential

      expect(credential['@context']).toContain('https://www.w3.org/ns/credentials/v2')
      expect(credential.type).toContain('VerifiableCredential')
      expect(credential.type).toContain('DIDCreationCredential')
      expect(credential.issuer).toBe(result.did)
      expect(credential.validFrom).toBeDefined()
      expect(credential.credentialSubject).toBeDefined()
      expect(credential.credentialSubject.id).toBe(result.did)
    })
  })
}) 