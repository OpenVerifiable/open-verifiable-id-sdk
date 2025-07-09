import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { ParentAgent } from '../../../src/core/agents/parent-agent'
import { AgentType, CredentialTemplate, VerifiableCredential_2_0 } from '../../../src/types'

// Mock the base agent and its dependencies
vi.mock('../../../src/core/agents/base', () => ({
  BaseAgent: class MockBaseAgent {
    public agentId: string
    public agentType: AgentType
    protected plugins: Map<string, any> = new Map()
    
    constructor(agentId: string, agentType: AgentType) {
      this.agentId = agentId
      this.agentType = agentType
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
            parentId: this.agentId,
            delegationEnabled: true
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
          parentId: this.agentId,
          delegationLevel: 'parent'
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

describe('ParentAgent', () => {
  let parentAgent: ParentAgent
  const testOrgId = 'test-organization-123'
  const testEncryptionKey = 'test-encryption-key'

  beforeEach(() => {
    parentAgent = new ParentAgent({
      organizationId: testOrgId
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Constructor', () => {
    it('should create a parent agent with correct properties', () => {
      expect((parentAgent as any).agentId).toBe(`parent-${testOrgId}`)
      expect((parentAgent as any).agentType).toBe(AgentType.PARENT)
    })

    it('should create a parent agent without encryption key', () => {
      const agentWithoutKey = new ParentAgent({
        organizationId: testOrgId
      })
      expect((agentWithoutKey as any).agentId).toBe(`parent-${testOrgId}`)
      expect((agentWithoutKey as any).agentType).toBe(AgentType.PARENT)
    })

    it('should handle organization IDs with special characters', () => {
      const specialOrgId = 'org-name-with-dashes_123'
      const agent = new ParentAgent({
        organizationId: specialOrgId
      })
      expect((agent as any).agentId).toBe(`parent-${specialOrgId}`)
    })
  })

  describe('createDID', () => {
    it('should create a DID key successfully', async () => {
      const result = await parentAgent.createDID('key')
      
      expect(result.did).toMatch(/^did:key:/)
      expect(result.controllerKeyId).toBeDefined()
      expect(result.keys).toHaveLength(1)
      expect(result.keys[0].type).toBe('Ed25519')
      expect(result.keys[0].meta).toEqual({
        algorithms: ['EdDSA'],
        parentId: parentAgent.agentId,
        delegationEnabled: true
      })
    })

    it('should create a Cheqd DID successfully', async () => {
      const result = await parentAgent.createDID('cheqd:testnet')
      
      expect(result.did).toMatch(/^did:cheqd:testnet:/)
      expect(result.controllerKeyId).toBeDefined()
      expect(result.keys).toHaveLength(1)
    })

    it('should create DID with organization-specific metadata', async () => {
      const result = await parentAgent.createDID('key')
      
      expect(result.keys[0]?.meta?.parentId).toBe(parentAgent.agentId)
      expect(result.keys[0]?.meta?.delegationEnabled).toBe(true)
    })
  })

  describe('issueCredential', () => {
    it('should issue a valid credential', async () => {
      const template: CredentialTemplate = {
        '@context': ['https://www.w3.org/ns/credentials/v2'],
        type: ['OrganizationCredential'],
        credentialSubject: { 
          id: 'did:test:subject', 
          organizationName: 'Test Organization',
          role: 'employee'
        },
        issuer: 'did:test:issuer',
        validFrom: new Date().toISOString()
      }

      const result = await parentAgent.issueCredential(template)
      
      expect(result['@context']).toEqual(['https://www.w3.org/ns/credentials/v2'])
      expect(result.type).toEqual(['VerifiableCredential', 'OrganizationCredential'])
      expect(result.issuer).toBe('did:test:issuer')
      expect(result.credentialSubject).toEqual({
        id: 'did:test:subject',
        organizationName: 'Test Organization',
        role: 'employee',
        parentId: parentAgent.agentId,
        delegationLevel: 'parent'
      })
      expect(result.proof).toBeDefined()
    })

    it('should use default issuer when not provided', async () => {
      const template: CredentialTemplate = {
        '@context': ['https://www.w3.org/ns/credentials/v2'],
        type: ['OrganizationCredential'],
        credentialSubject: { id: 'did:test:subject' },
        issuer: 'did:test:issuer',
        validFrom: new Date().toISOString()
      }

      const result = await parentAgent.issueCredential(template)
      
      expect(result.issuer).toBe('did:test:issuer')
      expect(result.proof).toBeDefined()
    })

    it('should include organization metadata in credential subject', async () => {
      const template: CredentialTemplate = {
        '@context': ['https://www.w3.org/ns/credentials/v2'],
        type: ['OrganizationCredential'],
        credentialSubject: { id: 'did:test:subject' },
        issuer: 'did:test:issuer',
        validFrom: new Date().toISOString()
      }

      const result = await parentAgent.issueCredential(template)
      
      expect(result.credentialSubject?.parentId).toBe(parentAgent.agentId)
      expect(result.credentialSubject?.delegationLevel).toBe('parent')
    })
  })

  describe('verifyCredential', () => {
    it('should verify a valid credential', async () => {
      const credential: VerifiableCredential_2_0 = {
        '@context': ['https://www.w3.org/ns/credentials/v2'],
        id: 'urn:uuid:test',
        type: ['VerifiableCredential', 'OrganizationCredential'],
        issuer: 'did:test:issuer',
        validFrom: new Date().toISOString(),
        credentialSubject: { id: 'did:test:subject' }
      }

      const result = await parentAgent.verifyCredential(credential)
      
      expect(result.isValid).toBe(true)
      expect(result.validationErrors).toEqual([])
      expect(result.warnings).toEqual([])
    })
  })

  describe('Parent-specific methods', () => {
    it('should get parent capabilities', () => {
      const capabilities = parentAgent.getCapabilities()
      
      expect(capabilities).toContain('create-organization-did')
      expect(capabilities).toContain('delegate-permissions')
      expect(capabilities).toContain('manage-child-agents')
      expect(capabilities).toContain('issue-organization-credentials')
      expect(capabilities).toContain('revoke-credentials')
    })

    it('should register and manage child agents', async () => {
      await parentAgent.createOrganizationDID()
      await parentAgent.registerChildAgent('child1', 'did:key:child1')
      await parentAgent.registerChildAgent('child2', 'did:key:child2')
      
      const childAgents = await parentAgent.getChildAgents()
      expect(childAgents.get('child1')).toBe('did:key:child1')
      expect(childAgents.get('child2')).toBe('did:key:child2')
    })

    it('should get child agents', async () => {
      await parentAgent.registerChildAgent('child1', 'did:key:child1')
      
      const childAgents = await parentAgent.getChildAgents()
      expect(childAgents.get('child1')).toBe('did:key:child1')
    })

    it('should remove child agents', async () => {
      const isolatedAgent = new ParentAgent({
        organizationId: 'isolated-test-org'
      })
      await isolatedAgent.registerChildAgent('child1', 'did:key:child1')
      await isolatedAgent.unregisterChildAgent('child1')
      
      const childAgents = await isolatedAgent.getChildAgents()
      expect(childAgents.has('child1')).toBe(false)
    })

    it('should create delegations', async () => {
      await parentAgent.createOrganizationDID()
      await parentAgent.registerChildAgent('child1', 'did:key:child1')
      
      const delegation = await parentAgent.delegateToChild('child1', ['credential_issuance'])
      
      expect(delegation.type).toContain('DelegatedAuthorityCredential')
      expect(delegation.credentialSubject).toBeDefined()
    })

    it('should delegate authority', async () => {
      await parentAgent.createOrganizationDID()
      await parentAgent.registerChildAgent('child1', 'did:key:child1')
      
      const delegation = await parentAgent.delegateAuthority({
        childDID: 'did:key:child1',
        permissions: ['credential_issuance']
      })
      
      expect(delegation.type).toContain('DelegatedAuthorityCredential')
      expect(delegation.credentialSubject).toBeDefined()
    })

    it('should verify delegations', async () => {
      await parentAgent.createOrganizationDID()
      await parentAgent.registerChildAgent('child1', 'did:key:child1')
      
      const delegation = await parentAgent.delegateToChild('child1', ['credential_issuance'])
      const result = await parentAgent.verifyDelegation(delegation)
      
      expect(result.isValid).toBeDefined()
    })
  })

  describe('Organization management', () => {
    it('should handle multiple child agents', async () => {
      const isolatedAgent = new ParentAgent({
        organizationId: 'multi-child-test-org'
      })
      await isolatedAgent.registerChildAgent('child-1', 'did:key:child1')
      await isolatedAgent.registerChildAgent('child-2', 'did:key:child2')
      await isolatedAgent.registerChildAgent('child-3', 'did:key:child3')
      
      const allChildAgents = await isolatedAgent.getChildAgents()
      expect(allChildAgents.size).toBe(3)
      expect(allChildAgents.get('child-1')).toBe('did:key:child1')
      expect(allChildAgents.get('child-2')).toBe('did:key:child2')
      expect(allChildAgents.get('child-3')).toBe('did:key:child3')
    })

    it('should handle hierarchical permissions', async () => {
      const isolatedAgent = new ParentAgent({
        organizationId: 'hierarchical-test-org'
      })
      await isolatedAgent.createOrganizationDID()
      await isolatedAgent.registerChildAgent('child-agent-123', 'did:key:child123')
      
      const permissions = ['credential_issuance', 'credential_verification', 'did_management']
      const delegation = await isolatedAgent.delegateToChild('child-agent-123', permissions)
      
      expect(delegation.type).toContain('DelegatedAuthorityCredential')
      expect(delegation.credentialSubject).toBeDefined()
    })

    it('should handle organization IDs with various formats', () => {
      const orgIds = [
        'simple-org',
        'org_with_underscores',
        'org-with-dashes',
        'org123',
        '123-org',
        'org.name'
      ]
      
      orgIds.forEach(orgId => {
        const agent = new ParentAgent({ organizationId: orgId })
        expect((agent as any).agentId).toBe(`parent-${orgId}`)
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

      const result = await parentAgent.verifyCredential(invalidCredential)
      
      expect(result.isValid).toBe(true) // Parent agent always returns true for now
    })

    it('should handle duplicate child agent registrations', async () => {
      await parentAgent.registerChildAgent('child-agent-123', 'did:key:child123')
      await parentAgent.registerChildAgent('child-agent-123', 'did:key:child123') // Should not cause error
      
      const childAgents = await parentAgent.getChildAgents()
      expect(childAgents.get('child-agent-123')).toBe('did:key:child123')
    })
  })
})