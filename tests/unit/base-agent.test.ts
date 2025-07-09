import { describe, it, expect } from 'vitest'
import { BaseAgent } from '../../src/core/agents/base'
import { AgentType, CreateDIDOptions, CredentialTemplate, VerifiableCredential_2_0, VerificationResult, IIdentifier } from '../../src/types'

// Minimal concrete subclass for testing
class TestAgent extends BaseAgent {
  async createDID(method: string, options?: CreateDIDOptions): Promise<IIdentifier> {
    return { did: 'did:test:123', provider: 'did:key', keys: [], services: [] }
  }
  async issueCredential(template: CredentialTemplate): Promise<VerifiableCredential_2_0> {
    return {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      id: 'urn:uuid:test',
      type: ['VerifiableCredential'],
      issuer: 'did:test:issuer',
      validFrom: new Date().toISOString(),
      credentialSubject: { id: 'did:test:subject' }
    }
  }
  async verifyCredential(credential: VerifiableCredential_2_0): Promise<VerificationResult> {
    return { isValid: true, validationErrors: [], warnings: [] }
  }
}

describe('BaseAgent', () => {
  it('can be subclassed and instantiated', () => {
    const agent = new TestAgent('test-id', AgentType.USER)
    expect(agent.agentId).toBe('test-id')
    expect(agent.agentType).toBe(AgentType.USER)
  })

  it('calls abstract methods without error', async () => {
    const agent = new TestAgent('test-id', AgentType.USER)
    const did = await agent.createDID('key')
    expect(did.did).toBe('did:test:123')
    const vc = await agent.issueCredential({ type: ['Test'], credentialSubject: { id: 'x' } })
    expect(vc.type).toContain('VerifiableCredential')
    const result = await agent.verifyCredential(vc)
    expect(result.isValid).toBe(true)
  })
}) 