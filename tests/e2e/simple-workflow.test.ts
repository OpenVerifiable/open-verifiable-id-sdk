/**
 * Simple End-to-End Workflow Test
 * 
 * This is a basic test to verify that the e2e test infrastructure works
 * before running more complex workflows.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PackageAgent } from '../../src/core/agents/package-agent'

describe('Simple End-to-End Workflow', () => {
  let packageAgent: PackageAgent

  beforeEach(async () => {
    packageAgent = new PackageAgent({
      packageName: '@open-verifiable/simple-test',
      packageVersion: '1.0.0'
    })
    await packageAgent.initialize()
  })

  afterEach(async () => {
    if (packageAgent) {
      await packageAgent.cleanup()
    }
  })

  it('should complete basic workflow: agent creation → DID creation → credential issuance', async () => {
    console.log('🚀 Starting simple e2e workflow test...')

    // Step 1: Verify agent is initialized
    expect(packageAgent.agentId).toBe('package-@open-verifiable/simple-test-1.0.0')
    expect(packageAgent.agentType).toBe('package')
    console.log('✅ Agent initialized successfully')

    // Step 2: Create a simple DID
    console.log('📝 Creating simple DID...')
    const didResult = await packageAgent.createDID('key', {
      alias: 'simple-test-did'
    })

    expect(didResult.did).toBeDefined()
    expect(didResult.did).toMatch(/^did:key:/)
    console.log('✅ DID created:', didResult.did)

    // Step 3: Issue a simple credential
    console.log('📜 Issuing simple credential...')
    const credential = await packageAgent.issueCredential({
      '@context': ['https://www.w3.org/ns/credentials/v2'],
      type: ['VerifiableCredential', 'SimpleTestCredential'],
      issuer: didResult.did,
      credentialSubject: {
        id: 'did:example:simple-subject',
        name: 'Simple Test User'
      },
      validFrom: new Date().toISOString()
    })

    expect(credential.id).toBeDefined()
    expect(credential.issuer).toBe(didResult.did)
    expect(credential.type).toContain('VerifiableCredential')
    console.log('✅ Credential issued:', credential.id)

    // Step 4: Verify the credential
    console.log('🔍 Verifying credential...')
    const verificationResult = await packageAgent.verifyCredential(credential)
    
    expect(verificationResult.isValid).toBe(true)
    console.log('✅ Credential verified successfully')

    // Step 5: Store the credential
    console.log('💾 Storing credential...')
    await packageAgent.storeCredential(credential)
    
    const storedCredentials = await packageAgent.listCredentials()
    expect(storedCredentials.length).toBeGreaterThan(0)
    expect(storedCredentials.some(c => c.id === credential.id)).toBe(true)
    console.log('✅ Credential stored successfully')

    console.log('🎉 Simple e2e workflow completed successfully!')
  })

  it('should handle basic error cases', async () => {
    console.log('🧪 Testing error handling...')

    // Test with invalid credential template
    await expect(
      packageAgent.issueCredential({
        '@context': ['https://www.w3.org/ns/credentials/v2'],
        type: [], // Empty type should fail
        issuer: 'did:example:issuer',
        credentialSubject: { id: 'did:example:subject' }, // Missing required fields should fail
        validFrom: new Date().toISOString()
      })
    ).rejects.toThrow()

    console.log('✅ Error handling test passed')
  })
}) 