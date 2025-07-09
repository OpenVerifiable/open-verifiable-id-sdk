/**
 * Agent Configuration Examples
 * 
 * Demonstrates how to use the agent configuration system for different use cases
 * Based on ADR-0007: Agent Architecture and Extensibility
 */

import {
  AgentConfigurationClient,
  createAgentConfigurationClient,
  createQuickUserAgent,
  createSecureUserAgent,
  AgentType,
  AgentConfiguration
} from '../index';

/**
 * Example 1: Basic User Agent Setup
 * 
 * Creates a simple user agent with basic configuration for personal use
 */
export async function basicUserAgentExample(): Promise<void> {
  console.log('=== Basic User Agent Example ===');

  // Create a quick user agent with default configuration
  const userAgent = await createQuickUserAgent('john-doe');
  
  console.log(`Created user agent: ${userAgent.agentId}`);
  console.log(`Agent type: ${userAgent.agentType}`);
  
  // The agent is ready to use for basic identity operations
  const did = await userAgent.createDID('key');
  console.log(`Created DID: ${did.did}`);
}

/**
 * Example 2: Secure User Agent Setup
 * 
 * Creates a high-security user agent with biometric authentication
 */
export async function secureUserAgentExample(): Promise<void> {
  console.log('=== Secure User Agent Example ===');

  // Create a secure user agent with enhanced security
  const secureAgent = await createSecureUserAgent('jane-smith');
  
  console.log(`Created secure agent: ${secureAgent.agentId}`);
  console.log(`Agent type: ${secureAgent.agentType}`);
  
  // This agent has high encryption and biometric authentication enabled
  const did = await secureAgent.createDID('cheqd:mainnet');
  console.log(`Created secure DID: ${did.did}`);
}

/**
 * Example 3: Custom Agent Configuration
 * 
 * Creates an agent with custom configuration for specific requirements
 */
export async function customAgentConfigurationExample(): Promise<void> {
  console.log('=== Custom Agent Configuration Example ===');

  const configClient = createAgentConfigurationClient({
    autoInitialize: true,
    validateOnCreate: true
  });

  // Create a custom user agent with specific configuration
  const customAgent = await configClient.createAgent(
    'custom-user',
    AgentType.USER,
    {
      security: {
        encryptionLevel: 'high',
        requireBiometric: true,
        keyStorageType: 'keychain',
        sandboxMode: true
      },
      features: {
        trustRegistry: true,
        schemaRegistry: true,
        carbonAwareness: true,
        biometricAuth: true,
        offlineCache: true
      },
      endpoints: {
        schemaRegistry: 'https://schema.openverifiable.org',
        trustRegistry: 'https://trust.openverifiable.org',
        carbonService: 'https://carbon.openverifiable.org'
      },
      plugins: [
        {
          name: 'did-key',
          version: '1.0.0',
          type: 'did-method',
          enabled: true
        },
        {
          name: 'did-cheqd',
          version: '1.0.0',
          type: 'did-method',
          enabled: true,
          config: {
            network: 'mainnet'
          }
        },
        {
          name: 'credential-w3c',
          version: '1.0.0',
          type: 'credential-type',
          enabled: true
        },
        {
          name: 'biometric-auth',
          version: '1.0.0',
          type: 'utility',
          enabled: true
        }
      ]
    }
  );

  console.log(`Created custom agent: ${customAgent.agentId}`);
  
  // Validate the configuration
  const config = await configClient.getAgentConfiguration('custom-user');
  if (config) {
    console.log('Configuration validation passed');
    console.log(`Security level: ${config.security?.encryptionLevel}`);
    console.log(`Biometric required: ${config.security?.requireBiometric}`);
    console.log(`Plugins enabled: ${config.plugins?.length}`);
  }
}

/**
 * Example 4: Service Agent for Credential Issuance
 * 
 * Creates a service agent optimized for credential issuance
 */
export async function serviceAgentExample(): Promise<void> {
  console.log('=== Service Agent Example ===');

  const configClient = createAgentConfigurationClient();

  // Create a service agent for credential issuance
  const serviceAgent = await configClient.createServiceAgent('issuer-service');
  
  console.log(`Created service agent: ${serviceAgent.agentId}`);
  console.log(`Agent type: ${serviceAgent.agentType}`);
  
  // Service agents are optimized for high-volume credential operations
  const did = await serviceAgent.createDID('cheqd:mainnet');
  console.log(`Created issuer DID: ${did.did}`);
}

/**
 * Example 5: Configuration Management
 * 
 * Demonstrates configuration management operations
 */
export async function configurationManagementExample(): Promise<void> {
  console.log('=== Configuration Management Example ===');

  const configClient = createAgentConfigurationClient();

  // List available templates
  const templates = await configClient.getConfigurationTemplates();
  console.log('Available templates:');
  templates.forEach(template => {
    console.log(`- ${template.name}: ${template.description}`);
  });

  // Get configuration recommendations
  const personalRecs = configClient.getConfigurationRecommendations('personal');
  console.log(`Personal use recommendations: ${personalRecs.length} templates`);

  const serviceRecs = configClient.getConfigurationRecommendations('service');
  console.log(`Service use recommendations: ${serviceRecs.length} templates`);

  // List all configurations
  const configs = await configClient.listAgentConfigurations();
  console.log(`Total configurations: ${configs.length}`);

  // Get configuration statistics
  const stats = await configClient.getConfigurationStatistics();
  console.log('Configuration statistics:');
  console.log(`- Total: ${stats.total}`);
  console.log(`- User agents: ${stats.byType[AgentType.USER]}`);
  console.log(`- Service agents: ${stats.byType[AgentType.SERVICE]}`);
  console.log(`- High security: ${stats.bySecurityLevel.high}`);
}

/**
 * Example 6: Configuration Import/Export
 * 
 * Demonstrates configuration backup and migration
 */
export async function configurationImportExportExample(): Promise<void> {
  console.log('=== Configuration Import/Export Example ===');

  const configClient = createAgentConfigurationClient();

  // Create some test configurations
  await configClient.createQuickUserAgent('export-test-1');
  await configClient.createSecureUserAgent('export-test-2');
  await configClient.createServiceAgent('export-test-3');

  // Export configurations
  const exportData = await configClient.exportAgentConfigurations();
  console.log(`Exported ${exportData.configurations.length} configurations`);
  console.log(`Export version: ${exportData.version}`);
  console.log(`Export timestamp: ${exportData.timestamp}`);

  // Import configurations (simulating migration to new system)
  const importResult = await configClient.importAgentConfigurations(exportData);
  console.log(`Import result: ${importResult.migrated} migrated, ${importResult.failed} failed`);
  
  if (importResult.warnings.length > 0) {
    console.log('Import warnings:', importResult.warnings);
  }
}

/**
 * Example 7: Configuration Validation
 * 
 * Demonstrates configuration validation and error handling
 */
export async function configurationValidationExample(): Promise<void> {
  console.log('=== Configuration Validation Example ===');

  const configClient = createAgentConfigurationClient();

  // Test valid configuration
  const validConfig: AgentConfiguration = {
    agentId: 'test-valid',
    agentType: AgentType.USER,
    security: {
      encryptionLevel: 'standard',
      requireBiometric: false,
      keyStorageType: 'file',
      sandboxMode: false
    },
    features: {
      trustRegistry: true,
      schemaRegistry: true,
      carbonAwareness: false,
      biometricAuth: false,
      offlineCache: true
    },
    plugins: [
      {
        name: 'did-key',
        version: '1.0.0',
        type: 'did-method',
        enabled: true
      }
    ]
  };

  const validResult = await configClient.validateAgentConfiguration(validConfig);
  console.log(`Valid configuration: ${validResult.isValid}`);
  if (validResult.warnings.length > 0) {
    console.log('Warnings:', validResult.warnings);
  }

  // Test invalid configuration
  const invalidConfig: AgentConfiguration = {
    agentId: 'test-invalid',
    agentType: AgentType.USER,
    plugins: [
      {
        name: 'test-plugin',
        version: 'invalid-version',
        type: 'did-method',
        enabled: true
      }
    ]
  };

  const invalidResult = await configClient.validateAgentConfiguration(invalidConfig);
  console.log(`Invalid configuration: ${invalidResult.isValid}`);
  console.log('Errors:', invalidResult.errors);
}

/**
 * Example 8: Configuration Cloning
 * 
 * Demonstrates cloning and modifying existing configurations
 */
export async function configurationCloningExample(): Promise<void> {
  console.log('=== Configuration Cloning Example ===');

  const configClient = createAgentConfigurationClient();

  // Create an original configuration
  await configClient.createQuickUserAgent('original-user');

  // Clone the configuration with modifications
  const clonedConfig = await configClient.cloneAgentConfiguration(
    'user-original-user',
    'cloned-user',
    {
      security: {
        encryptionLevel: 'high',
        requireBiometric: true
      },
      features: {
        carbonAwareness: true
      }
    }
  );

  console.log(`Cloned configuration: ${clonedConfig.agentId}`);
  console.log(`Security level: ${clonedConfig.security?.encryptionLevel}`);
  console.log(`Biometric required: ${clonedConfig.security?.requireBiometric}`);
  console.log(`Carbon awareness: ${clonedConfig.features?.carbonAwareness}`);
}

/**
 * Main example runner
 */
export async function runAllExamples(): Promise<void> {
  console.log('Running Agent Configuration Examples\n');

  try {
    await basicUserAgentExample();
    console.log();

    await secureUserAgentExample();
    console.log();

    await customAgentConfigurationExample();
    console.log();

    await serviceAgentExample();
    console.log();

    await configurationManagementExample();
    console.log();

    await configurationImportExportExample();
    console.log();

    await configurationValidationExample();
    console.log();

    await configurationCloningExample();
    console.log();

    console.log('All examples completed successfully!');
  } catch (error) {
    console.error('Example failed:', error);
  }
}

// Individual examples are already exported above 