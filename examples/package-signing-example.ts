/**
 * Package Signing Example
 * 
 * This example demonstrates how to use the package signer to sign and publish
 * the open-verifiable-id-sdk package with its own DID, including universal
 * credential creation and DID-linked resource publication.
 * 
 * Note: This is a programmatic example. CLI commands are handled by the
 * separate open-verifiable-id-cli package.
 */

import { 
  createPackageSignerFromConfig,
  createDIDLinkedResourceClient,
  createUniversalCredentialManager
} from '../src/index.js';

async function signPackageExample() {
  console.log('🚀 Starting package signing example...\n');

  try {
    // Method 1: Using the convenience function
    console.log('📦 Method 1: Using createPackageSignerFromConfig');
    const packageSigner = await createPackageSignerFromConfig('./package.json');
    
    // Get package metadata
    const metadata = await packageSigner.getPackageMetadata();
    console.log('Package metadata:', metadata);

    // Sign the package
    const signingResult = await packageSigner.signPackage({
      version: metadata.version,
      packageDID: metadata.did,
      createUniversalCredential: true,
      publishToDLR: true,
      publishToNPM: false // Set to true to actually publish to npm
    });

    if (signingResult.success) {
      console.log('✅ Package signed successfully!');
      console.log('Signature:', signingResult.signature);
      
      if (signingResult.universalCredential) {
        console.log('Universal credential created:', signingResult.universalCredential.id);
      }
    } else {
      console.log('❌ Package signing failed:', signingResult.errors);
    }

    // Verify the package
    const verificationResult = await packageSigner.verifyPackage({
      version: metadata.version,
      packageDID: metadata.did,
      verifyUniversalCredential: true,
      verifyDLRPublication: true
    });

    console.log('\n🔍 Verification result:', {
      isValid: verificationResult.isValid,
      errors: verificationResult.errors,
      warnings: verificationResult.warnings
    });

  } catch (error) {
    console.error('❌ Example failed:', error);
  }
}

async function manualSetupExample() {
  console.log('\n🔧 Method 2: Manual setup');
  
  try {
    // Create resource client
    const resourceClient = createDIDLinkedResourceClient({
      endpoint: 'https://resolver.cheqd.network',
      enableCache: true
    });

    // Create universal credential manager
    const universalCredentialManager = createUniversalCredentialManager(
      resourceClient,
      'did:cheqd:mainnet:your-package-did',
      '1.0.0'
    );

    // Create package signer
    const { createPackageSigner } = await import('../src/core/package-signer/index.js');
    const packageSigner = createPackageSigner(
      universalCredentialManager,
      resourceClient,
      './package.json'
    );

    // Use the package signer...
    const metadata = await packageSigner.getPackageMetadata();
    console.log('Package metadata (manual setup):', metadata);

  } catch (error) {
    console.error('❌ Manual setup failed:', error);
  }
}

async function runExample() {
  console.log('📋 Package Signing Example');
  console.log('========================\n');

  await signPackageExample();
  await manualSetupExample();

  console.log('\n✨ Example completed!');
  console.log('\nNote: To use CLI commands, install the open-verifiable-id-cli package:');
  console.log('npm install -g @open-verifiable/id-cli');
  console.log('ov-id sign-package');
}

// Run the example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runExample().catch(console.error);
}

export { signPackageExample, manualSetupExample, runExample }; 