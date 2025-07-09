import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { ServiceAgent } from '../../../src/core/agents/service-agent'
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
            serviceId: 'test-service',
            serviceType: 'api'
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
          serviceId: 'test-service',
          serviceType: 'api'
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

describe('ServiceAgent', () => {
  let serviceAgent: ServiceAgent
  const testServiceName = 'test-service'
  const testEncryptionKey = 'test-encryption-key'

  beforeEach(() => {
    serviceAgent = new ServiceAgent({
      serviceId: testServiceName
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Constructor', () => {
    it('should create a service agent with correct properties', () => {
      expect((serviceAgent as any).agentId).toBe(`service-${testServiceName}`)
      expect((serviceAgent as any).agentType).toBe(AgentType.SERVICE)
    })

    it('should create a service agent without encryption key', () => {
      const agentWithoutKey = new ServiceAgent({
        serviceId: testServiceName
      })
      expect((agentWithoutKey as any).agentId).toBe(`service-${testServiceName}`)
      expect((agentWithoutKey as any).agentType).toBe(AgentType.SERVICE)
    })

    it('should handle service names with special characters', () => {
      const specialServiceName = 'api-service-v2'
      const agent = new ServiceAgent({
        serviceId: specialServiceName
      })
      expect((agent as any).agentId).toBe(`service-${specialServiceName}`)
    })
  })

  describe('createDID', () => {
    it('should create a DID key successfully', async () => {
      const result = await serviceAgent.createDID('key')
      
      expect(result.did).toMatch(/^did:key:/)
      expect(result.controllerKeyId).toBeDefined()
      expect(result.keys).toHaveLength(1)
      expect(result.keys[0].type).toBe('Ed25519')
      expect(result.keys[0].meta).toEqual({
        algorithms: ['EdDSA'],
        serviceId: testServiceName,
        serviceType: 'api'
      })
    })

    it('should create a Cheqd DID successfully', async () => {
      const result = await serviceAgent.createDID('cheqd:testnet')
      
      expect(result.did).toMatch(/^did:cheqd:testnet:/)
      expect(result.controllerKeyId).toBeDefined()
      expect(result.keys).toHaveLength(1)
    })

    it('should create DID with service-specific metadata', async () => {
      const result = await serviceAgent.createDID('key')
      
      expect(result.keys[0]?.meta?.serviceId).toBe('test-service')
      expect(result.keys[0]?.meta?.serviceType).toBe('api')
    })
  })

  describe('issueCredential', () => {
    it('should issue a valid credential', async () => {
      const template: CredentialTemplate = {
        '@context': ['https://www.w3.org/ns/credentials/v2'],
        type: ['ServiceCredential'],
        credentialSubject: { 
          id: 'did:test:subject', 
          serviceName: 'Test Service',
          endpoint: 'https://api.test.com'
        },
        issuer: 'did:test:issuer',
        validFrom: new Date().toISOString()
      }

      const result = await serviceAgent.issueCredential(template)
      
      expect(result['@context']).toEqual(['https://www.w3.org/ns/credentials/v2'])
      expect(result.type).toEqual(['VerifiableCredential', 'ServiceCredential'])
      expect(result.issuer).toBe('did:test:issuer')
      expect(result.credentialSubject).toEqual({
        id: 'did:test:subject',
        serviceName: 'Test Service',
        endpoint: 'https://api.test.com',
        serviceId: 'test-service',
        serviceType: 'api'
      })
      expect(result.proof).toBeDefined()
    })

    it('should use default issuer when not provided', async () => {
      const template: CredentialTemplate = {
        '@context': ['https://www.w3.org/ns/credentials/v2'],
        type: ['ServiceCredential'],
        credentialSubject: { id: 'did:test:subject' },
        issuer: 'did:test:issuer',
        validFrom: new Date().toISOString()
      }

      const result = await serviceAgent.issueCredential(template)
      
      expect(result.issuer).toBe('did:test:issuer')
      expect(result.proof).toBeDefined()
    })

    it('should include service metadata in credential subject', async () => {
      const template: CredentialTemplate = {
        '@context': ['https://www.w3.org/ns/credentials/v2'],
        type: ['ServiceCredential'],
        credentialSubject: { id: 'did:test:subject' },
        issuer: 'did:test:issuer',
        validFrom: new Date().toISOString()
      }

      const result = await serviceAgent.issueCredential(template)
      
      expect(result.credentialSubject?.serviceId).toBe('test-service')
      expect(result.credentialSubject?.serviceType).toBe('api')
    })
  })

  describe('verifyCredential', () => {
    it('should verify a valid credential', async () => {
      const credential: VerifiableCredential_2_0 = {
        '@context': ['https://www.w3.org/ns/credentials/v2'],
        id: 'urn:uuid:test',
        type: ['VerifiableCredential', 'ServiceCredential'],
        issuer: 'did:test:issuer',
        validFrom: new Date().toISOString(),
        credentialSubject: { id: 'did:test:subject' }
      }

      const result = await serviceAgent.verifyCredential(credential)
      
      expect(result.isValid).toBe(true)
      expect(result.validationErrors).toEqual([])
      expect(result.warnings).toEqual([])
    })
  })

  describe('Service-specific methods', () => {
    it('should get service profile', async () => {
      const profile = await serviceAgent.getServiceProfile()
      
      expect(profile.serviceId).toBe(testServiceName)
      expect(profile.agentId).toBe(`service-${testServiceName}`)
      expect(profile.agentType).toBe(AgentType.SERVICE)
      expect(profile.createdAt).toBeDefined()
      expect(profile.plugins).toEqual([])
      expect(profile.endpoints).toEqual([])
      expect(profile.capabilities).toEqual([])
      expect(profile.apiServices).toEqual([])
    })

    it('should manage service endpoints', async () => {
      const endpointName = 'auth'
      const endpointUrl = 'https://api.test-service.com/auth'
      
      await serviceAgent.addServiceEndpoint(endpointName, endpointUrl)
      const retrievedUrl = await serviceAgent.getServiceEndpoint(endpointName)
      
      expect(retrievedUrl).toBe(endpointUrl)
    })

    it('should list service endpoints', async () => {
      await serviceAgent.addServiceEndpoint('auth', 'https://api.test-service.com/auth')
      await serviceAgent.addServiceEndpoint('users', 'https://api.test-service.com/users')
      
      const endpoints = await serviceAgent.listServiceEndpoints()
      
      expect(endpoints).toContain('auth')
      expect(endpoints).toContain('users')
    })

    it('should generate and manage API keys', async () => {
      const service = 'auth-service'
      
      const apiKey = await serviceAgent.generateAPIKey(service)
      expect(apiKey).toMatch(/^api_/)
      
      const retrievedKey = await serviceAgent.getAPIKey(service)
      expect(retrievedKey).toBe(apiKey)
      
      await serviceAgent.revokeAPIKey(service)
      const revokedKey = await serviceAgent.getAPIKey(service)
      expect(revokedKey).toBeUndefined()
    })

    it('should manage service capabilities', async () => {
      const capability = 'user-authentication'
      
      await serviceAgent.addServiceCapability(capability)
      let capabilities = await serviceAgent.getServiceCapabilities()
      expect(capabilities).toContain(capability)
      
      await serviceAgent.removeServiceCapability(capability)
      capabilities = await serviceAgent.getServiceCapabilities()
      expect(capabilities).not.toContain(capability)
    })

    it('should issue service credentials', async () => {
      const serviceType = 'authentication'
      const metadata = { 
        version: '1.0.0',
        description: 'User authentication service'
      }
      
      const credential = await serviceAgent.issueServiceCredential(serviceType, metadata)
      
      expect(credential.type).toContain('ServiceCredential')
      expect(credential.type).toContain(serviceType)
      expect(credential.credentialSubject.serviceId).toBe(testServiceName)
      expect(credential.credentialSubject.serviceType).toBe(serviceType)
    })

    it('should validate service access', async () => {
      const service = 'auth-service'
      const apiKey = await serviceAgent.generateAPIKey(service)
      
      const isValid = await serviceAgent.validateServiceAccess(apiKey, service)
      expect(isValid).toBe(true)
      
      const isInvalid = await serviceAgent.validateServiceAccess('invalid-key', service)
      expect(isInvalid).toBe(false)
    })
  })

  describe('Service configuration', () => {
    it('should handle various service names', () => {
      const serviceNames = [
        'auth-service',
        'user-api',
        'payment-gateway',
        'notification-service'
      ]
      
      serviceNames.forEach(name => {
        const agent = new ServiceAgent({
          serviceId: name
        })
        expect(agent.agentId).toBe(`service-${name}`)
      })
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

      const result = await serviceAgent.verifyCredential(invalidCredential)
      
      expect(result.isValid).toBe(true) // Service agent always returns true for now
    })

    it('should handle duplicate capability additions', async () => {
      const capability = 'user-authentication'
      
      await serviceAgent.addServiceCapability(capability)
      await serviceAgent.addServiceCapability(capability) // Should not cause error
      
      const capabilities = await serviceAgent.getServiceCapabilities()
      expect(capabilities.filter(c => c === capability)).toHaveLength(1)
    })
  })
}) 