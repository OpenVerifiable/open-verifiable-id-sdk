import { CredentialClient } from '../../src/core/credentialing/client'
import {
  CredentialTemplate,
  VerifiableCredential_2_0,
  ValidationResult,
  OvIdAgent,
  AgentType,
  AgentPlugin
} from '../../src/types'
import { LocalTrustRegistryClient } from '../../src/core/trust-registry'
import { RevocationClient } from '../../src/core/revocation/client'

/**
 * Simple mock agent implementing minimal OvIdAgent behaviour
 */
class MockAgent implements OvIdAgent {
  readonly id: string = 'did:example:issuer'
  readonly agentId: string = 'did:example:issuer'
  readonly agentType: AgentType = AgentType.USER
  private plugins = new Map<string, AgentPlugin>()

  getType (): string {
    return 'mock'
  }

  async initialize(): Promise<void> {
    // Mock initialization
  }

  async cleanup(): Promise<void> {
    // Mock cleanup
  }

  async destroy(): Promise<void> {
    // Mock destroy
  }

  async createDID(): Promise<any> {
    return { did: this.id }
  }

  registerPlugin(plugin: AgentPlugin): void {
    this.plugins.set(plugin.name, plugin)
  }

  getPlugin(name: string): AgentPlugin | undefined {
    return this.plugins.get(name)
  }

  listPlugins(): AgentPlugin[] {
    return Array.from(this.plugins.values())
  }

  async issueCredential (template: CredentialTemplate): Promise<VerifiableCredential_2_0> {
    return {
      '@context': template['@context'] || ['https://www.w3.org/ns/credentials/v2'],
      id: `urn:uuid:mock-${Date.now()}`,
      type: template.type,
      issuer: template.issuer || this.id,
      validFrom: template.validFrom || new Date().toISOString(),
      credentialSubject: template.credentialSubject,
      proof: {
        type: 'DataIntegrityProof' as const,
        cryptosuite: 'eddsa-jcs-2022',
        created: new Date().toISOString(),
        verificationMethod: this.id,
        proofPurpose: 'assertionMethod' as const,
        proofValue: 'stub'
      }
    }
  }

  async verifyCredential (_credential: VerifiableCredential_2_0): Promise<ValidationResult> {
    return {
      isValid: true,
      validationErrors: [],
      warnings: []
    }
  }

  // Unused storage-related methods for tests
  async getCredential (): Promise<VerifiableCredential_2_0 | null> { return null }
  async storeCredential (): Promise<void> { }
  async deleteCredential (): Promise<void> { }
  async listCredentials (): Promise<VerifiableCredential_2_0[]> { return [] }
}

describe('CredentialClient', () => {
  it('verifies credential with trust registry success', async () => {
    const agent = new MockAgent()
    const trustRegistry = new LocalTrustRegistryClient() as any
    await trustRegistry.addTrustedIssuer(agent.id, {
      name: 'Mock Agent',
      trustLevel: 'verified',
      addedDate: new Date().toISOString(),
      source: 'test'
    })

    const client = new CredentialClient({ agent, trustRegistry })

    const template: CredentialTemplate = {
      '@context': ['https://www.w3.org/ns/credentials/v2'],
      type: ['ExampleCredential'],
      issuer: agent.id,
      credentialSubject: { id: 'did:example:123' }
    }

    const vc = await client.issueCredential(template)
    const result = await client.verifyCredential(vc)

    expect(result.isValid).toBe(true)
    expect((result.trustStatus as any)?.isTrusted).toBe(true)
  })

  it('fails verification if credential revoked', async () => {
    const agent = new MockAgent()
    const revocation = new RevocationClient() as any
    await revocation.addRevokedCredential('urn:uuid:revoked', {
      issuerDID: agent.id,
      revokedDate: new Date().toISOString(),
      source: 'test'
    })

    const client = new CredentialClient({ agent, revocation })

    const vc: VerifiableCredential_2_0 = {
      '@context': ['https://www.w3.org/ns/credentials/v2'],
      id: 'urn:uuid:revoked',
      type: ['ExampleCredential'],
      issuer: agent.id,
      validFrom: new Date().toISOString(),
      credentialSubject: { id: 'did:example:123' },
      proof: {
        type: 'DataIntegrityProof' as const,
        cryptosuite: 'eddsa-jcs-2022',
        created: new Date().toISOString(),
        verificationMethod: agent.id,
        proofPurpose: 'assertionMethod' as const,
        proofValue: 'stub'
      }
    }

    const result = await client.verifyCredential(vc)
    expect(result.isValid).toBe(false)
    expect((result.revocationStatus as any)?.isRevoked ?? (result.revocationStatus as any)?.status === 'revoked').toBe(true)
  })
}) 