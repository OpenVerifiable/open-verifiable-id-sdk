/**
 * Agents Client
 * 
 * Provides unified agent management capabilities including creation,
 * configuration, and lifecycle management for different agent types.
 * 
 * @implements ADR-0007: Agent Architecture and Extensibility
 */

import type { OpenVerifiableAgent, AgentType, AgentPlugin } from '../../types/index.js'
import { AgentFactory, createAgent as factoryCreateAgent } from './factory.js'

export interface AgentClientOptions {
  /** Default agent type to create */
  defaultType?: AgentType
  /** Storage backend for agent data */
  storage?: any
  /** Whether to enable plugin support */
  enablePlugins?: boolean
  /** Plugin registry */
  plugins?: AgentPlugin[]
}

/**
 * Main agents client that provides unified agent management capabilities
 */
export class AgentsClient {
  private agents: Map<string, OpenVerifiableAgent> = new Map()
  private options: AgentClientOptions

  constructor(options: AgentClientOptions = {}) {
    this.options = {
      defaultType: 'user' as AgentType,
      enablePlugins: true,
      plugins: [],
      ...options
    }
  }

  /**
   * Create a new agent
   */
  async createAgent(type: AgentType, options?: any): Promise<OpenVerifiableAgent> {
    const agent = await factoryCreateAgent(type, {
      ...this.options,
      ...options
    })
    
    this.agents.set(agent.agentId, agent as any)
    return agent as any
  }

  /**
   * Get an existing agent by ID
   */
  getAgent(agentId: string): OpenVerifiableAgent | undefined {
    return this.agents.get(agentId)
  }

  /**
   * List all managed agents
   */
  listAgents(): OpenVerifiableAgent[] {
    return Array.from(this.agents.values())
  }

  /**
   * Remove an agent
   */
  async removeAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId)
    if (agent) {
      await agent.destroy()
      this.agents.delete(agentId)
    }
  }

  /**
   * Register a plugin with all agents
   */
  registerPlugin(plugin: AgentPlugin): void {
    if (this.options.enablePlugins) {
      this.agents.forEach(agent => {
        agent.registerPlugin(plugin)
      })
    }
  }

  /**
   * Get client options
   */
  getOptions(): AgentClientOptions {
    return { ...this.options }
  }
}

/**
 * Convenience factory function for backward compatibility
 */
export function createAgent(type: AgentType, options?: any): Promise<OpenVerifiableAgent> {
  return createAgent(type, options)
} 