/**
 * Agent Factory - creates and configures agent instances
 */

import { AgentType } from '../../types';
import { UserAgent, UserAgentConfig } from './user-agent';
import { PackageAgent, PackageAgentConfig } from './package-agent';
import { ParentAgent, ParentAgentConfig } from './parent-agent';
import { ServiceAgent, ServiceAgentConfig } from './service-agent';
import { BaseAgent } from './base';

export type AgentConfig = 
  | { type: AgentType.USER; config: UserAgentConfig }
  | { type: AgentType.PACKAGE; config: PackageAgentConfig }
  | { type: AgentType.PARENT; config: ParentAgentConfig }
  | { type: AgentType.SERVICE; config: ServiceAgentConfig };

export class AgentFactory {
  private static instance: AgentFactory;
  private agents: Map<string, BaseAgent> = new Map();

  private constructor() {}

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

  async createUserAgent(config: UserAgentConfig): Promise<UserAgent> {
    return this.createAgent({ type: AgentType.USER, config }) as Promise<UserAgent>;
  }

  async createPackageAgent(config: PackageAgentConfig): Promise<PackageAgent> {
    return this.createAgent({ type: AgentType.PACKAGE, config }) as Promise<PackageAgent>;
  }

  async createParentAgent(config: ParentAgentConfig): Promise<ParentAgent> {
    return this.createAgent({ type: AgentType.PARENT, config }) as Promise<ParentAgent>;
  }

  async createServiceAgent(config: ServiceAgentConfig): Promise<ServiceAgent> {
    return this.createAgent({ type: AgentType.SERVICE, config }) as Promise<ServiceAgent>;
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