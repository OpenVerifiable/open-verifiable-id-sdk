import { CredentialClient } from '../../src/core/credentialing/client'
import {
  CredentialTemplate,
  VerifiableCredential_2_0,
  ValidationResult,
  OpenVerifiableAgent,
  AgentType,
  AgentPlugin,
  TrustStatusInfo,
  RevocationStatusInfo
} from '../../src/types'
import { LocalTrustRegistryClient } from '../../src/core/trust-registry'
import { RevocationClient } from '../../src/core/revocation/client'

// Create a simple mock agent for testing
class MockAgent implements OpenVerifiableAgent {
  readonly id = 'did:test:agent'
  readonly agentId = 'did:test:agent'
  readonly agentType = AgentType.USER

  getType(): string {
    return 'mock'
  }

  async issueCredential(template: CredentialTemplate): Promise<VerifiableCredential_2_0> {
    return {
      '@context': template['@context'],
      id: `urn:uuid:${Date.now()}`,
      type: template.type,
      issuer: template.issuer,
      validFrom: template.validFrom || new Date().toISOString(),
      credentialSubject: template.credentialSubject,
      proof: {
        type: 'JsonWebSignature2020',
        jwt: 'mock-jwt-token'
      }
    }
  }

  async verifyCredential(credential: VerifiableCredential_2_0): Promise<ValidationResult> {
    // Mock verification - always return valid for testing
    return {
      isValid: true,
      validationErrors: [],
      warnings: []
    }
  }

  // Implement other required methods with minimal implementations
  async getCredential(): Promise<VerifiableCredential_2_0 | null> { return null }
  async storeCredential(): Promise<void> {}
  async deleteCredential(): Promise<void> {}
  async listCredentials(): Promise<VerifiableCredential_2_0[]> { return [] }
  async initialize(): Promise<void> {}
  async cleanup(): Promise<void> {}
  async destroy(): Promise<void> {}
  registerPlugin(): void {}
  getPlugin(): undefined { return undefined }
  listPlugins(): [] { return [] }
  async createDID(): Promise<any> { return { did: 'did:test:agent' } }
  async resolveDID(): Promise<any> { return {} }
  async sign(): Promise<any> { return {} }
  async verifyCredentialWithValidation(): Promise<ValidationResult> {
    return { isValid: true, validationErrors: [], warnings: [] }
  }
  async publishResource(): Promise<any> { return {} }
  async getResource(): Promise<any> { return null }
  async updateResource(): Promise<any> { return {} }
  async deleteResource(): Promise<boolean> { return true }
  async listResources(): Promise<any> { return { resources: [] } }
  async exportAgentBackup(): Promise<string> { return '' }
  async importAgentBackup(): Promise<void> {}
  async rotateAgentEncryptionKey(): Promise<void> {}
  async getAgentAccessLog(): Promise<any[]> { return [] }
  getAgentDebugInfo(): any { return {} }
}

describe('CredentialClient', () => {
  let agent: OpenVerifiableAgent
  let trustRegistry: LocalTrustRegistryClient
  let revocationClient: RevocationClient

  beforeEach(async () => {
    // Use the simple mock agent instead of the complex real agent
    agent = new MockAgent()
    trustRegistry = new LocalTrustRegistryClient()
    revocationClient = new RevocationClient()
  })

  it('verifies credential with trust registry success', async () => {
    console.log('🔍 Debug: Test starting')
    
    const agentDid = 'did:test:agent'
    
    // Add the agent's DID as a trusted issuer
    await trustRegistry.addTrustedIssuer(agentDid, {
      name: 'Test User Agent',
      trustLevel: 'verified',
      addedDate: new Date().toISOString(),
      source: 'test'
    })

    // Verify the DID was added
    const isTrusted = await trustRegistry.isTrustedIssuer(agentDid)
    console.log('🔍 Debug: isTrusted after adding =', isTrusted)

    const client = new CredentialClient({ 
      agent, 
      trustRegistry: trustRegistry as any 
    })

    const template: CredentialTemplate = {
      '@context': ['https://www.w3.org/ns/credentials/v2'],
      type: ['ExampleCredential'],
      issuer: agentDid,
      credentialSubject: { id: 'did:example:123', name: 'Test' }
    }

    const vc = await client.issueCredential(template)
    console.log('🔍 Debug: credential issuer =', vc.issuer)

    const result = await client.verifyCredential(vc)
    console.log('🔍 Debug: verification result =', result)

    expect(result.isValid).toBe(true)
    expect((result.trustStatus as any)?.isTrusted).toBe(true)
  })

  it('fails verification if credential revoked', async () => {
    const client = new CredentialClient({ 
      agent, 
      revocation: revocationClient as any 
    })

    // Create a credential first
    const template: CredentialTemplate = {
      '@context': ['https://www.w3.org/ns/credentials/v2'],
      type: ['ExampleCredential'],
      issuer: 'did:test:agent',
      credentialSubject: { id: 'did:example:123', name: 'Test' }
    }

    const vc = await client.issueCredential(template)
    
    // Add the credential to revocation list
    await revocationClient.addRevokedCredential(vc.id, {
      issuerDID: 'did:test:agent',
      revokedDate: new Date().toISOString(),
      source: 'test'
    })

    const result = await client.verifyCredential(vc)
    expect(result.isValid).toBe(false)
    expect((result.revocationStatus as any)?.isRevoked ?? (result.revocationStatus as any)?.status === 'revoked').toBe(true)
  })

  it('issues credential with mock agent', async () => {
    const client = new CredentialClient({ agent })

    const template: CredentialTemplate = {
      '@context': ['https://www.w3.org/ns/credentials/v2'],
      type: ['TestCredential'],
      issuer: 'did:test:agent',
      credentialSubject: { 
        id: 'did:example:subject',
        name: 'Test Subject',
        email: 'test@example.com'
      }
    }

    const vc = await client.issueCredential(template)

    expect(vc).toBeDefined()
    expect(vc.id).toBeDefined()
    expect(vc.type).toContain('TestCredential')
    expect(vc.issuer).toBe('did:test:agent')
    expect(vc.credentialSubject).toEqual(template.credentialSubject)
    expect(vc.proof).toBeDefined()
  })

  it('verifies credential with mock agent', async () => {
    const client = new CredentialClient({ agent })

    const template: CredentialTemplate = {
      '@context': ['https://www.w3.org/ns/credentials/v2'],
      type: ['VerifiableCredential'],
      issuer: 'did:test:agent',
      credentialSubject: { id: 'did:example:subject', name: 'Test' }
    }

    const vc = await client.issueCredential(template)
    const result = await client.verifyCredential(vc)

    expect(result.isValid).toBeDefined()
    expect(result.validationErrors).toBeDefined()
    expect(Array.isArray(result.validationErrors)).toBe(true)
  })
}) 