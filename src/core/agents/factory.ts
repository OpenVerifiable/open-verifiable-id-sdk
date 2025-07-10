/**
 * Agent Factory - creates and configures agent instances
 * Extended with monetized plugin support (ADR-0046)
 */

import { AgentType } from '../../types/index.js';
import { UserAgent, UserAgentConfig } from './user-agent.js';
import { PackageAgent, PackageAgentConfig } from './package-agent.js';
import { ParentAgent, ParentAgentConfig } from './parent-agent.js';
import { ServiceAgent, ServiceAgentConfig } from './service-agent.js';
import { BaseAgent } from './base.js';
import { PluginLicenseManager, PluginInstallationConfig } from '../plugins/license-manager.js';
import { PluginFactory } from '../plugins/plugin-factory.js';
import { PluginManager } from '../plugins/manager.js';
import { PluginStorageManager } from '../plugins/storage-manager.js';

export type AgentConfig = 
  | { type: AgentType.USER; config: UserAgentConfig }
  | { type: AgentType.PACKAGE; config: PackageAgentConfig }
  | { type: AgentType.PARENT; config: ParentAgentConfig }
  | { type: AgentType.SERVICE; config: ServiceAgentConfig };

export class AgentFactory {
  private static instance: AgentFactory;
  private agents: Map<string, BaseAgent> = new Map();
  private licenseManager: PluginLicenseManager;

  private constructor() {
    this.licenseManager = new PluginLicenseManager();
  }

  static getInstance(): AgentFactory {
    if (!AgentFactory.instance) {
      AgentFactory.instance = new AgentFactory();
    }
    return AgentFactory.instance;
  }

  // Static method for backward compatibility and test expectations
  static async createAgent(
    type: AgentType, 
    agentId?: string, 
    config?: any
  ): Promise<BaseAgent> {
    const factory = AgentFactory.getInstance();
    
    // Create appropriate config based on agent type
    let agentConfig: AgentConfig;
    
    switch (type) {
      case AgentType.USER:
        agentConfig = {
          type: AgentType.USER,
          config: {
            userId: agentId || 'default-user',
            ...config
          }
        };
        break;
      case AgentType.PACKAGE:
        agentConfig = {
          type: AgentType.PACKAGE,
          config: {
            packageName: agentId || 'default-package',
            packageVersion: config?.version || '1.0.0',
            ...config
          }
        };
        break;
      case AgentType.PARENT:
        agentConfig = {
          type: AgentType.PARENT,
          config: {
            organizationId: agentId || 'default-org',
            ...config
          }
        };
        break;
      case AgentType.SERVICE:
        agentConfig = {
          type: AgentType.SERVICE,
          config: {
            serviceId: agentId || 'default-service',
            serviceConfig: config?.serviceConfig || { endpoint: 'http://localhost' },
            ...config
          }
        };
        break;
      default:
        throw new Error(`Unknown agent type: ${type}`);
    }
    
    return factory.createAgent(agentConfig);
  }

  async createAgent(agentConfig: AgentConfig): Promise<BaseAgent> {
    let agent: BaseAgent;

    try {
      console.log('Creating agent with config:', agentConfig);
      
      switch (agentConfig.type) {
        case AgentType.USER:
          agent = new UserAgent(agentConfig.config);
          break;
        case AgentType.PACKAGE:
          agent = new PackageAgent(agentConfig.config);
          break;
        case AgentType.PARENT:
          agent = new ParentAgent(agentConfig.config);
          break;
        case AgentType.SERVICE:
          agent = new ServiceAgent(agentConfig.config);
          break;
        default:
          const type = (agentConfig as any).type;
          throw new Error(`Unsupported agent type: ${type}`);
      }

      console.log('Agent created:', agent);
      console.log('Agent agentId:', agent.agentId);

      // Initialize the agent
      await agent.initialize();

      // Store the agent instance
      const agentId = agent.agentId;
      this.agents.set(agentId, agent);

      return agent;
    } catch (error) {
      console.error('Error creating agent:', error);
      throw error;
    }
  }

  getAgent(agentId: string): BaseAgent | undefined {
    return this.agents.get(agentId);
  }

  listAgents(): string[] {
    return Array.from(this.agents.keys());
  }

  async removeAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (agent) {
      await agent.cleanup();
      this.agents.delete(agentId);
    }
  }

  // Add a cleanup method for test compatibility
  async cleanup(): Promise<void> {
    for (const agent of this.agents.values()) {
      if (typeof agent.cleanup === 'function') {
        await agent.cleanup();
      }
    }
    this.agents.clear();
  }

  // Overloaded agent creation methods for test compatibility
  async createUserAgent(configOrUserId: UserAgentConfig | string): Promise<UserAgent> {
    if (typeof configOrUserId === 'string') {
      // Called as createUserAgent('test-user')
      if (!configOrUserId.trim()) {
        throw new Error('User ID cannot be empty');
      }
      return this.createAgent({ type: AgentType.USER, config: { userId: configOrUserId } }) as Promise<UserAgent>;
    }
    // Called as createUserAgent({ userId: ... })
    if (!configOrUserId.userId?.trim()) {
      throw new Error('User ID cannot be empty');
    }
    return this.createAgent({ type: AgentType.USER, config: configOrUserId }) as Promise<UserAgent>;
  }

  async createPackageAgent(configOrName: PackageAgentConfig | string, version?: string): Promise<PackageAgent> {
    if (typeof configOrName === 'string') {
      // Called as createPackageAgent('pkg', '1.0.0')
      if (!configOrName.trim()) {
        throw new Error('Package name cannot be empty');
      }
      return this.createAgent({ type: AgentType.PACKAGE, config: { packageName: configOrName, packageVersion: version || '1.0.0' } }) as Promise<PackageAgent>;
    }
    // Called as createPackageAgent({ packageName: ..., packageVersion: ... })
    if (!configOrName.packageName?.trim()) {
      throw new Error('Package name cannot be empty');
    }
    return this.createAgent({ type: AgentType.PACKAGE, config: configOrName }) as Promise<PackageAgent>;
  }

  async createParentAgent(configOrOrgId: ParentAgentConfig | string): Promise<ParentAgent> {
    if (typeof configOrOrgId === 'string') {
      // Called as createParentAgent('org')
      if (!configOrOrgId.trim()) {
        throw new Error('Organization ID cannot be empty');
      }
      return this.createAgent({ type: AgentType.PARENT, config: { organizationId: configOrOrgId } }) as Promise<ParentAgent>;
    }
    // Called as createParentAgent({ organizationId: ... })
    if (!configOrOrgId.organizationId?.trim()) {
      throw new Error('Organization ID cannot be empty');
    }
    return this.createAgent({ type: AgentType.PARENT, config: configOrOrgId }) as Promise<ParentAgent>;
  }

  async createServiceAgent(configOrServiceId: ServiceAgentConfig | string, config?: any): Promise<ServiceAgent> {
    if (typeof configOrServiceId === 'string') {
      // Called as createServiceAgent('service', { ... })
      if (!configOrServiceId.trim()) {
        throw new Error('Service ID cannot be empty');
      }
      return this.createAgent({ type: AgentType.SERVICE, config: { serviceId: configOrServiceId, ...config } }) as Promise<ServiceAgent>;
    }
    // Called as createServiceAgent({ serviceId: ... })
    if (!configOrServiceId.serviceId?.trim()) {
      throw new Error('Service ID cannot be empty');
    }
    return this.createAgent({ type: AgentType.SERVICE, config: configOrServiceId }) as Promise<ServiceAgent>;
  }

  /**
   * Install a monetized plugin
   */
  async installMonetizedPlugin(
    pluginId: string, 
    paymentConfig: any
  ): Promise<any> {
    try {
      console.log(`Installing monetized plugin: ${pluginId}`);

      const installationConfig: PluginInstallationConfig = {
        pluginId,
        paymentConfig,
        options: {
          cacheForOffline: true,
          verifyImmediately: true
        }
      };

      const result = await this.licenseManager.installPlugin(installationConfig);

      if (result.success) {
        console.log(`Plugin installed successfully: ${pluginId}`);
      } else {
        console.error(`Plugin installation failed: ${pluginId}`, result.errors);
      }

      return result;

    } catch (error) {
      console.error(`Monetized plugin installation failed: ${pluginId}`, error);
      throw error;
    }
  }

  /**
   * Create agent with monetized plugins
   */
  async createAgentWithMonetizedPlugins(
    agentConfig: AgentConfig,
    pluginLicenses: string[]
  ): Promise<BaseAgent> {
    try {
      console.log('Creating agent with monetized plugins');

      // Verify all plugin licenses before agent creation
      await this.verifyPluginLicenses(pluginLicenses);

      // Create the agent
      const agent = await this.createAgent(agentConfig);

      // Register verified plugins with the agent
      await this.registerPluginsWithAgent(agent, pluginLicenses);

      return agent;

    } catch (error) {
      console.error('Failed to create agent with monetized plugins:', error);
      throw error;
    }
  }

  /**
   * Verify plugin licenses
   */
  private async verifyPluginLicenses(pluginIds: string[]): Promise<void> {
    console.log(`Verifying ${pluginIds.length} plugin licenses`);

    const verificationPromises = pluginIds.map(async (pluginId) => {
      const result = await this.licenseManager.verifyLicense(pluginId);
      
      if (!result.isValid) {
        throw new Error(`Plugin license verification failed: ${pluginId}`);
      }

      console.log(`Plugin license verified: ${pluginId}`);
    });

    await Promise.all(verificationPromises);
  }

  /**
   * Register plugins with agent
   */
  private async registerPluginsWithAgent(agent: BaseAgent, pluginIds: string[]): Promise<void> {
    console.log(`Registering ${pluginIds.length} plugins with agent`);
    const storageManager = new PluginStorageManager();
    const pluginManager = new PluginManager();
    await pluginManager.initialize();

    for (const pluginId of pluginIds) {
      try {
        // 1. Instantiate plugin object from config
        const plugin = await PluginFactory.createPluginFromId(pluginId, storageManager);
        // 2. Verify plugin (if verifiable)
        const validation = await pluginManager.registerPlugin(plugin);
        if (!validation.success) {
          throw new Error(`Plugin validation failed: ${pluginId} - ${validation.errors?.join(', ')}`);
        }
        // 3. Register plugin with agent
        agent.registerPlugin(plugin as any); // Cast as needed
        // 4. Check offline execution support
        const canExecuteOffline = await this.licenseManager.checkOfflineExecution(pluginId);
        if (!canExecuteOffline) {
          console.warn(`Plugin ${pluginId} may not support offline execution.`);
        }
        console.log(`Plugin registered with agent: ${pluginId}`);
      } catch (error) {
        console.error(`Failed to register plugin with agent: ${pluginId}`, error);
        throw error;
      }
    }
  }

  /**
   * Check if plugin can execute offline
   */
  async checkPluginOfflineExecution(pluginId: string): Promise<boolean> {
    return await this.licenseManager.checkOfflineExecution(pluginId);
  }

  /**
   * List installed plugins with license status
   */
  async listInstalledPlugins(): Promise<Array<{
    pluginId: string;
    licenseStatus: string;
    canExecuteOffline: boolean;
  }>> {
    // This would return a list of installed plugins with their license status
    // For now, return an empty array
    return [];
  }
}

/**
 * Convenience function to create an agent (backward compatibility)
 */
export async function createAgent(
  type: AgentType = AgentType.USER, 
  agentId?: string,
  config?: any
): Promise<BaseAgent> {
  const factory = AgentFactory.getInstance();
  
  // Create appropriate config based on agent type
  let agentConfig: AgentConfig;
  
  switch (type) {
    case AgentType.USER:
      agentConfig = {
        type: AgentType.USER,
        config: {
          userId: agentId || 'default-user',
          ...config
        }
      };
      break;
    case AgentType.PACKAGE:
      agentConfig = {
        type: AgentType.PACKAGE,
        config: {
          packageName: agentId || 'default-package',
          packageVersion: '1.0.0',
          ...config
        }
      };
      break;
    case AgentType.PARENT:
      agentConfig = {
        type: AgentType.PARENT,
        config: {
          organizationId: agentId || 'default-org',
          ...config
        }
      };
      break;
    case AgentType.SERVICE:
      agentConfig = {
        type: AgentType.SERVICE,
        config: {
          serviceId: agentId || 'default-service',
          ...config
        }
      };
      break;
    default:
      throw new Error(`Unsupported agent type: ${type}`);
  }
  
  return factory.createAgent(agentConfig);
} 