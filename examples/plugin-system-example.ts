/**
 * Plugin System Example for Open Verifiable ID SDK
 * 
 * This example demonstrates:
 * - Creating and registering plugins
 * - Plugin lifecycle management
 * - Security sandboxing
 * - Plugin discovery
 * - Verification and licensing
 */

import {
  BasePlugin,
  BaseVerifiablePlugin,
  PluginManager,
  PluginSecuritySandbox,
  PluginDiscovery,
  PluginLicenseManager,
  PluginVerificationEngine,
  SourceVerificationEngine,
  CheqdPaymentClient,
  CheqdTrustChainClient,
  Plugin,
  PluginContext,
  PluginMetadata,
  SourceVerification,
  ValidationResult,
  VerificationResult,
  SourceVerificationResult,
  TrustChainVerificationResult
} from '../src/core/plugins/index.js';

/**
 * Example regular plugin
 */
class ExampleUtilityPlugin extends BasePlugin {
  constructor() {
    super(
      'example-utility',
      'Example Utility Plugin',
      '1.0.0',
      'regular',
      'utility',
      {
        name: 'Example Author',
        did: 'did:key:example123'
      },
      ['utility', 'example'],
      {
        description: 'An example utility plugin',
        config: { enabled: true }
      }
    );
  }

  protected async onInitialize(context: PluginContext): Promise<void> {
    console.log(`Initializing ${this.name} plugin`);
    // Plugin-specific initialization logic
  }

  protected async onCleanup(): Promise<void> {
    console.log(`Cleaning up ${this.name} plugin`);
    // Plugin-specific cleanup logic
  }

  protected async onValidateConfig(config: any): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config.enabled && config.enabled !== false) {
      errors.push('enabled field is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Plugin-specific functionality
  async performUtilityTask(input: string): Promise<string> {
    return `Utility task completed: ${input}`;
  }
}

/**
 * Example verifiable plugin
 */
class ExampleVerifiablePlugin extends BaseVerifiablePlugin {
  constructor() {
    const sourceVerification: SourceVerification = {
      sourceDID: 'did:key:source123',
      bundleHash: 'sha256:example-bundle-hash',
      packageDID: 'did:key:package123',
      sourceHash: 'sha256:example-source-hash',
      identityAggregated: true,
      blockchainVerified: true,
      verificationMethod: 'hybrid'
    };

    super(
      'example-verifiable',
      'Example Verifiable Plugin',
      '1.0.0',
      'did-method',
      {
        name: 'Verifiable Author',
        did: 'did:key:verifiable123'
      },
      ['did-method', 'verifiable'],
      sourceVerification,
      {
        description: 'An example verifiable plugin',
        verificationLevel: 'full',
        monetization: {
          requiresLicense: true,
          licenseType: 'paid',
          price: {
            amount: 10,
            currency: 'USD',
            description: 'Example plugin license'
          },
          validityPeriod: 365
        }
      }
    );
  }

  protected async onInitialize(context: PluginContext): Promise<void> {
    console.log(`Initializing ${this.name} verifiable plugin`);
    // Plugin-specific initialization logic
  }

  protected async onCleanup(): Promise<void> {
    console.log(`Cleaning up ${this.name} verifiable plugin`);
    // Plugin-specific cleanup logic
  }

  protected async onValidateConfig(config: any): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!config) {
      errors.push('Configuration is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  protected async onVerifyIntegrity(): Promise<VerificationResult> {
    // Plugin-specific integrity verification
    return {
      isValid: true,
      method: 'online',
      timestamp: new Date().toISOString()
    };
  }

  protected async onVerifySource(): Promise<SourceVerificationResult> {
    // Plugin-specific source verification
    return {
      isValid: true,
      sourceHash: this.sourceVerification.sourceHash || '',
      didKey: this.sourceVerification.sourceDID,
      blockchainVerified: this.sourceVerification.blockchainVerified || false,
      identityAggregated: this.sourceVerification.identityAggregated || false,
      errors: [],
      warnings: []
    };
  }

  protected async onVerifyTrustChain(): Promise<TrustChainVerificationResult> {
    // Plugin-specific trust chain verification
    return {
      isValid: true,
      trustLevel: 'verified',
      chainLength: 2,
      dnsAnchored: true,
      governanceFramework: 'Open Verifiable Plugin Ecosystem',
      verificationPath: ['root-tao', 'platform', this.author.did],
      errors: [],
      warnings: []
    };
  }

  // Plugin-specific functionality
  async createDID(method: string, options?: any): Promise<string> {
    return `did:${method}:example-${Date.now()}`;
  }
}

/**
 * Example plugin context
 */
function createExamplePluginContext(): PluginContext {
  return {
    agentType: 'user',
    agentId: 'example-agent',
    storage: {
      store: async (key: string, value: any) => console.log(`Storing ${key}`),
      get: async (key: string) => null,
      delete: async (key: string) => console.log(`Deleting ${key}`),
      listKeys: async () => [],
      clear: async () => console.log('Clearing storage')
    },
    permissions: {
      has: (permission: string) => true,
      request: async (permission: string) => true,
      list: () => ['all']
    },
    events: {
      subscribe: (event: string, handler: (data: any) => void) => {},
      unsubscribe: (event: string, handler: (data: any) => void) => {},
      publish: (event: string, data: any) => console.log(`Event: ${event}`, data)
    },
    apis: {}
  };
}

/**
 * Main example function
 */
export async function runPluginSystemExample(): Promise<void> {
  console.log('=== Plugin System Example ===\n');

  try {
    // 1. Initialize plugin manager
    console.log('1. Initializing plugin manager...');
    const pluginManager = new PluginManager({
      enableVerification: true,
      enableSandboxing: true,
      maxPlugins: 10
    });
    await pluginManager.initialize();
    console.log('✓ Plugin manager initialized\n');

    // 2. Create plugins
    console.log('2. Creating plugins...');
    const utilityPlugin = new ExampleUtilityPlugin();
    const verifiablePlugin = new ExampleVerifiablePlugin();
    console.log('✓ Plugins created\n');

    // 3. Create plugin context
    console.log('3. Creating plugin context...');
    const context = createExamplePluginContext();
    console.log('✓ Plugin context created\n');

    // 4. Register plugins
    console.log('4. Registering plugins...');
    const utilityResult = await pluginManager.registerPlugin(utilityPlugin, context);
    console.log(`Utility plugin registration: ${utilityResult.success ? 'SUCCESS' : 'FAILED'}`);
    if (utilityResult.errors?.length) {
      console.log(`Errors: ${utilityResult.errors.join(', ')}`);
    }

    const verifiableResult = await pluginManager.registerPlugin(verifiablePlugin, context);
    console.log(`Verifiable plugin registration: ${verifiableResult.success ? 'SUCCESS' : 'FAILED'}`);
    if (verifiableResult.errors?.length) {
      console.log(`Errors: ${verifiableResult.errors.join(', ')}`);
    }
    console.log('✓ Plugins registered\n');

    // 5. Test plugin functionality
    console.log('5. Testing plugin functionality...');
    const utilityResult2 = await utilityPlugin.performUtilityTask('test input');
    console.log(`Utility plugin result: ${utilityResult2}`);

    const didResult = await verifiablePlugin.createDID('key');
    console.log(`Verifiable plugin DID: ${didResult}`);
    console.log('✓ Plugin functionality tested\n');

    // 6. Test plugin verification
    console.log('6. Testing plugin verification...');
    const integrityResult = await verifiablePlugin.verifyIntegrity();
    console.log(`Integrity verification: ${integrityResult.isValid ? 'PASSED' : 'FAILED'}`);

    const sourceResult = await verifiablePlugin.verifySource();
    console.log(`Source verification: ${sourceResult.isValid ? 'PASSED' : 'FAILED'}`);

    const trustChainResult = await verifiablePlugin.verifyTrustChain();
    console.log(`Trust chain verification: ${trustChainResult.isValid ? 'PASSED' : 'FAILED'}`);
    console.log('✓ Plugin verification tested\n');

    // 7. Test security sandbox
    console.log('7. Testing security sandbox...');
    const sandbox = new PluginSecuritySandbox({
      strict: true,
      monitoring: true
    });

    const sandboxId = sandbox.createSandbox(utilityPlugin, context);
    const sandboxResult = await sandbox.executeInSandbox(sandboxId, async () => {
      return await utilityPlugin.performUtilityTask('sandbox test');
    });

    console.log(`Sandbox execution: ${sandboxResult.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`Sandbox result: ${sandboxResult.result}`);
    console.log(`Sandbox violations: ${sandboxResult.violations.length}`);
    console.log('✓ Security sandbox tested\n');

    // 8. Test plugin discovery
    console.log('8. Testing plugin discovery...');
    const discovery = new PluginDiscovery({
      sources: [
        {
          type: 'local',
          location: './plugins'
        }
      ],
      enableCache: true,
      validatePlugins: true
    });

    const discoveryResult = await discovery.discoverPlugins();
    console.log(`Discovery found ${discoveryResult.plugins.length} plugins`);
    console.log(`Discovery duration: ${discoveryResult.duration}ms`);
    console.log('✓ Plugin discovery tested\n');

    // 9. Get plugin statistics
    console.log('9. Plugin statistics...');
    const stats = pluginManager.getStatistics();
    console.log(`Total plugins: ${stats.total}`);
    console.log(`Enabled plugins: ${stats.enabled}`);
    console.log(`Disabled plugins: ${stats.disabled}`);
    console.log(`By category:`, stats.byCategory);
    console.log(`By type:`, stats.byType);
    console.log('✓ Statistics retrieved\n');

    // 10. Cleanup
    console.log('10. Cleaning up...');
    await pluginManager.cleanup();
    sandbox.destroySandbox(sandboxId);
    console.log('✓ Cleanup completed\n');

    console.log('=== Plugin System Example Completed Successfully ===');

  } catch (error) {
    console.error('Plugin system example failed:', error);
    throw error;
  }
}

// Run the example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runPluginSystemExample().catch(console.error);
} 