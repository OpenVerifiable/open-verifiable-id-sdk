/**
 * Agent Configuration Manager
 * 
 * Manages agent configurations including validation, storage, and lifecycle
 * Implements ADR-0007: Agent Architecture and Extensibility
 */

import fs from 'fs/promises';
import path from 'path';
import { validateWithSchema } from '../../utils/jsonSchemaValidator';
import agentConfigurationSchema from '../../../architecture/schemas/agent-configuration.schema.json';
import {
  AgentConfiguration,
  AgentConfigurationValidationResult,
  AgentConfigurationManagerOptions,
  AgentConfigurationTemplate,
  AgentConfigurationExport,
  AgentConfigurationMigrationResult,
  AgentPluginConfig,
  AgentSecurityConfig,
  AgentFeaturesConfig,
  AgentEndpointsConfig,
  PluginSecurityConfig,
  PluginLifecycleConfig
} from './types.js';
import { AgentType } from '../../types/index.js';

/**
 * Default agent configuration templates
 */
const DEFAULT_TEMPLATES: AgentConfigurationTemplate[] = [
  {
    name: 'basic-user',
    description: 'Basic user agent with essential features',
    builtIn: true,
    tags: ['user', 'basic'],
    config: {
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
        },
        {
          name: 'credential-w3c',
          version: '1.0.0',
          type: 'credential-type',
          enabled: true
        }
      ]
    }
  },
  {
    name: 'secure-user',
    description: 'High-security user agent with biometric authentication',
    builtIn: true,
    tags: ['user', 'secure'],
    config: {
      agentType: AgentType.USER,
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
          enabled: true
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
  },
  {
    name: 'service-agent',
    description: 'Service agent for credential issuance',
    builtIn: true,
    tags: ['service', 'issuer'],
    config: {
      agentType: AgentType.SERVICE,
      security: {
        encryptionLevel: 'high',
        requireBiometric: false,
        keyStorageType: 'hardware',
        sandboxMode: true
      },
      features: {
        trustRegistry: true,
        schemaRegistry: true,
        carbonAwareness: true,
        biometricAuth: false,
        offlineCache: false
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
    }
  }
];

/**
 * Agent Configuration Manager
 * Handles configuration validation, storage, and lifecycle management
 */
export class AgentConfigurationManager {
  private configurations: Map<string, AgentConfiguration> = new Map();
  private options: AgentConfigurationManagerOptions;
  private storagePath: string;

  constructor(options: AgentConfigurationManagerOptions = {}) {
    this.options = {
      validateOnCreate: true,
      autoSave: true,
      storage: 'file',
      ...options
    };
    
    this.storagePath = path.join(process.cwd(), '.agent-configs');
  }

  /**
   * Create a new agent configuration
   */
  async createConfiguration(
    agentId: string,
    agentType: AgentType,
    config?: Partial<AgentConfiguration>
  ): Promise<AgentConfiguration> {
    // Merge with default configuration
    const defaultConfig = this.options.defaultConfig || DEFAULT_TEMPLATES[0].config;
    const mergedConfig: AgentConfiguration = {
      agentId,
      agentType,
      security: {
        encryptionLevel: 'standard',
        requireBiometric: false,
        keyStorageType: 'file',
        sandboxMode: false,
        ...defaultConfig.security,
        ...config?.security
      },
      features: {
        trustRegistry: true,
        schemaRegistry: true,
        carbonAwareness: false,
        biometricAuth: false,
        offlineCache: true,
        ...defaultConfig.features,
        ...config?.features
      },
      endpoints: {
        ...defaultConfig.endpoints,
        ...config?.endpoints
      },
      plugins: [
        ...(defaultConfig.plugins || []),
        ...(config?.plugins || [])
      ]
    };

    // Validate configuration if enabled
    if (this.options.validateOnCreate) {
      const validation = await this.validateConfiguration(mergedConfig);
      if (!validation.isValid) {
        throw new Error(`Invalid agent configuration: ${validation.errors.join(', ')}`);
      }
    }

    // Store configuration
    this.configurations.set(agentId, mergedConfig);

    // Auto-save if enabled
    if (this.options.autoSave) {
      await this.saveConfiguration(mergedConfig);
    }

    return mergedConfig;
  }

  /**
   * Get an agent configuration by ID
   */
  getConfiguration(agentId: string): AgentConfiguration | undefined {
    return this.configurations.get(agentId);
  }

  /**
   * Update an existing agent configuration
   */
  async updateConfiguration(
    agentId: string,
    updates: Partial<AgentConfiguration>
  ): Promise<AgentConfiguration> {
    const existing = this.configurations.get(agentId);
    if (!existing) {
      throw new Error(`Configuration not found for agent: ${agentId}`);
    }

    const updatedConfig: AgentConfiguration = {
      ...existing,
      ...updates,
      agentId, // Ensure agentId cannot be changed
      agentType: existing.agentType // Ensure agentType cannot be changed
    };

    // Validate updated configuration
    if (this.options.validateOnCreate) {
      const validation = await this.validateConfiguration(updatedConfig);
      if (!validation.isValid) {
        throw new Error(`Invalid configuration update: ${validation.errors.join(', ')}`);
      }
    }

    this.configurations.set(agentId, updatedConfig);

    if (this.options.autoSave) {
      await this.saveConfiguration(updatedConfig);
    }

    return updatedConfig;
  }

  /**
   * Delete an agent configuration
   */
  async deleteConfiguration(agentId: string): Promise<void> {
    const config = this.configurations.get(agentId);
    if (!config) {
      throw new Error(`Configuration not found for agent: ${agentId}`);
    }

    this.configurations.delete(agentId);

    // Remove from storage
    if (this.options.storage === 'file') {
      const configPath = path.join(this.storagePath, `${agentId}.json`);
      try {
        await fs.unlink(configPath);
      } catch (error) {
        // Ignore file not found errors
      }
    }
  }

  /**
   * List all agent configurations
   */
  listConfigurations(): AgentConfiguration[] {
    return Array.from(this.configurations.values());
  }

  /**
   * Validate an agent configuration against the schema
   */
  async validateConfiguration(config: AgentConfiguration): Promise<AgentConfigurationValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Validate required fields
    if (!config.agentId) errors.push('agentId is required');
    if (!config.agentType) errors.push('agentType is required');

    // Validate plugins
    if (config.plugins) {
      // Check for duplicate plugin names
      const pluginNames = config.plugins.map(p => p.name);
      const duplicates = pluginNames.filter((name, idx) => pluginNames.indexOf(name) !== idx);
      if (duplicates.length > 0) {
        errors.push(`Duplicate plugin names: ${[...new Set(duplicates)].join(', ')}`);
      }
      // Validate each plugin config
      for (const plugin of config.plugins) {
        // Validate per-plugin security settings
        if (plugin.security) {
          if (plugin.security.sandboxed && config.security?.sandboxMode === false) {
            errors.push(`Plugin '${plugin.name}' requires sandboxed execution but agent sandboxMode is false.`);
          }
          // Example: only allow certain permissions
          const allowedPermissions = ['read', 'write', 'sign', 'verify', 'network'];
          if (plugin.security.permissions) {
            const invalid = plugin.security.permissions.filter(p => !allowedPermissions.includes(p));
            if (invalid.length > 0) {
              errors.push(`Plugin '${plugin.name}' requests invalid permissions: ${invalid.join(', ')}`);
            }
          }
        }
        // Validate per-plugin lifecycle settings
        if (plugin.lifecycle) {
          if (plugin.lifecycle.lazyLoad && plugin.lifecycle.autoEnable) {
            warnings.push(`Plugin '${plugin.name}' is set to both lazyLoad and autoEnable; autoEnable will be ignored.`);
          }
        }
      }
      // Validate plugin dependencies
      for (const plugin of config.plugins) {
        if (plugin.config?.dependencies) {
          for (const dep of plugin.config.dependencies) {
            const found = config.plugins.find(p => p.name === dep.name);
            if (!found) {
              errors.push(`Plugin '${plugin.name}' requires missing dependency '${dep.name}'.`);
            } else if (dep.version && found.version !== dep.version) {
              errors.push(`Plugin '${plugin.name}' requires '${dep.name}' version '${dep.version}', found '${found.version}'.`);
            }
          }
        }
      }
    }

    try {
      // Validate against JSON schema using the correct function name
      validateWithSchema('agent-configuration.schema.json', config);

      // Additional business logic validation
      await this.validateBusinessRules(config, errors, warnings, suggestions);

    } catch (error) {
      errors.push(`Schema validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Validate business rules for agent configuration
   */
  private async validateBusinessRules(
    config: AgentConfiguration,
    errors: string[],
    warnings: string[],
    suggestions: string[]
  ): Promise<void> {
    // Check for duplicate agent IDs
    if (this.configurations.has(config.agentId)) {
      errors.push(`Agent ID '${config.agentId}' already exists`);
    }

    // Validate plugin configurations
    if (config.plugins) {
      const pluginNames = new Set<string>();
      for (const plugin of config.plugins) {
        if (pluginNames.has(plugin.name)) {
          errors.push(`Duplicate plugin name: ${plugin.name}`);
        }
        pluginNames.add(plugin.name);

        // Validate plugin version format
        if (!/^\d+\.\d+\.\d+/.test(plugin.version)) {
          errors.push(`Invalid plugin version format for ${plugin.name}: ${plugin.version}`);
        }
      }
    }

    // Validate security configuration
    if (config.security) {
      if (config.security.requireBiometric && !config.features?.biometricAuth) {
        warnings.push('Biometric authentication required but biometric features disabled');
      }

      if (config.security.keyStorageType === 'hardware' && config.security.sandboxMode) {
        warnings.push('Hardware key storage may not work properly in sandbox mode');
      }
    }

    // Validate feature dependencies
    if (config.features) {
      if (config.features.carbonAwareness && !config.endpoints?.carbonService) {
        warnings.push('Carbon awareness enabled but no carbon service endpoint configured');
      }

      if (config.features.trustRegistry && !config.endpoints?.trustRegistry) {
        warnings.push('Trust registry enabled but no trust registry endpoint configured');
      }
    }

    // Suggest improvements
    if (!config.security?.encryptionLevel || config.security.encryptionLevel === 'standard') {
      suggestions.push('Consider using high encryption level for sensitive data');
    }

    if (!config.security?.sandboxMode) {
      suggestions.push('Consider enabling sandbox mode for enhanced security');
    }
  }

  /**
   * Get available configuration templates
   */
  getTemplates(): AgentConfigurationTemplate[] {
    return [...DEFAULT_TEMPLATES];
  }

  /**
   * Create configuration from template
   */
  async createFromTemplate(
    templateName: string,
    agentId: string,
    overrides?: Partial<AgentConfiguration>
  ): Promise<AgentConfiguration> {
    const template = DEFAULT_TEMPLATES.find(t => t.name === templateName);
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }

    return await this.createConfiguration(agentId, template.config.agentType!, {
      ...template.config,
      ...overrides
    });
  }

  /**
   * Export configurations
   */
  async exportConfigurations(agentIds?: string[]): Promise<AgentConfigurationExport> {
    const configsToExport = agentIds 
      ? agentIds.map(id => this.configurations.get(id)).filter(Boolean) as AgentConfiguration[]
      : this.listConfigurations();

    const exportData: AgentConfigurationExport = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      configurations: configsToExport,
      metadata: {
        source: 'open-verifiable-id-sdk',
        description: `Exported ${configsToExport.length} agent configurations`,
        tags: ['export', 'agent-configuration']
      }
    };

    return exportData;
  }

  /**
   * Import configurations
   */
  async importConfigurations(exportData: AgentConfigurationExport): Promise<AgentConfigurationMigrationResult> {
    const result: AgentConfigurationMigrationResult = {
      migrated: 0,
      failed: 0,
      errors: [],
      warnings: []
    };

    for (const config of exportData.configurations) {
      try {
        // Validate imported configuration
        const validation = await this.validateConfiguration(config);
        if (!validation.isValid) {
          result.failed++;
          result.errors.push(`Invalid configuration for ${config.agentId}: ${validation.errors.join(', ')}`);
          continue;
        }

        // Check for conflicts
        if (this.configurations.has(config.agentId)) {
          result.warnings.push(`Configuration for ${config.agentId} already exists, skipping`);
          continue;
        }

        // Import configuration
        this.configurations.set(config.agentId, config);
        if (this.options.autoSave) {
          await this.saveConfiguration(config);
        }

        result.migrated++;
      } catch (error) {
        result.failed++;
        result.errors.push(`Failed to import configuration for ${config.agentId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return result;
  }

  /**
   * Save configuration to storage
   */
  private async saveConfiguration(config: AgentConfiguration): Promise<void> {
    if (this.options.storage === 'file') {
      await this.ensureStorageDirectory();
      const configPath = path.join(this.storagePath, `${config.agentId}.json`);
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    }
  }

  /**
   * Load configurations from storage
   */
  async loadConfigurations(): Promise<void> {
    if (this.options.storage === 'file') {
      try {
        await this.ensureStorageDirectory();
        const files = await fs.readdir(this.storagePath);
        
        for (const file of files) {
          if (file.endsWith('.json')) {
            const configPath = path.join(this.storagePath, file);
            const configData = await fs.readFile(configPath, 'utf-8');
            const config = JSON.parse(configData) as AgentConfiguration;
            
            // Validate loaded configuration
            const validation = await this.validateConfiguration(config);
            if (validation.isValid) {
              this.configurations.set(config.agentId, config);
            } else {
              console.warn(`Skipping invalid configuration ${config.agentId}:`, validation.errors);
            }
          }
        }
      } catch (error) {
        console.warn('Failed to load configurations from storage:', error);
      }
    }
  }

  /**
   * Ensure storage directory exists
   */
  private async ensureStorageDirectory(): Promise<void> {
    try {
      await fs.access(this.storagePath);
    } catch {
      await fs.mkdir(this.storagePath, { recursive: true });
    }
  }

  /**
   * Get configuration statistics
   */
  getStatistics(): {
    total: number;
    byType: Record<AgentType, number>;
    bySecurityLevel: Record<string, number>;
  } {
    const stats = {
      total: this.configurations.size,
      byType: {
        [AgentType.USER]: 0,
        [AgentType.PACKAGE]: 0,
        [AgentType.PARENT]: 0,
        [AgentType.SERVICE]: 0
      },
      bySecurityLevel: {
        standard: 0,
        high: 0
      }
    };

    for (const config of this.configurations.values()) {
      stats.byType[config.agentType]++;
      const securityLevel = config.security?.encryptionLevel || 'standard';
      stats.bySecurityLevel[securityLevel]++;
    }

    return stats;
  }
} 