/**
 * Agent Configuration Client
 * 
 * High-level interface for managing agent configurations
 * Integrates with the existing agent system and provides easy-to-use APIs
 * Implements ADR-0007: Agent Architecture and Extensibility
 */

import { AgentConfigurationManager } from './configuration-manager.js';
import { AgentFactory, createAgent } from './factory.js';
import {
  AgentConfiguration,
  AgentConfigurationManagerOptions,
  AgentConfigurationTemplate,
  AgentConfigurationExport,
  AgentConfigurationMigrationResult,
  AgentConfigurationValidationResult
} from './types.js';
import { AgentType, OpenVerifiableAgent } from '../../types/index.js';

/**
 * Agent Configuration Client Options
 */
export interface AgentConfigurationClientOptions extends AgentConfigurationManagerOptions {
  /** Whether to auto-initialize the configuration manager */
  autoInitialize?: boolean;
  /** Whether to load existing configurations on startup */
  loadExisting?: boolean;
  /** Default agent factory to use for agent creation */
  agentFactory?: AgentFactory;
}

/**
 * Agent Configuration Client
 * Provides high-level interface for agent configuration management
 */
export class AgentConfigurationClient {
  private configManager: AgentConfigurationManager;
  private agentFactory: AgentFactory;
  private options: AgentConfigurationClientOptions;
  private initialized = false;

  constructor(options: AgentConfigurationClientOptions = {}) {
    this.options = {
      autoInitialize: true,
      loadExisting: true,
      ...options
    };

    this.configManager = new AgentConfigurationManager(this.options);
    this.agentFactory = this.options.agentFactory || AgentFactory.getInstance();
  }

  /**
   * Initialize the configuration client
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (this.options.loadExisting) {
      await this.configManager.loadConfigurations();
    }

    this.initialized = true;
  }

  /**
   * Create a new agent with configuration
   */
  async createAgent(
    agentId: string,
    agentType: AgentType,
    config?: Partial<AgentConfiguration>
  ): Promise<OpenVerifiableAgent> {
    await this.ensureInitialized();

    // Create configuration first
    const agentConfig = await this.configManager.createConfiguration(agentId, agentType, config);

    // Create agent using convenience function
    const agent = await createAgent(agentType, agentId, agentConfig);

    return agent as OpenVerifiableAgent;
  }

  /**
   * Create agent from template
   */
  async createAgentFromTemplate(
    templateName: string,
    agentId: string,
    overrides?: Partial<AgentConfiguration>
  ): Promise<OpenVerifiableAgent> {
    await this.ensureInitialized();

    // Create configuration from template
    const agentConfig = await this.configManager.createFromTemplate(templateName, agentId, overrides);

    // Create agent using convenience function
    const agent = await createAgent(agentConfig.agentType, agentId, agentConfig);

    return agent as OpenVerifiableAgent;
  }

  /**
   * Get agent configuration
   */
  async getAgentConfiguration(agentId: string): Promise<AgentConfiguration | undefined> {
    await this.ensureInitialized();
    return this.configManager.getConfiguration(agentId);
  }

  /**
   * Update agent configuration
   */
  async updateAgentConfiguration(
    agentId: string,
    updates: Partial<AgentConfiguration>
  ): Promise<AgentConfiguration> {
    await this.ensureInitialized();
    return await this.configManager.updateConfiguration(agentId, updates);
  }

  /**
   * Delete agent configuration
   */
  async deleteAgentConfiguration(agentId: string): Promise<void> {
    await this.ensureInitialized();
    await this.configManager.deleteConfiguration(agentId);
  }

  /**
   * List all agent configurations
   */
  async listAgentConfigurations(): Promise<AgentConfiguration[]> {
    await this.ensureInitialized();
    return this.configManager.listConfigurations();
  }

  /**
   * Validate agent configuration
   */
  async validateAgentConfiguration(config: AgentConfiguration): Promise<AgentConfigurationValidationResult> {
    await this.ensureInitialized();
    return await this.configManager.validateConfiguration(config);
  }

  /**
   * Get available configuration templates
   */
  async getConfigurationTemplates(): Promise<AgentConfigurationTemplate[]> {
    await this.ensureInitialized();
    return this.configManager.getTemplates();
  }

  /**
   * Export agent configurations
   */
  async exportAgentConfigurations(agentIds?: string[]): Promise<AgentConfigurationExport> {
    await this.ensureInitialized();
    return await this.configManager.exportConfigurations(agentIds);
  }

  /**
   * Import agent configurations
   */
  async importAgentConfigurations(exportData: AgentConfigurationExport): Promise<AgentConfigurationMigrationResult> {
    await this.ensureInitialized();
    return await this.configManager.importConfigurations(exportData);
  }

  /**
   * Get configuration statistics
   */
  async getConfigurationStatistics(): Promise<{
    total: number;
    byType: Record<AgentType, number>;
    bySecurityLevel: Record<string, number>;
  }> {
    await this.ensureInitialized();
    return this.configManager.getStatistics();
  }

  /**
   * Create a quick user agent with basic configuration
   */
  async createQuickUserAgent(userId: string): Promise<OpenVerifiableAgent> {
    return await this.createAgentFromTemplate('basic-user', `user-${userId}`);
  }

  /**
   * Create a secure user agent with high-security configuration
   */
  async createSecureUserAgent(userId: string): Promise<OpenVerifiableAgent> {
    return await this.createAgentFromTemplate('secure-user', `user-${userId}`);
  }

  /**
   * Create a service agent for credential issuance
   */
  async createServiceAgent(serviceId: string): Promise<OpenVerifiableAgent> {
    return await this.createAgentFromTemplate('service-agent', `service-${serviceId}`);
  }

  /**
   * Create a package agent for package management
   */
  async createPackageAgent(packageId: string): Promise<OpenVerifiableAgent> {
    return await this.createAgent(`package-${packageId}`, AgentType.PACKAGE, {
      security: {
        encryptionLevel: 'standard',
        requireBiometric: false,
        keyStorageType: 'file',
        sandboxMode: true
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
        },
        {
          name: 'credential-w3c',
          version: '1.0.0',
          type: 'credential-type',
          enabled: true
        }
      ]
    });
  }

  /**
   * Create a parent agent for managing child agents
   */
  async createParentAgent(parentId: string): Promise<OpenVerifiableAgent> {
    return await this.createAgent(`parent-${parentId}`, AgentType.PARENT, {
      security: {
        encryptionLevel: 'high',
        requireBiometric: false,
        keyStorageType: 'keychain',
        sandboxMode: true
      },
      features: {
        trustRegistry: true,
        schemaRegistry: true,
        carbonAwareness: true,
        biometricAuth: false,
        offlineCache: true
      },
      plugins: [
        {
          name: 'did-cheqd',
          version: '1.0.0',
          type: 'did-method',
          enabled: true
        },
        {
          name: 'credential-w3c',
          version: '1.0.0',
          type: 'credential-type',
          enabled: true
        },
        {
          name: 'trust-registry',
          version: '1.0.0',
          type: 'utility',
          enabled: true
        }
      ]
    });
  }

  /**
   * Clone an existing agent configuration
   */
  async cloneAgentConfiguration(
    sourceAgentId: string,
    newAgentId: string,
    overrides?: Partial<AgentConfiguration>
  ): Promise<AgentConfiguration> {
    await this.ensureInitialized();

    const sourceConfig = this.configManager.getConfiguration(sourceAgentId);
    if (!sourceConfig) {
      throw new Error(`Source agent configuration not found: ${sourceAgentId}`);
    }

    const clonedConfig: AgentConfiguration = {
      ...sourceConfig,
      agentId: newAgentId,
      ...overrides
    };

    // Validate cloned configuration
    const validation = await this.configManager.validateConfiguration(clonedConfig);
    if (!validation.isValid) {
      throw new Error(`Invalid cloned configuration: ${validation.errors.join(', ')}`);
    }

    // Store cloned configuration
    this.configManager['configurations'].set(newAgentId, clonedConfig);
    if (this.options.autoSave) {
      await this.configManager['saveConfiguration'](clonedConfig);
    }

    return clonedConfig;
  }

  /**
   * Get configuration recommendations based on use case
   */
  getConfigurationRecommendations(useCase: string): AgentConfigurationTemplate[] {
    const recommendations: AgentConfigurationTemplate[] = [];

    switch (useCase.toLowerCase()) {
      case 'personal':
      case 'individual':
        recommendations.push(
          this.configManager.getTemplates().find(t => t.name === 'basic-user')!,
          this.configManager.getTemplates().find(t => t.name === 'secure-user')!
        );
        break;

      case 'service':
      case 'issuer':
      case 'organization':
        recommendations.push(
          this.configManager.getTemplates().find(t => t.name === 'service-agent')!
        );
        break;

      case 'development':
      case 'testing':
        recommendations.push(
          this.configManager.getTemplates().find(t => t.name === 'basic-user')!
        );
        break;

      default:
        recommendations.push(...this.configManager.getTemplates());
    }

    return recommendations;
  }

  /**
   * Ensure the client is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized && this.options.autoInitialize) {
      await this.initialize();
    }

    if (!this.initialized) {
      throw new Error('AgentConfigurationClient not initialized. Call initialize() first.');
    }
  }

  /**
   * Get the underlying configuration manager
   */
  getConfigurationManager(): AgentConfigurationManager {
    return this.configManager;
  }

  /**
   * Get the underlying agent factory
   */
  getAgentFactory(): AgentFactory {
    return this.agentFactory;
  }
}

/**
 * Convenience factory function for creating agent configuration client
 */
export function createAgentConfigurationClient(
  options?: AgentConfigurationClientOptions
): AgentConfigurationClient {
  return new AgentConfigurationClient(options);
}

/**
 * Convenience function for creating a quick user agent
 */
export async function createQuickUserAgent(
  userId: string,
  options?: AgentConfigurationClientOptions
): Promise<OpenVerifiableAgent> {
  const client = createAgentConfigurationClient(options);
  await client.initialize();
  return await client.createQuickUserAgent(userId);
}

/**
 * Convenience function for creating a secure user agent
 */
export async function createSecureUserAgent(
  userId: string,
  options?: AgentConfigurationClientOptions
): Promise<OpenVerifiableAgent> {
  const client = createAgentConfigurationClient(options);
  await client.initialize();
  return await client.createSecureUserAgent(userId);
} 