/**
 * Example: Import DID from package.json and sign verifiable credentials
 * 
 * This example demonstrates:
 * 1. Reading the DID from package.json
 * 2. Using TESTNET_HEX_KEY from environment variables
 * 3. Creating an agent with the imported DID
 * 4. Signing a verifiable credential
 */

import { createPackageAgent } from '../src';
import { importKey, KeyImportExportFormat } from '../src/core/key-management/key-import-export';
import { createKeyManager } from '../src/core/key-management';
import { RuntimePlatform } from '../src/types';
import dotenv from 'dotenv';

dotenv.config();

async function importDIDAndSignCredential() {
  try {
    console.log('🚀 Starting DID import and credential signing example...\n');

    // 1. Read DID from package.json
    const packageJson = require('../package.json');
    const did = packageJson.did || packageJson.testDid;
    
    if (!did) {
      throw new Error('No DID found in package.json');
    }
    
    console.log(`📦 Found DID in package.json: ${did}`);

    // 2. Get private key from environment
    const privateKey = process.env.TESTNET_HEX_KEY;
    
    if (!privateKey) {
      throw new Error('TESTNET_HEX_KEY environment variable not found');
    }
    
    console.log(`🔑 Found private key in environment (${privateKey.length} chars)`);

    // 3. Import the private key using the key management system
    console.log('\n🔐 Importing private key...');
    const keyManager = createKeyManager({
      platform: RuntimePlatform.NODE,
      defaultAlgorithm: 'Ed25519' as any,
      hardwareBacked: false,
      requireBiometric: false
    });

    const keyImportResult = await importKey(privateKey, {
      format: KeyImportExportFormat.HEX,
      algorithm: 'Ed25519' as any
    });

    console.log('✅ Private key imported successfully');
    console.log(`   Key length: ${keyImportResult.privateKey.length} bytes`);
    console.log(`   Public key length: ${keyImportResult.publicKey?.length || 0} bytes`);

    // 4. Create a package agent
    console.log('\n🤖 Creating package agent...');
    const agent = await createPackageAgent('open-verifiable-id-sdk', '1.0.0');
    console.log('✅ Package agent created');

    // 5. Create a credential template using the DID from package.json
    console.log('\n📝 Creating credential template...');
    const credentialTemplate = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://w3id.org/security/suites/ed25519-2020/v1'
      ],
      type: ['VerifiableCredential', 'PackageIdentityCredential'],
      issuer: did, // Use the DID from package.json
      validFrom: new Date().toISOString(),
      credentialSubject: {
        id: 'pkg:npm/@open-verifiable/id-sdk',
        name: '@open-verifiable/id-sdk',
        version: '1.0.0',
        description: 'Open Verifiable ID SDK - Reference implementation for decentralized identity and verifiable credentials',
        author: 'Open Verifiable Community',
        license: 'MIT',
        repository: 'https://github.com/open-verifiable/open-verifiable-id-sdk.git'
      }
    };

    console.log('✅ Credential template created');
    console.log(`   Issuer: ${credentialTemplate.issuer}`);
    console.log(`   Subject: ${credentialTemplate.credentialSubject.id}`);

    // 6. Issue the credential (this will use the agent's signing capabilities)
    console.log('\n✍️  Issuing verifiable credential...');
    const credential = await agent.issueCredential(credentialTemplate);
    
    console.log('✅ Verifiable credential issued successfully!');
    console.log(`   Credential ID: ${credential.id}`);
    console.log(`   Issuer: ${credential.issuer}`);
    console.log(`   Valid from: ${credential.validFrom}`);

    // 7. Verify the credential
    console.log('\n🔍 Verifying credential...');
    const verificationResult = await agent.verifyCredential(credential);
    
    if (verificationResult.isValid) {
      console.log('✅ Credential verification successful!');
      console.log(`   Trust status: ${verificationResult.trustStatus?.status || 'unknown'}`);
    } else {
      console.log('❌ Credential verification failed!');
      console.log(`   Errors: ${verificationResult.validationErrors.join(', ')}`);
    }

    // 8. Store the credential
    console.log('\n💾 Storing credential...');
    await agent.storeCredential(credential);
    console.log('✅ Credential stored successfully');

    // 9. List stored credentials
    console.log('\n📋 Listing stored credentials...');
    const storedCredentials = await agent.listCredentials();
    console.log(`   Found ${storedCredentials.length} stored credentials`);

    // 10. Display the final credential
    console.log('\n🎉 Final verifiable credential:');
    console.log(JSON.stringify(credential, null, 2));

    // 11. Show how to use the imported key for additional operations
    console.log('\n🔧 Additional key operations:');
    console.log(`   Key ID: ${keyImportResult.privateKey ? 'Imported successfully' : 'Not available'}`);
    console.log(`   Public key (hex): ${Buffer.from(keyImportResult.publicKey || []).toString('hex').substring(0, 32)}...`);
    console.log(`   Private key length: ${keyImportResult.privateKey.length} bytes`);

    console.log('\n✨ Example completed successfully!');
    
    return {
      success: true,
      did,
      credential,
      verificationResult,
      keyInfo: {
        privateKeyLength: keyImportResult.privateKey.length,
        publicKeyLength: keyImportResult.publicKey?.length || 0,
        algorithm: 'Ed25519'
      }
    };

  } catch (error) {
    console.error('❌ Error in DID import and signing example:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  importDIDAndSignCredential()
    .then((result) => {
      if (result.success) {
        console.log('\n🎯 Example completed successfully!');
        console.log(`   DID: ${result.did}`);
        console.log(`   Credential ID: ${result.credential?.id || 'N/A'}`);
        console.log(`   Verification: ${result.verificationResult?.isValid ? '✅ Valid' : '❌ Invalid'}`);
        process.exit(0);
      } else {
        console.error('\n💥 Example failed:', result.error);
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('\n💥 Unexpected error:', error);
      process.exit(1);
    });
}

export { importDIDAndSignCredential }; 