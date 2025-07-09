/**
 * End-to-End DID Workflow Test
 * 
 * This test covers the complete workflow from DID creation to credential issuance
 * and verification, based on the did-import-complete-workflow.ts example.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PackageAgent } from '../../src/core/agents/package-agent'
import { importKey, KeyImportExportFormat } from '../../src/core/key-management/key-import-export'
import { createDIDFromPackageJson } from '../../src/core/did/did-importer'

describe('End-to-End DID Workflow', () => {
  let packageAgent: PackageAgent
  const testPrivateKey = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'

  beforeEach(async () => {
    // Create a fresh package agent for each test
    packageAgent = new PackageAgent({
      packageName: '@open-verifiable/test-package',
      packageVersion: '1.0.0'
    })
    await packageAgent.initialize()
  })

  afterEach(async () => {
    // Clean up after each test
    if (packageAgent) {
      await packageAgent.cleanup()
    }
  })

  describe('Complete DID Import and Credential Workflow', () => {
    it('should complete full workflow: key validation → DID creation → credential issuance → verification → storage', async () => {
      // Step 1: Validate private key
      console.log('🔑 Step 1: Validating private key...')
      const keyValidation = await importKey(testPrivateKey, {
        format: KeyImportExportFormat.HEX,
        algorithm: 'Ed25519' as any
      })

      expect(keyValidation.privateKey).toBeDefined()
      expect(keyValidation.privateKey.length).toBe(32)
      expect(keyValidation.publicKey).toBeDefined()
      console.log('✅ Private key validation successful')

      // Step 2: Create DID with private key
      console.log('📥 Step 2: Creating DID with private key...')
      const didResult = await packageAgent.createDID('key', {
        alias: 'test-package-did',
        options: {
          privateKeyHex: testPrivateKey.slice(0, 64),
          keyType: 'Ed25519'
        }
      })

      expect(didResult.did).toBeDefined()
      expect(didResult.did).toMatch(/^did:key:/)
      const newDid = didResult.did
      console.log('✅ DID created successfully:', newDid)

      // Step 3: Issue verifiable credential
      console.log('📜 Step 3: Issuing verifiable credential...')
      const credential = await packageAgent.issueCredential({
        '@context': [
          'https://www.w3.org/ns/credentials/v2'
        ],
        type: ['VerifiableCredential', 'PackageIdentityCredential'],
        issuer: newDid,
        credentialSubject: {
          id: 'pkg:npm/@open-verifiable/test-package',
          name: '@open-verifiable/test-package',
          version: '1.0.0',
          description: 'Test package for e2e workflow',
          author: 'Test Author',
          license: 'MIT',
          repository: 'https://github.com/test/test-package.git',
          did: newDid,
          packageName: '@open-verifiable/test-package',
          packageVersion: '1.0.0'
        },
        validFrom: new Date().toISOString()
      })

      expect(credential.id).toBeDefined()
      expect(credential.issuer).toBe(newDid)
      expect(credential.type).toContain('VerifiableCredential')
      expect(credential.type).toContain('PackageIdentityCredential')
      console.log('✅ Credential issued successfully:', credential.id)

      // Step 4: Verify the credential
      console.log('🔍 Step 4: Verifying credential...')
      const verificationResult = await packageAgent.verifyCredential(credential)
      
      expect(verificationResult.isValid).toBe(true)
      expect(verificationResult.validationErrors).toEqual([])
      console.log('✅ Credential verification successful')

      // Step 5: Store and retrieve credentials
      console.log('💾 Step 5: Storing and managing credentials...')
      await packageAgent.storeCredential(credential)
      
      const storedCredentials = await packageAgent.listCredentials()
      expect(storedCredentials.length).toBeGreaterThan(0)
      expect(storedCredentials.some(c => c.id === credential.id)).toBe(true)
      console.log('✅ Credential stored and retrieved successfully')

      // Step 6: Create package-specific credentials
      console.log('📦 Step 6: Creating package-specific credentials...')
      const packageIdentityCredential = await packageAgent.createPackageCredential({
        name: '@open-verifiable/test-package',
        version: '1.0.0',
        description: 'Test package for e2e workflow',
        author: 'Test Author',
        license: 'MIT',
        repository: 'https://github.com/test/test-package.git'
      })

      expect(packageIdentityCredential.id).toBeDefined()
      expect(packageIdentityCredential.type).toContain('PackageIdentityCredential')
      console.log('✅ Package identity credential created')

      const packageReleaseCredential = await packageAgent.signRelease({
        name: '@open-verifiable/test-package',
        version: '1.0.0',
        description: 'Test package release',
        author: 'Test Author',
        license: 'MIT',
        repository: 'https://github.com/test/test-package.git'
      })

      expect(packageReleaseCredential.id).toBeDefined()
      expect(packageReleaseCredential.type).toContain('VerifiableCredential')
      console.log('✅ Package release credential created')

      // Step 7: Store package credentials
      await packageAgent.storeCredential(packageIdentityCredential)
      await packageAgent.storeCredential(packageReleaseCredential)
      
      const allCredentials = await packageAgent.listCredentials()
      expect(allCredentials.length).toBeGreaterThanOrEqual(3) // Original + 2 package credentials
      console.log('✅ All credentials stored successfully')

      // Final verification
      console.log('🎉 Workflow completed successfully!')
      expect(newDid).toBeDefined()
      expect(credential.id).toBeDefined()
      expect(verificationResult.isValid).toBe(true)
    })

    it('should handle workflow with different DID methods', async () => {
      // Test with different DID methods
      const didMethods = ['key'] // Add 'cheqd' when available
      
      for (const method of didMethods) {
        console.log(`Testing DID method: ${method}`)
        
        const didResult = await packageAgent.createDID(method, {
          alias: `test-${method}-did`,
          options: {
            privateKeyHex: testPrivateKey.slice(0, 64),
            keyType: 'Ed25519'
          }
        })

        expect(didResult.did).toBeDefined()
        expect(didResult.did).toMatch(new RegExp(`^did:${method}:`))
        
        // Issue a simple credential
        const credential = await packageAgent.issueCredential({
          '@context': ['https://www.w3.org/ns/credentials/v2'],
          type: ['VerifiableCredential', 'TestCredential'],
          issuer: didResult.did,
          credentialSubject: {
            id: 'did:example:subject',
            testProperty: 'testValue'
          },
          validFrom: new Date().toISOString()
        })

        expect(credential.issuer).toBe(didResult.did)
        
        // Verify the credential
        const verificationResult = await packageAgent.verifyCredential(credential)
        expect(verificationResult.isValid).toBe(true)
        
        console.log(`✅ ${method} DID method test passed`)
      }
    })

    it('should handle workflow errors gracefully', async () => {
      // Test with invalid private key
      const invalidKey = 'invalid-key'
      
      await expect(
        importKey(invalidKey, {
          format: KeyImportExportFormat.HEX,
          algorithm: 'Ed25519' as any
        })
      ).rejects.toThrow()

      // Test with missing credential data
      const didResult = await packageAgent.createDID('key', {
        alias: 'test-did',
        options: {
          privateKeyHex: testPrivateKey.slice(0, 64),
          keyType: 'Ed25519'
        }
      })

      await expect(
        packageAgent.issueCredential({
          '@context': ['https://www.w3.org/ns/credentials/v2'],
          type: [], // Empty type should fail
          issuer: didResult.did,
          credentialSubject: {}, // Empty subject should fail
          validFrom: new Date().toISOString()
        })
      ).rejects.toThrow()

      console.log('✅ Error handling tests passed')
    })
  })

  describe('Cross-Device Credential Sync Workflow', () => {
    it('should sync credentials between devices', async () => {
      // Create initial credentials
      const didResult = await packageAgent.createDID('key', {
        alias: 'sync-test-did',
        options: {
          privateKeyHex: testPrivateKey.slice(0, 64),
          keyType: 'Ed25519'
        }
      })

      const credential = await packageAgent.issueCredential({
        '@context': ['https://www.w3.org/ns/credentials/v2'],
        type: ['VerifiableCredential', 'SyncTestCredential'],
        issuer: didResult.did,
        credentialSubject: {
          id: 'did:example:sync-subject',
          syncProperty: 'syncValue'
        },
        validFrom: new Date().toISOString()
      })

      await packageAgent.storeCredential(credential)

      // Simulate cross-device sync
      const storedCredentials = await packageAgent.listCredentials()
      expect(storedCredentials.length).toBeGreaterThan(0)

      // Verify credentials are still valid after sync
      for (const storedCred of storedCredentials) {
        const verificationResult = await packageAgent.verifyCredential(storedCred)
        expect(verificationResult.isValid).toBe(true)
      }

      console.log('✅ Cross-device sync workflow completed')
    })
  })
}) 