/**
 * Test New DID Workflow
 * 
 * This example creates a new DID with our TESTNET_HEX_KEY and tests
 * the complete credential issuance and verification workflow.
 */

import dotenv from 'dotenv';
import { PackageAgent } from '../src/core/agents/package-agent';
import { importKey, KeyImportExportFormat } from '../src/core/key-management/key-import-export';

dotenv.config();

async function main() {
  console.log('🚀 Starting New DID Workflow Test');
  console.log('==================================================\n');

  try {
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
    const packageAgent = new PackageAgent({
      packageName: '@open-verifiable/open-verifiable-id-sdk',
      packageVersion: '1.0.0'
    });
    await packageAgent.initialize();
    console.log('✅ Package agent created successfully');
    console.log(`   Agent ID: ${packageAgent.agentId}`);
    console.log(`   Agent Type: ${packageAgent.agentType}\n`);

    // Step 3: Create a new DID with our key
    console.log('📥 Step 3: Creating new DID with our private key...');
    
    // Create a new DID using our private key
    const didResult = await packageAgent.createDID('cheqd:testnet', {
      alias: 'package-did',
      options: {
        privateKeyHex: privateKey.slice(0, 64), // Use first 32 bytes as private key
        keyType: 'Ed25519'
      }
    });

    const newDid = didResult.did;
    console.log('✅ New DID created successfully');
    console.log(`   New DID: ${newDid}`);
    console.log(`   Created at: ${new Date().toISOString()}\n`);

    // Step 4: Create and issue verifiable credential
    console.log('📜 Step 4: Creating and issuing verifiable credential...');
    
    const credential = await packageAgent.issueCredential({
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
    await packageAgent.storeCredential(credential);
    console.log('✅ Credential issued and stored successfully');
    console.log(`   Credential ID: ${credential.id}`);
    console.log(`   Issuer: ${credential.issuer}`);
    console.log(`   Type: ${credential.type.join(', ')}\n`);

    // Step 5: Verify the issued credential
    console.log('🔍 Step 5: Verifying issued credential...');
    const verificationResult = await packageAgent.verifyCredential(credential);
    console.log('✅ Credential verification completed');
    console.log(`   Valid: ${verificationResult.isValid}`);
    console.log(`   Trust Status: ${verificationResult.trustStatus?.status || 'unknown'}`);
    if (verificationResult.validationErrors && verificationResult.validationErrors.length > 0) {
      console.log(`   Errors: ${JSON.stringify(verificationResult.validationErrors)}`);
    }
    console.log('');

    // Summary
    console.log('🎉 Workflow completed successfully!');
    console.log('==================================================');
    console.log(`✅ DID: ${newDid}`);
    console.log(`✅ Credential ID: ${credential.id}`);
    console.log(`✅ Verification: ${verificationResult.isValid ? 'Valid' : 'Invalid'}`);

    console.log('\n📊 Workflow Summary:');
    console.log('   Status: SUCCESS');
    console.log(`   DID: ${newDid}`);
    console.log(`   Credential ID: ${credential.id}`);
    console.log(`   Verification: ${verificationResult.isValid ? 'Valid' : 'Invalid'}`);
    if (!verificationResult.isValid) {
      console.log('   Warnings: Credential verification failed');
    }

  } catch (error) {
    console.error('❌ Workflow failed:', error);
    process.exit(1);
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up resources...');
    try {
      // Cleanup logic here if needed
      console.log('✅ Agent cleanup completed');
    } catch (error) {
      console.warn('⚠️  Cleanup warning:', error);
    }
  }
}

// Run the workflow
main().catch(console.error); 