#!/usr/bin/env ts-node

/**
 * DID Import Complete Workflow
 * 
 * This example demonstrates the complete workflow for:
 * 1. Validating a private key
 * 2. Creating a package agent
 * 3. Creating a new DID with our private key (simplified approach)
 * 4. Issuing and verifying verifiable credentials
 * 5. Managing credentials
 * 6. Creating package-specific credentials
 */

import dotenv from 'dotenv';
import { PackageAgent } from '../src/core/agents/package-agent';
import { importKey, KeyImportExportFormat } from '../src/core/key-management/key-import-export';
import { createDIDFromPackageJson } from '../src/core/did/did-importer';

dotenv.config();

class DIDImportWorkflow {
  private packageAgent: PackageAgent;

  constructor() {
    this.packageAgent = new PackageAgent({
      packageName: '@open-verifiable/open-verifiable-id-sdk',
      packageVersion: '1.0.0'
    });
  }

  async run() {
    try {
      await this.packageAgent.initialize();

      // Step 1: Validate private key
      console.log('🔑 Step 1: Validating private key...');
      const privateKey = process.env.TESTNET_HEX_KEY;
      if (!privateKey) {
        throw new Error('TESTNET_HEX_KEY environment variable not found');
      }

      const keyValidation = await importKey(privateKey, {
        format: KeyImportExportFormat.HEX,
        algorithm: 'Ed25519' as any
      });

      console.log('✅ Private key validation successful');
      console.log(`   Private key length: ${keyValidation.privateKey.length} bytes`);
      console.log(`   Public key length: ${keyValidation.publicKey?.length || 0} bytes\n`);

      // Step 2: Create package agent
      console.log('🤖 Step 2: Creating package agent...');
      console.log('✅ Package agent created successfully');
      console.log(`   Agent ID: ${this.packageAgent.agentId}`);
      console.log(`   Agent Type: ${this.packageAgent.agentType}\n`);

      // Step 3: Create a new DID with our key (simplified approach)
      console.log('📥 Step 3: Creating new DID with our private key...');
      
      // Use the package agent's createDID method directly
      const didResult = await this.packageAgent.createDID('key', {
        alias: 'package-did',
        options: {
          privateKeyHex: privateKey.slice(0, 64), // Use first 32 bytes as private key
          keyType: 'Ed25519'
        }
      });

      const newDid = didResult.did;
      console.log('✅ New DID created successfully');
      console.log(`   New DID: ${newDid}`);
      console.log(`   Success: true`);
      console.log(`   Created at: ${new Date().toISOString()}\n`);

      // Step 4: Create and issue verifiable credential
      console.log('📜 Step 4: Creating and issuing verifiable credential...');
      
      const credential = await this.packageAgent.issueCredential({
        '@context': [
          'https://www.w3.org/2018/credentials/v1',
          'https://w3id.org/security/suites/ed25519-2020/v1'
        ],
        type: ['PackageIdentityCredential'],
        issuer: newDid,
        credentialSubject: {
          id: 'pkg:npm/@open-verifiable/open-verifiable-id-sdk',
          name: '@open-verifiable/open-verifiable-id-sdk',
          version: '1.0.0',
          description: 'Open Verifiable ID SDK - Reference implementation for decentralized identity and verifiable credentials',
          author: 'Open Verifiable Community',
          license: 'MIT',
          repository: 'https://github.com/open-verifiable/open-verifiable-id-sdk.git',
          did: newDid,
          packageName: '@open-verifiable/open-verifiable-id-sdk',
          packageVersion: '1.0.0'
        },
        validFrom: new Date().toISOString()
      });

      console.log('--- Debug: Credential after issuance ---');
      console.log('Type:', typeof credential);
      console.log('Is string:', typeof credential === 'string');
      if (typeof credential === 'object') {
        console.log('Keys:', Object.keys(credential));
        console.log('Credential:', JSON.stringify(credential, null, 2));
      }
      console.log('--------------------------------------');

      // Store the credential
      await this.packageAgent.storeCredential(credential);
      console.log('✅ Credential issued and stored successfully');
      console.log(`   Credential ID: ${credential.id}`);
      console.log(`   Issuer: ${credential.issuer}`);
      console.log(`   Type: ${credential.type.join(', ')}\n`);

      // Step 5: Verify the issued credential
      console.log('🔍 Step 5: Verifying issued credential...');
      const verificationResult = await this.packageAgent.verifyCredential(credential);
      console.log('✅ Credential verification completed');
      console.log(`   Valid: ${verificationResult.isValid}`);
      console.log(`   Trust Status: ${verificationResult.trustStatus?.status || 'unknown'}`);
      if (verificationResult.validationErrors && verificationResult.validationErrors.length > 0) {
        console.log(`   Errors: ${JSON.stringify(verificationResult.validationErrors)}`);
      }
      console.log('');

      // Step 6: Manage credentials
      console.log('💾 Step 6: Managing credentials...');
      await this.packageAgent.storeCredential(credential);
      const storedCredentials = await this.packageAgent.listCredentials();
      console.log('✅ Credential stored successfully');
      console.log(`✅ Found ${storedCredentials.length} stored credentials`);
      storedCredentials.forEach((cred, index) => {
        console.log(`   ${index + 1}. ${cred.id} (${cred.type.join(', ')})`);
      });
      console.log('');

      // Step 7: Create package-specific credentials
      console.log('📦 Step 7: Creating package-specific credentials...');
      const packageDid = await this.packageAgent.createPackageDID();
      console.log('✅ Package DID created');

      const packageIdentityCredential = await this.packageAgent.createPackageCredential({
        name: '@open-verifiable/open-verifiable-id-sdk',
        version: '1.0.0',
        description: 'Open Verifiable ID SDK',
        author: 'Open Verifiable Community',
        license: 'MIT',
        repository: 'https://github.com/open-verifiable/open-verifiable-id-sdk.git'
      });
      console.log('✅ Package identity credential created');
      console.log(`   ID: ${packageIdentityCredential.id}`);

      const packageReleaseCredential = await this.packageAgent.signRelease({
        name: '@open-verifiable/open-verifiable-id-sdk',
        version: '1.0.0',
        description: 'Open Verifiable ID SDK Release',
        author: 'Open Verifiable Community',
        license: 'MIT',
        repository: 'https://github.com/open-verifiable/open-verifiable-id-sdk.git'
      });
      console.log('✅ Package release credential created');
      console.log(`   ID: ${packageReleaseCredential.id}`);

      await this.packageAgent.storeCredential(packageIdentityCredential);
      await this.packageAgent.storeCredential(packageReleaseCredential);
      console.log('✅ Package credentials stored\n');

      // Summary
      console.log('🎉 Workflow completed successfully!');
      console.log('==================================================');
      console.log(`✅ DID: ${newDid}`);
      console.log(`✅ Credential ID: ${credential.id}`);
      console.log(`✅ Verification: ${verificationResult.isValid ? 'Valid' : 'Invalid'}`);

      return {
        success: true,
        did: newDid,
        credentialId: credential.id,
        verificationResult: verificationResult.isValid,
        errors: verificationResult.validationErrors || [],
        warnings: verificationResult.isValid ? [] : ['Credential verification failed']
      };

    } catch (error) {
      console.error('❌ Workflow failed:', error);
      return {
        success: false,
        did: '',
        credentialId: '',
        verificationResult: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: []
      };
    }
  }

  async cleanup() {
    try {
      await this.packageAgent.cleanup();
    } catch (error) {
      console.warn('⚠️  Cleanup warning:', error);
    }
  }
}

/**
 * Main execution function
 */
async function main() {
  const workflow = new DIDImportWorkflow();
  
  try {
    const result = await workflow.run();
    
    if (result.success) {
      console.log('\n📊 Workflow Summary:');
      console.log(`   Status: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      console.log(`   DID: ${result.did}`);
      console.log(`   Credential ID: ${result.credentialId}`);
      console.log(`   Verification: ${result.verificationResult ? 'Valid' : 'Invalid'}`);
      
      if (result.errors && result.errors.length > 0) {
        console.log(`   Errors: ${result.errors.join(', ')}`);
      }
      
      if (result.warnings && result.warnings.length > 0) {
        console.log(`   Warnings: ${result.warnings.join(', ')}`);
      }
    } else {
      console.error('\n❌ Workflow failed');
      if (result.errors) {
        result.errors.forEach(error => console.error(`   Error: ${error}`));
      }
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  } finally {
    await workflow.cleanup();
  }
}

// Run the workflow
main().catch(console.error); 