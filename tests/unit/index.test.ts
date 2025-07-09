import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  createUserAgent,
  createPackageAgent,
  createParentAgent,
  createServiceAgent,
  createCredentialTemplate,
  validateCredentialStructure,
  getSDKInfo
} from '../../src/index'
import { AgentType } from '../../src/types'

// Mock the agent classes
vi.mock('../../src/core/agents/user-agent', () => ({
  UserAgent: class MockUserAgent {
    public agentId: string
    public agentType: AgentType = AgentType.USER
    public encryptionKey?: string

    constructor(userId: string, encryptionKey?: string) {
      this.agentId = `user-${userId}`
      this.encryptionKey = encryptionKey
    }

    async initialize(): Promise<void> {
      // Mock implementation
    }
  }
}))

vi.mock('../../src/core/agents/package-agent', () => ({
  PackageAgent: class MockPackageAgent {
    public agentId: string
    public agentType: AgentType = AgentType.PACKAGE
    public version: string
    public encryptionKey?: string

    constructor(packageName: string, version: string, encryptionKey?: string) {
      this.agentId = `package-${packageName}`
      this.version = version
      this.encryptionKey = encryptionKey
    }

    async initialize(): Promise<void> {
      // Mock implementation
    }
  }
}))

vi.mock('../../src/core/agents/parent-agent', () => ({
  ParentAgent: class MockParentAgent {
    public agentId: string
    public agentType: AgentType = AgentType.PARENT
    public encryptionKey?: string

    constructor(organizationId: string, encryptionKey?: string) {
      this.agentId = `parent-${organizationId}`
      this.encryptionKey = encryptionKey
    }

    async initialize(): Promise<void> {
      // Mock implementation
    }
  }
}))

vi.mock('../../src/core/agents/service-agent', () => ({
  ServiceAgent: class MockServiceAgent {
    public agentId: string
    public agentType: AgentType = AgentType.SERVICE
    public serviceConfig: any
    public encryptionKey?: string

    constructor(serviceName: string, serviceConfig: any, encryptionKey?: string) {
      this.agentId = `service-${serviceName}`
      this.serviceConfig = serviceConfig
      this.encryptionKey = encryptionKey
    }

    async initialize(): Promise<void> {
      // Mock implementation
    }
  }
}))

describe('SDK Main Module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('createUserAgent', () => {
    it('should create a user agent with userId', async () => {
      const userId = 'test-user-123'
      const agent = await createUserAgent(userId)
      
      expect(agent.agentType).toBe(AgentType.USER)
      expect(agent.agentId).toBe(`user-${userId}`)
    })

    it('should create a user agent with encryption key', async () => {
      const userId = 'test-user-123'
      const encryptionKey = 'test-key'
      const agent = await createUserAgent(userId, encryptionKey)
      
      expect(agent.agentType).toBe(AgentType.USER)
      expect(agent.agentId).toBe(`user-${userId}`)
      expect((agent as any).encryptionKey).toBe(encryptionKey)
    })

    it('should initialize the agent', async () => {
      const userId = 'test-user-123'
      const agent = await createUserAgent(userId)
      
      expect(agent).toBeDefined()
      expect(agent.agentType).toBe(AgentType.USER)
    })
  })

  describe('createPackageAgent', () => {
    it('should create a package agent with name and version', async () => {
      const packageName = 'test-package'
      const packageVersion = '1.0.0'
      const agent = await createPackageAgent(packageName, packageVersion)
      
      expect(agent.agentType).toBe(AgentType.PACKAGE)
      expect(agent.agentId).toBe(`package-${packageName}`)
      expect((agent as any).version).toBe(packageVersion)
    })

    it('should create a package agent with encryption key', async () => {
      const packageName = 'test-package'
      const packageVersion = '1.0.0'
      const encryptionKey = 'test-key'
      const agent = await createPackageAgent(packageName, packageVersion, encryptionKey)
      
      expect(agent.agentType).toBe(AgentType.PACKAGE)
      expect(agent.agentId).toBe(`package-${packageName}`)
      expect((agent as any).encryptionKey).toBe(encryptionKey)
    })

    it('should handle scoped package names', async () => {
      const packageName = '@scope/test-package'
      const packageVersion = '2.0.0'
      const agent = await createPackageAgent(packageName, packageVersion)
      
      expect(agent.agentType).toBe(AgentType.PACKAGE)
      expect(agent.agentId).toBe(`package-${packageName}`)
    })
  })

  describe('createParentAgent', () => {
    it('should create a parent agent with organization ID', async () => {
      const organizationId = 'test-org-123'
      const agent = await createParentAgent(organizationId)
      
      expect(agent.agentType).toBe(AgentType.PARENT)
      expect(agent.agentId).toBe(`parent-${organizationId}`)
    })

    it('should create a parent agent with encryption key', async () => {
      const organizationId = 'test-org-123'
      const encryptionKey = 'test-key'
      const agent = await createParentAgent(organizationId, encryptionKey)
      
      expect(agent.agentType).toBe(AgentType.PARENT)
      expect(agent.agentId).toBe(`parent-${organizationId}`)
      expect((agent as any).encryptionKey).toBe(encryptionKey)
    })
  })

  describe('createServiceAgent', () => {
    it('should create a service agent with name and config', async () => {
      const serviceName = 'test-service'
      const serviceConfig = { endpoint: 'https://api.example.com' }
      const agent = await createServiceAgent(serviceName, serviceConfig)
      
      expect(agent.agentType).toBe(AgentType.SERVICE)
      expect(agent.agentId).toBe(`service-${serviceName}`)
      expect((agent as any).serviceConfig).toEqual(serviceConfig)
    })

    it('should create a service agent with encryption key', async () => {
      const serviceName = 'test-service'
      const serviceConfig = { endpoint: 'https://api.example.com', apiKey: 'test-api-key' }
      const encryptionKey = 'test-key'
      const agent = await createServiceAgent(serviceName, serviceConfig, encryptionKey)
      
      expect(agent.agentType).toBe(AgentType.SERVICE)
      expect(agent.agentId).toBe(`service-${serviceName}`)
      expect((agent as any).encryptionKey).toBe(encryptionKey)
    })

    it('should handle complex service configurations', async () => {
      const serviceName = 'auth-service'
      const serviceConfig = {
        endpoint: 'https://auth.example.com',
        apiKey: 'test-api-key',
        timeout: 5000,
        retries: 3
      }
      const agent = await createServiceAgent(serviceName, serviceConfig)
      
      expect(agent.agentType).toBe(AgentType.SERVICE)
      expect((agent as any).serviceConfig).toEqual(serviceConfig)
    })
  })

  describe('createCredentialTemplate', () => {
    it('should create a basic credential template', () => {
      const type = ['VerifiableCredential', 'TestCredential']
      const credentialSubject = { id: 'did:test:subject', name: 'Test User' }
      
      const template = createCredentialTemplate(type, credentialSubject)
      
      expect(template.type).toEqual(type)
      expect(template.credentialSubject).toEqual(credentialSubject)
      expect(template.issuer).toBeUndefined()
      expect(template.validFrom).toBeDefined()
      expect(template.validUntil).toBeUndefined()
      expect(template.context).toEqual(['https://www.w3.org/2018/credentials/v1'])
    })

    it('should create a credential template with all parameters', () => {
      const type = ['VerifiableCredential', 'TestCredential']
      const credentialSubject = { id: 'did:test:subject', name: 'Test User' }
      const issuer = 'did:test:issuer'
      const validFrom = '2023-01-01T00:00:00Z'
      const validUntil = '2024-01-01T00:00:00Z'
      const context = ['https://www.w3.org/2018/credentials/v1', 'https://example.com/context']
      
      const template = createCredentialTemplate(type, credentialSubject, issuer, validFrom, validUntil, context)
      
      expect(template.type).toEqual(type)
      expect(template.credentialSubject).toEqual(credentialSubject)
      expect(template.issuer).toBe(issuer)
      expect(template.validFrom).toBe(validFrom)
      expect(template.validUntil).toBe(validUntil)
      expect(template.context).toEqual(context)
    })

    it('should use current timestamp when validFrom is not provided', () => {
      const type = ['VerifiableCredential']
      const credentialSubject = { id: 'did:test:subject' }
      
      const before = new Date().toISOString()
      const template = createCredentialTemplate(type, credentialSubject)
      const after = new Date().toISOString()
      
      expect(template.validFrom).toBeDefined()
      expect(template.validFrom >= before).toBe(true)
      expect(template.validFrom <= after).toBe(true)
    })

    it('should use default context when not provided', () => {
      const type = ['VerifiableCredential']
      const credentialSubject = { id: 'did:test:subject' }
      
      const template = createCredentialTemplate(type, credentialSubject)
      
      expect(template.context).toEqual(['https://www.w3.org/2018/credentials/v1'])
    })
  })

  describe('validateCredentialStructure', () => {
    it('should validate a correct credential structure', () => {
      const credential = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        id: 'urn:uuid:test',
        type: ['VerifiableCredential', 'TestCredential'],
        issuer: 'did:test:issuer',
        validFrom: '2023-01-01T00:00:00Z',
        credentialSubject: { id: 'did:test:subject' }
      }
      
      const result = validateCredentialStructure(credential)
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('should detect missing @context field', () => {
      const credential = {
        id: 'urn:uuid:test',
        type: ['VerifiableCredential'],
        issuer: 'did:test:issuer',
        validFrom: '2023-01-01T00:00:00Z',
        credentialSubject: { id: 'did:test:subject' }
      }
      
      const result = validateCredentialStructure(credential)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Missing @context field')
    })

    it('should detect missing id field', () => {
      const credential = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiableCredential'],
        issuer: 'did:test:issuer',
        validFrom: '2023-01-01T00:00:00Z',
        credentialSubject: { id: 'did:test:subject' }
      }
      
      const result = validateCredentialStructure(credential)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Missing id field')
    })

    it('should detect missing or invalid type field', () => {
      const credential = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        id: 'urn:uuid:test',
        issuer: 'did:test:issuer',
        validFrom: '2023-01-01T00:00:00Z',
        credentialSubject: { id: 'did:test:subject' }
      }
      
      const result = validateCredentialStructure(credential)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Missing or invalid type field')
    })

    it('should detect missing issuer field', () => {
      const credential = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        id: 'urn:uuid:test',
        type: ['VerifiableCredential'],
        validFrom: '2023-01-01T00:00:00Z',
        credentialSubject: { id: 'did:test:subject' }
      }
      
      const result = validateCredentialStructure(credential)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Missing issuer field')
    })

    it('should detect missing validFrom field', () => {
      const credential = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        id: 'urn:uuid:test',
        type: ['VerifiableCredential'],
        issuer: 'did:test:issuer',
        credentialSubject: { id: 'did:test:subject' }
      }
      
      const result = validateCredentialStructure(credential)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Missing validFrom field')
    })

    it('should detect missing credentialSubject field', () => {
      const credential = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        id: 'urn:uuid:test',
        type: ['VerifiableCredential'],
        issuer: 'did:test:issuer',
        validFrom: '2023-01-01T00:00:00Z'
      }
      
      const result = validateCredentialStructure(credential)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Missing credentialSubject field')
    })

    it('should detect multiple validation errors', () => {
      const credential = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: 'VerifiableCredential', // Should be array
        validFrom: '2023-01-01T00:00:00Z'
        // Missing id, issuer, credentialSubject
      }
      
      const result = validateCredentialStructure(credential)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Missing id field')
      expect(result.errors).toContain('Missing issuer field')
      expect(result.errors).toContain('Missing credentialSubject field')
      expect(result.errors).toContain('Missing or invalid type field')
    })
  })

  describe('getSDKInfo', () => {
    it('should return SDK information', () => {
      const info = getSDKInfo()
      
      expect(info.version).toBe('1.0.0')
      expect(info.supportedVCVersion).toBe('2.0')
      expect(info.supportedDIDMethods).toContain('did:key')
      expect(info.supportedDIDMethods).toContain('did:cheqd:mainnet')
      expect(info.supportedDIDMethods).toContain('did:cheqd:testnet')
      expect(info.supportedCryptosuites).toContain('eddsa-2022')
      expect(info.supportedCryptosuites).toContain('jwt')
      expect(info.platform).toBe('node')
    })

    it('should include all capabilities', () => {
      const info = getSDKInfo()
      
      expect(info.capabilities.trustRegistry).toBe(true)
      expect(info.capabilities.schemaRegistry).toBe(true)
      expect(info.capabilities.carbonAwareness).toBe(true)
      expect(info.capabilities.biometricAuth).toBe(true)
      expect(info.capabilities.offlineCache).toBe(true)
    })

    it('should return consistent information', () => {
      const info1 = getSDKInfo()
      const info2 = getSDKInfo()
      
      expect(info1).toEqual(info2)
    })
  })
}) 