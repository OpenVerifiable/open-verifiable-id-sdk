/**
 * Cheqd Trust Chain Integration Example
 * 
 * Demonstrates how to use Cheqd Trust Chains for verifiable plugin ecosystem trust management
 * Implements ADR-0050: Cheqd Trust Chain Integration for Verifiable Plugins
 */

import { CheqdTrustChainClient, PluginEcosystemTrustChain, TrustChainVerificationResult } from '../src/core/trust-registry/cheqd-trust-chain.js';
import { TrustRegistryClient } from '../src/core/trust-registry/client.js';
import { SourceVerificationEngine } from '../src/core/plugins/source-verification.js';
import { PluginVerificationEngine } from '../src/core/plugins/verification-engine.js';

/**
 * Example: Complete Trust Chain Workflow for Verifiable Plugins
 */
export async function cheqdTrustChainExample(): Promise<void> {
  console.log('🚀 Cheqd Trust Chain Integration Example\n');

  try {
    // 1. Setup Plugin Ecosystem Trust Chain
    console.log('📋 Step 1: Setting up Plugin Ecosystem Trust Chain');
    const ecosystemChain: PluginEcosystemTrustChain = {
      rTAO: 'did:cheqd:mainnet:plugin-ecosystem-rtao',
      governanceFramework: 'https://open-verifiable.org/governance',
      dnsAnchored: true,
      supportedCredentialTypes: ['VerifiableCredential', 'PluginLicenseCredential'],
      trustLevels: ['verified', 'accredited', 'certified'],
      metadata: {
        name: 'Open Verifiable Plugin Ecosystem',
        description: 'Trust chain for Open Verifiable plugin ecosystem',
        version: '1.0.0',
        maintainer: 'Open Verifiable'
      }
    };

    console.log('✅ Ecosystem Trust Chain Configuration:');
    console.log(`  🏛️  rTAO: ${ecosystemChain.rTAO}`);
    console.log(`  📜 Governance Framework: ${ecosystemChain.governanceFramework}`);
    console.log(`  🌐 DNS Anchored: ${ecosystemChain.dnsAnchored ? 'Yes' : 'No'}`);
    console.log(`  🎯 Supported Credential Types: ${ecosystemChain.supportedCredentialTypes.join(', ')}`);
    console.log(`  🏆 Trust Levels: ${ecosystemChain.trustLevels.join(', ')}`);

    // 2. Initialize Trust Chain Client
    console.log('\n🔧 Step 2: Initializing Cheqd Trust Chain Client');
    const cheqdTrustChain = new CheqdTrustChainClient({
      cheqdStudioEndpoint: 'https://api.cheqd.studio',
      apiKey: process.env.CHEQD_API_KEY
    });

    const trustRegistry = new TrustRegistryClient({
      cheqdTrustChain
    });

    console.log('✅ Trust Chain Client initialized');

    // 3. Create Plugin Creator Accreditation
    console.log('\n🎓 Step 3: Creating Plugin Creator Accreditation');
    const creatorDID = 'did:cheqd:mainnet:plugin-creator-123';
    const platformDID = 'did:cheqd:mainnet:plugin-platform';
    const scope = ['plugin-creation', 'plugin-verification', 'plugin-distribution'];

    const accreditation = await trustRegistry.createPluginCreatorAccreditation(
      creatorDID,
      platformDID,
      ecosystemChain,
      scope
    );

    console.log('✅ Creator Accreditation Created:');
    console.log(`  🆔 ID: ${accreditation.id}`);
    console.log(`  👤 Creator: ${accreditation.subject}`);
    console.log(`  🏢 Platform: ${accreditation.issuer}`);
    console.log(`  🏆 Trust Level: ${accreditation.trustLevel}`);
    console.log(`  📅 Issued: ${accreditation.issuedAt}`);
    console.log(`  📅 Expires: ${accreditation.expiresAt || 'Never'}`);
    console.log(`  🎯 Scope: ${accreditation.scope.join(', ')}`);

    // 4. Verify Plugin Creator Against Trust Chain
    console.log('\n🔍 Step 4: Verifying Plugin Creator Against Trust Chain');
    const verificationResult = await trustRegistry.verifyPluginCreatorTrustChain(
      creatorDID,
      ecosystemChain
    );

    console.log('✅ Trust Chain Verification Result:');
    console.log(`  ✅ Valid: ${verificationResult.isValid ? 'Yes' : 'No'}`);
    console.log(`  🏆 Trust Level: ${verificationResult.trustLevel}`);
    console.log(`  🔗 Chain Length: ${verificationResult.chainLength}`);
    console.log(`  🌐 DNS Anchored: ${verificationResult.dnsAnchored ? 'Yes' : 'No'}`);
    console.log(`  📜 Governance Framework: ${verificationResult.governanceFramework}`);

    if (verificationResult.verificationPath.length > 0) {
      console.log('  🛤️  Verification Path:');
      verificationResult.verificationPath.forEach((did, index) => {
        console.log(`    ${index + 1}. ${did}`);
      });
    }

    if (verificationResult.errors.length > 0) {
      console.log('  ❌ Errors:');
      verificationResult.errors.forEach(error => console.log(`    - ${error}`));
    }

    if (verificationResult.warnings.length > 0) {
      console.log('  ⚠️  Warnings:');
      verificationResult.warnings.forEach(warning => console.log(`    - ${warning}`));
    }

    // 5. Source Verification with Trust Chain
    console.log('\n🔐 Step 5: Source Verification with Trust Chain');
    const sourceVerificationEngine = new SourceVerificationEngine();
    const pluginVerificationEngine = new PluginVerificationEngine();

    // Generate source verification data
    const pluginPath = './example-plugin';
    const { sourceHash, didKey, bundleHash } = await sourceVerificationEngine.generateSourceDID(pluginPath);

    console.log('✅ Source Verification Data Generated:');
    console.log(`  🔑 Source DID: ${didKey}`);
    console.log(`  📦 Bundle Hash: ${bundleHash}`);
    console.log(`  🔐 Source Hash: ${sourceHash}`);

    // Create release credential with trust chain
    const releaseCredential = await sourceVerificationEngine.createReleaseCredential(
      pluginPath,
      creatorDID,
      '1.0.0'
    );

    console.log('✅ Release Credential Created:');
    console.log(`  🆔 ID: ${releaseCredential.id}`);
    console.log(`  📦 Name: ${releaseCredential.name}`);
    console.log(`  📋 Version: ${releaseCredential.version}`);
    console.log(`  🔑 Source DID: ${releaseCredential.sourceDID}`);
    console.log(`  📅 Published: ${releaseCredential.publishedAt}`);

    // 6. Complete Plugin Verification
    console.log('\n✅ Step 6: Complete Plugin Verification');
    const pluginId = 'example-verifiable-plugin';
    const expectedSourceDID = didKey;

    const sourceVerificationResult = await pluginVerificationEngine.verifyPluginSource(
      pluginId,
      pluginPath,
      expectedSourceDID
    );

    console.log('✅ Source Verification Result:');
    console.log(`  ✅ Valid: ${sourceVerificationResult.isValid ? 'Yes' : 'No'}`);
    console.log(`  🔑 Source DID: ${sourceVerificationResult.didKey}`);
    console.log(`  🔐 Source Hash: ${sourceVerificationResult.sourceHash}`);
    console.log(`  ⛓️  Blockchain Verified: ${sourceVerificationResult.blockchainVerified ? 'Yes' : 'No'}`);
    console.log(`  🆔 Identity Aggregated: ${sourceVerificationResult.identityAggregated ? 'Yes' : 'No'}`);

    if (sourceVerificationResult.errors.length > 0) {
      console.log('  ❌ Errors:');
      sourceVerificationResult.errors.forEach(error => console.log(`    - ${error}`));
    }

    if (sourceVerificationResult.warnings.length > 0) {
      console.log('  ⚠️  Warnings:');
      sourceVerificationResult.warnings.forEach(warning => console.log(`    - ${warning}`));
    }

    // 7. Trust Chain Integration Summary
    console.log('\n📊 Step 7: Trust Chain Integration Summary');
    console.log('✅ Complete Trust Chain Workflow:');
    console.log('  1. ✅ Ecosystem Trust Chain configured');
    console.log('  2. ✅ Creator accreditation created');
    console.log('  3. ✅ Trust chain verification completed');
    console.log('  4. ✅ Source verification with blockchain');
    console.log('  5. ✅ Plugin integrity verified');
    console.log('  6. ✅ Trust chain integration successful');

    console.log('\n🎯 Benefits of Cheqd Trust Chain Integration:');
    console.log('  • 🔗 Hierarchical trust delegation');
    console.log('  • ⛓️  Blockchain-anchored trust relationships');
    console.log('  • 🌐 DNS anchoring for enhanced verification');
    console.log('  • 🚂 TRAIN compatibility for automated validation');
    console.log('  • 📜 Formal governance framework');
    console.log('  • 🔐 Cryptographic proof of trust');

    console.log('\n🚀 Trust Chain Integration Complete!');

  } catch (error) {
    console.error('❌ Trust Chain Integration Example Failed:', error);
    throw error;
  }
}

/**
 * Example: Trust Chain Validation for Plugin Installation
 */
export async function trustChainValidationExample(): Promise<void> {
  console.log('\n🔍 Trust Chain Validation for Plugin Installation\n');

  try {
    // Simulate plugin installation with trust chain validation
    const pluginMetadata = {
      pluginId: 'trusted-plugin',
      creatorDID: 'did:cheqd:mainnet:plugin-creator-123',
      trustChain: {
        rTAO: 'did:cheqd:mainnet:plugin-ecosystem-rtao',
        platformAccreditation: 'did:cheqd:mainnet:platform-accreditation',
        creatorAccreditation: 'did:cheqd:mainnet:creator-accreditation',
        dnsAnchored: true,
        governanceFramework: 'https://open-verifiable.org/governance',
        trustLevel: 'accredited'
      }
    };

    console.log('📦 Plugin Installation with Trust Chain Validation:');
    console.log(`  🆔 Plugin ID: ${pluginMetadata.pluginId}`);
    console.log(`  👤 Creator: ${pluginMetadata.creatorDID}`);
    console.log(`  🏆 Trust Level: ${pluginMetadata.trustChain.trustLevel}`);

    // Validate trust chain before installation
    const ecosystemChain: PluginEcosystemTrustChain = {
      rTAO: pluginMetadata.trustChain.rTAO,
      governanceFramework: pluginMetadata.trustChain.governanceFramework,
      dnsAnchored: pluginMetadata.trustChain.dnsAnchored,
      supportedCredentialTypes: ['VerifiableCredential', 'PluginLicenseCredential'],
      trustLevels: ['verified', 'accredited', 'certified'],
      metadata: {
        name: 'Open Verifiable Plugin Ecosystem',
        description: 'Trust chain for Open Verifiable plugin ecosystem',
        version: '1.0.0',
        maintainer: 'Open Verifiable'
      }
    };

    const cheqdTrustChain = new CheqdTrustChainClient();
    const trustRegistry = new TrustRegistryClient({ cheqdTrustChain });

    const validationResult = await trustRegistry.verifyPluginCreatorTrustChain(
      pluginMetadata.creatorDID,
      ecosystemChain
    );

    if (validationResult.isValid) {
      console.log('✅ Trust Chain Validation Passed - Plugin Installation Allowed');
      console.log(`  🏆 Trust Level: ${validationResult.trustLevel}`);
      console.log(`  🔗 Chain Length: ${validationResult.chainLength}`);
      console.log(`  🌐 DNS Anchored: ${validationResult.dnsAnchored ? 'Yes' : 'No'}`);
    } else {
      console.log('❌ Trust Chain Validation Failed - Plugin Installation Blocked');
      console.log('  ❌ Errors:');
      validationResult.errors.forEach(error => console.log(`    - ${error}`));
    }

  } catch (error) {
    console.error('❌ Trust Chain Validation Example Failed:', error);
    throw error;
  }
}

/**
 * Run all examples
 */
export async function runAllTrustChainExamples(): Promise<void> {
  console.log('🎯 Running Cheqd Trust Chain Integration Examples\n');
  
  await cheqdTrustChainExample();
  await trustChainValidationExample();
  
  console.log('\n🎉 All Trust Chain Examples Completed Successfully!');
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTrustChainExamples().catch(console.error);
} 