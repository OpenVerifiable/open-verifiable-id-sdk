/**
 * Verifiable Plugin Example
 * 
 * Demonstrates the complete verifiable plugin workflow using the ov-id-sdk pattern:
 * 1. Create plugin with source-derived DID:key
 * 2. Generate blockchain credential
 * 3. Install and verify plugin
 * 4. Validate source integrity
 */

import { SourceVerificationEngine } from '../src/core/plugins/source-verification.js';
import { PluginLicenseManager } from '../src/core/plugins/license-manager.js';
import { AgentFactory } from '../src/core/agents/factory.js';
import { AgentType } from '../src/types/index.js';
import path from 'path';
import fs from 'fs';

/**
 * Example verifiable plugin configuration
 */
const verifiablePluginConfig = {
  pluginId: "advanced-did-method",
  name: "Advanced DID Method",
  version: "1.0.0",
  pluginType: "verifiable",
  verificationLevel: "full",
  category: "did-method",
  author: {
    name: "Advanced DID Labs",
    did: "did:cheqd:mainnet:advanced-did-labs"
  },
  verification: {
    integrityHash: "", // Will be generated
    signature: "", // Will be generated
    signatureAlgorithm: "ed25519",
    sourceVerification: {
      sourceDID: "", // Will be generated from source files
      bundleHash: "", // Will be generated
      releaseCredential: "", // Will be created on blockchain
      packageDID: "did:cheqd:mainnet:advanced-did-method",
      identityAggregated: true
    }
  },
  monetization: {
    requiresLicense: true,
    licenseType: "paid",
    price: {
      amount: 25,
      currency: "USD"
    }
  }
};

/**
 * Complete verifiable plugin workflow
 */
export async function verifiablePluginWorkflow() {
  console.log('🚀 Starting verifiable plugin workflow...\n');

  try {
    // 1. Initialize components
    const sourceEngine = new SourceVerificationEngine();
    const licenseManager = new PluginLicenseManager();
    const agentFactory = AgentFactory.getInstance();

    // 2. Generate source verification data
    console.log('📝 Step 1: Generating source verification data...');
    const pluginPath = path.join(__dirname, 'sample-plugin');
    const verificationData = await sourceEngine.generateSourceDID(pluginPath);
    
    console.log(`   Source Hash: ${verificationData.sourceHash}`);
    console.log(`   DID:key: ${verificationData.didKey}`);
    console.log(`   Bundle Hash: ${verificationData.bundleHash}\n`);

    // 3. Create release credential for blockchain
    console.log('🔐 Step 2: Creating release credential...');
    const releaseCredential = await sourceEngine.createReleaseCredential(
      pluginPath,
      verifiablePluginConfig.verification.sourceVerification.packageDID,
      verifiablePluginConfig.version
    );
    
    console.log(`   Release ID: ${releaseCredential.id}`);
    console.log(`   Issuer: ${releaseCredential.issuer}`);
    console.log(`   Source DID: ${releaseCredential.sourceDID}\n`);

    // 4. Update plugin config with verification data
    const updatedConfig = {
      ...verifiablePluginConfig,
      verification: {
        ...verifiablePluginConfig.verification,
        integrityHash: verificationData.sourceHash,
        signature: "mock-signature-data", // Would be real signature
        sourceVerification: {
          ...verifiablePluginConfig.verification.sourceVerification,
          sourceDID: verificationData.didKey,
          bundleHash: verificationData.bundleHash,
          releaseCredential: releaseCredential.id
        }
      }
    };

    // 5. Install verifiable plugin
    console.log('📦 Step 3: Installing verifiable plugin...');
    const installationResult = await licenseManager.installPlugin({
      pluginId: updatedConfig.pluginId,
      paymentConfig: {
        method: 'cheqd',
        amount: updatedConfig.monetization.price!.amount,
        currency: updatedConfig.monetization.price!.currency,
        userDID: 'did:cheqd:mainnet:user-123',
        metadata: { pluginId: updatedConfig.pluginId }
      },
      options: {
        cacheForOffline: true,
        verifyImmediately: true
      }
    });

    if (installationResult.success) {
      console.log('   ✅ Plugin installed successfully');
      console.log(`   License Credential: ${installationResult.licenseCredential?.id}`);
    } else {
      throw new Error(`Plugin installation failed: ${installationResult.errors?.join(', ')}`);
    }

    // 6. Verify source integrity
    console.log('\n🔍 Step 4: Verifying source integrity...');
    const sourceVerification = await sourceEngine.verifyPluginSource(
      updatedConfig.pluginId,
      pluginPath,
      verificationData.didKey
    );

    console.log(`   Source Valid: ${sourceVerification.isValid ? '✅' : '❌'}`);
    console.log(`   Blockchain Verified: ${sourceVerification.blockchainVerified ? '✅' : '❌'}`);
    console.log(`   Identity Aggregated: ${sourceVerification.identityAggregated ? '✅' : '⚠️'}`);

    if (sourceVerification.errors.length > 0) {
      console.log('   Errors:', sourceVerification.errors);
    }

    // 7. Create agent with verifiable plugin
    console.log('\n🤖 Step 5: Creating agent with verifiable plugin...');
    const agent = await agentFactory.createAgentWithMonetizedPlugins(
      {
        type: AgentType.USER,
        config: {
          userId: 'test-user',
          plugins: [updatedConfig]
        }
      },
      [updatedConfig.pluginId]
    );

    console.log(`   Agent created: ${agent.agentId}`);
    console.log(`   Agent type: ${agent.getType()}`);

    // 8. Verify plugin can execute offline
    console.log('\n📱 Step 6: Testing offline execution...');
    const canExecuteOffline = await licenseManager.checkOfflineExecution(updatedConfig.pluginId);
    console.log(`   Can execute offline: ${canExecuteOffline ? '✅' : '❌'}`);

    // 9. List installed plugins
    console.log('\n📋 Step 7: Listing installed plugins...');
    const installedPlugins = await agentFactory.listInstalledPlugins();
    console.log('   Installed plugins:');
    installedPlugins.forEach(plugin => {
      console.log(`     - ${plugin.pluginId}: ${plugin.licenseStatus} (offline: ${plugin.canExecuteOffline})`);
    });

    console.log('\n🎉 Verifiable plugin workflow completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Plugin: ${updatedConfig.name}@${updatedConfig.version}`);
    console.log(`   Type: ${updatedConfig.pluginType}`);
    console.log(`   Source DID: ${verificationData.didKey}`);
    console.log(`   Blockchain Credential: ${releaseCredential.id}`);
    console.log(`   License: ${installationResult.licenseCredential?.id}`);
    console.log(`   Agent: ${agent.agentId}`);

  } catch (error) {
    console.error('❌ Verifiable plugin workflow failed:', error);
    throw error;
  }
}

/**
 * Verify an existing plugin
 */
export async function verifyExistingPlugin(pluginPath: string, expectedDID: string) {
  console.log('🔍 Verifying existing plugin...');
  
  const sourceEngine = new SourceVerificationEngine();
  const result = await sourceEngine.verifyPluginSource(
    path.basename(pluginPath),
    pluginPath,
    expectedDID
  );

  console.log('📊 Verification Results:');
  console.log(`   Valid: ${result.isValid ? '✅' : '❌'}`);
  console.log(`   Source Hash: ${result.sourceHash}`);
  console.log(`   DID:key: ${result.didKey}`);
  console.log(`   Blockchain Verified: ${result.blockchainVerified ? '✅' : '❌'}`);
  console.log(`   Identity Aggregated: ${result.identityAggregated ? '✅' : '⚠️'}`);

  if (result.errors.length > 0) {
    console.log('❌ Errors:');
    result.errors.forEach(error => console.log(`   - ${error}`));
  }

  if (result.warnings.length > 0) {
    console.log('⚠️ Warnings:');
    result.warnings.forEach(warning => console.log(`   - ${warning}`));
  }

  return result.isValid;
}

// Run the example if this file is executed directly
if (require.main === module) {
  verifiablePluginWorkflow()
    .then(() => {
      console.log('\n✅ Example completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Example failed:', error);
      process.exit(1);
    });
} 