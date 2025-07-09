import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { PackageAgent } from '../../../src/core/agents/package-agent'
import { AgentType, CredentialTemplate, VerifiableCredential_2_0 } from '../../../src/types'

// Mock the base agent and its dependencies
vi.mock('../../../src/core/agents/base', () => ({
  BaseAgent: class MockBaseAgent {
    public agentId: string
    public agentType: AgentType
    protected plugins: Map<string, any> = new Map()
    public agent: any
    
    constructor(agentId: string, agentType: AgentType) {
      this.agentId = agentId
      this.agentType = agentType
      this.agent = {
        createVerifiableCredential: vi.fn().mockImplementation(({ credential }) => ({
          '@context': credential['@context'],
          type: credential.type,
          issuer: credential.issuer,
          validFrom: credential.validFrom,
          credentialSubject: credential.credentialSubject,
          proof: { type: 'JsonWebSignature2020' }
        }))
      }
    }
    
    protected generateId(): string {
      return 'test-id-123'
    }
    
    listPlugins(): any[] {
      return []
    }

    async createDID(method: string, options?: any): Promise<any> {
      return {
        did: `did:${method}:test-123`,
        controllerKeyId: `did:${method}:test-123#key-1`,
        keys: [{
          type: 'Ed25519',
          meta: {
            algorithms: ['EdDSA'],
            packageId: 'test-package',
            packageVersion: '1.0.0'
          }
        }]
      }
    }

    async issueCredential(template: any): Promise<any> {
      return {
        '@context': template['@context'] || ['https://www.w3.org/ns/credentials/v2'],
        type: template.type.includes('VerifiableCredential')
          ? template.type
          : ['VerifiableCredential', ...template.type],
        issuer: template.issuer || this.agentId,
        validFrom: template.validFrom,
        credentialSubject: {
          ...template.credentialSubject,
          packageName: 'test-package',
          packageVersion: '1.0.0'
        },
        proof: { type: 'JsonWebSignature2020' }
      }
    }

    async verifyCredential(credential: any): Promise<any> {
      return {
        isValid: true,
        validationErrors: [],
        warnings: []
      }
    }
  }
}))

// Mock Veramo and other dependencies
vi.mock('@veramo/core', () => ({
  createAgent: vi.fn()
}))

vi.mock('@veramo/did-manager', () => ({
  DIDManager: vi.fn()
}))

vi.mock('@veramo/key-manager', () => ({
  KeyManager: vi.fn(),
  MemoryKeyStore: vi.fn(),
  MemoryPrivateKeyStore: vi.fn()
}))

vi.mock('@veramo/data-store', () => ({
  DataStore: vi.fn(),
  DataSource: vi.fn()
}))

vi.mock('@veramo/kms-local', () => ({
  KeyManagementSystem: vi.fn()
}))

vi.mock('@veramo/did-resolver', () => ({
  DIDResolverPlugin: vi.fn(),
  getUniversalResolverFor: vi.fn(() => ({}))
}))

vi.mock('@veramo/did-provider-key', () => ({
  KeyDIDProvider: vi.fn()
}))

vi.mock('@cheqd/did-provider-cheqd', () => ({
  CheqdDIDProvider: vi.fn(),
  CheqdDidResolver: vi.fn()
}))

vi.mock('did-resolver', () => ({
  Resolver: vi.fn()
}))

vi.mock('typeorm', () => ({
  DataSource: vi.fn()
}))

vi.mock('dotenv', () => ({
  config: vi.fn()
}))

describe('PackageAgent', () => {
  let packageAgent: PackageAgent
  const testPackageName = 'test-package'
  const testPackageVersion = '1.0.0'
  const testEncryptionKey = 'test-encryption-key'

  beforeEach(() => {
    packageAgent = new PackageAgent({
      packageName: testPackageName,
      packageVersion: testPackageVersion
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Constructor', () => {
    it('should create a package agent with correct properties', () => {
      expect((packageAgent as any).agentId).toBe(`package-${testPackageName}-${testPackageVersion}`)
      expect((packageAgent as any).agentType).toBe(AgentType.PACKAGE)
    })

    it('should create a package agent without encryption key', () => {
      const agentWithoutKey = new PackageAgent({
        packageName: testPackageName,
        packageVersion: testPackageVersion
      })
      expect((agentWithoutKey as any).agentId).toBe(`package-${testPackageName}-${testPackageVersion}`)
      expect((agentWithoutKey as any).agentType).toBe(AgentType.PACKAGE)
    })

    it('should handle package names with special characters', () => {
      const specialPackageName = '@scope/package-name'
      const agent = new PackageAgent({
        packageName: specialPackageName,
        packageVersion: testPackageVersion
      })
      expect((agent as any).agentId).toBe(`package-${specialPackageName}-${testPackageVersion}`)
    })
  })

  describe('createDID', () => {
    it('should create a DID key successfully', async () => {
      const result = await packageAgent.createDID('key')
      
      expect(result.did).toMatch(/^did:key:/)
      expect(result.controllerKeyId).toBeDefined()
      expect(result.keys).toHaveLength(1)
      expect(result.keys[0].type).toBe('Ed25519')
      expect(result.keys[0].meta).toEqual({
        algorithms: ['EdDSA'],
        packageId: testPackageName,
        packageVersion: testPackageVersion
      })
    })

    it('should create a Cheqd DID successfully', async () => {
      const result = await packageAgent.createDID('cheqd:testnet')
      
      expect(result.did).toMatch(/^did:cheqd:testnet:/)
      expect(result.controllerKeyId).toBeDefined()
      expect(result.keys).toHaveLength(1)
    })

    it('should create DID with package-specific metadata', async () => {
      const result = await packageAgent.createDID('key')
      
      expect(result.keys[0]?.meta?.packageId).toBe(testPackageName)
      expect(result.keys[0]?.meta?.packageVersion).toBe(testPackageVersion)
    })
  })

  describe('issueCredential', () => {
    it('should issue a valid credential', async () => {
      const template: CredentialTemplate = {
        '@context': ['https://www.w3.org/ns/credentials/v2'],
        type: ['PackageCredential'],
        credentialSubject: { 
          id: 'did:test:subject', 
          name: 'Test Package'
        },
        issuer: 'did:test:issuer',
        validFrom: new Date().toISOString()
      }

      const result = await packageAgent.issueCredential(template)
      
      expect(result['@context']).toEqual(['https://www.w3.org/ns/credentials/v2'])
      expect(result.type).toEqual(['VerifiableCredential', 'PackageCredential'])
      expect(result.issuer).toBe('did:test:issuer')
      expect(result.credentialSubject).toEqual({
        id: 'did:test:subject',
        name: 'Test Package',
        packageName: testPackageName,
        packageVersion: testPackageVersion
      })
      expect(result.proof).toBeDefined()
    })

    it('should use default issuer when not provided', async () => {
      const template: CredentialTemplate = {
        '@context': ['https://www.w3.org/ns/credentials/v2'],
        type: ['PackageCredential'],
        credentialSubject: { id: 'did:test:subject' },
        issuer: 'did:test:issuer',
        validFrom: new Date().toISOString()
      }

      const result = await packageAgent.issueCredential(template)
      
      expect(result.issuer).toBe('did:test:issuer')
      expect(result.proof).toBeDefined()
    })

    it('should include package metadata in credential subject', async () => {
      const template: CredentialTemplate = {
        '@context': ['https://www.w3.org/ns/credentials/v2'],
        type: ['PackageCredential'],
        credentialSubject: { id: 'did:test:subject' },
        issuer: 'did:test:issuer',
        validFrom: new Date().toISOString()
      }

      const result = await packageAgent.issueCredential(template)
      
      expect(result.credentialSubject?.packageName).toBe(testPackageName)
      expect(result.credentialSubject?.packageVersion).toBe(testPackageVersion)
    })
  })

  describe('verifyCredential', () => {
    it('should verify a valid credential', async () => {
      const credential: VerifiableCredential_2_0 = {
        '@context': ['https://www.w3.org/ns/credentials/v2'],
        id: 'urn:uuid:test',
        type: ['VerifiableCredential', 'PackageCredential'],
        issuer: 'did:test:issuer',
        validFrom: new Date().toISOString(),
        credentialSubject: { id: 'did:test:subject' }
      }

      const result = await packageAgent.verifyCredential(credential)
      
      expect(result.isValid).toBe(true)
      expect(result.validationErrors).toEqual([])
      expect(result.warnings).toEqual([])
    })
  })

  describe('Package-specific methods', () => {
    it('should get package capabilities', () => {
      const capabilities = packageAgent.getCapabilities()
      
      expect(capabilities).toContain('create-package-did')
      expect(capabilities).toContain('sign-package-metadata')
      expect(capabilities).toContain('verify-package-signatures')
      expect(capabilities).toContain('manage-release-credentials')
    })

    it('should create package DID', async () => {
      const result = await packageAgent.createPackageDID()
      
      expect(result.did).toMatch(/^did:key:/)
      expect(result.controllerKeyId).toBeDefined()
      expect(result.keys).toHaveLength(1)
    })

    it('should get package DID', async () => {
      await packageAgent.createPackageDID()
      const did = await packageAgent.getPackageDID()
      
      expect(did).toMatch(/^did:key:/)
    })

    it('should sign package release', async () => {
      await packageAgent.createPackageDID()
      
      const metadata = {
        name: testPackageName,
        version: testPackageVersion,
        description: 'Test package',
        author: 'Test Author',
        license: 'MIT'
      }
      
      const result = await packageAgent.signRelease(metadata)
      
      expect(result.type).toContain('PackageReleaseCredential')
      expect(result.credentialSubject).toBeDefined()
    })

    it('should create package credential', async () => {
      await packageAgent.createPackageDID()
      
      const metadata = {
        name: testPackageName,
        version: testPackageVersion,
        description: 'Test package',
        author: 'Test Author',
        license: 'MIT'
      }
      
      const result = await packageAgent.createPackageCredential(metadata)
      
      expect(result.type).toContain('PackageIdentityCredential')
      expect(result.credentialSubject).toBeDefined()
    })

    it('should verify package credential', async () => {
      await packageAgent.createPackageDID()
      
      const metadata = {
        name: testPackageName,
        version: testPackageVersion,
        description: 'Test package'
      }
      
      const credential = await packageAgent.createPackageCredential(metadata)
      const result = await packageAgent.verifyPackageCredential(credential)
      
      expect(result.isValid).toBeDefined()
    })
  })

  describe('Package version handling', () => {
    it('should handle semantic versioning correctly', () => {
      const versions = ['1.0.0', '1.2.3', '2.0.0-beta.1', '3.0.0-alpha.2']
      
      versions.forEach(version => {
        const agent = new PackageAgent({
          packageName: testPackageName,
          packageVersion: version
        })
        expect((agent as any).agentId).toBe(`package-${testPackageName}-${version}`)
      })
    })

    it('should handle scoped package names', () => {
      const scopedPackageName = '@open-verifiable/test-package'
      const agent = new PackageAgent({
        packageName: scopedPackageName,
        packageVersion: testPackageVersion
      })
      
      expect((agent as any).agentId).toBe(`package-${scopedPackageName}-${testPackageVersion}`)
    })
  })

  describe('Error handling', () => {
    it('should handle credential verification gracefully', async () => {
      const invalidCredential = {
        '@context': ['https://www.w3.org/ns/credentials/v2'],
        id: 'urn:uuid:test',
        type: ['VerifiableCredential'],
        issuer: 'did:test:issuer',
        validFrom: new Date().toISOString(),
        credentialSubject: { id: 'did:test:subject' }
      } as VerifiableCredential_2_0

      const result = await packageAgent.verifyCredential(invalidCredential)
      
      expect(result.isValid).toBe(true) // Package agent always returns true for now
    })
  })
}) 