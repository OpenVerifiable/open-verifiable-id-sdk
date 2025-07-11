/**
 * Plugin Context Implementation
 * 
 * Provides the communication layer between plugins and agents
 * Implements ADR-0057: Agent Plugin Integration Architecture
 */

import { AgentType } from '../../agents/types.js';
import { PluginContext, PluginStorage, PluginPermissions, PluginEvents, PluginAPIs } from '../interfaces.js';
import { PluginStorageImpl } from './plugin-storage';
import { PluginPermissionsImpl } from './plugin-permissions';
import { PluginEventsImpl } from './plugin-events';
import { PluginAPIsImpl } from './plugin-apis';
import { dlrClient, DIDLinkedResourceClient } from '@/core/utils/dlr'

export interface PluginContextOptions {
  carbonClient?: any;
  trustRegistry?: any;
  schemaRegistry?: any;
  storagePrefix?: string;
  permissions?: string[];
  didManager?: any;
  credentialManager?: any;
  keyManager?: any;
  storageManager?: any;
  networkManager?: any;
}

export class PluginContextImpl implements PluginContext {
  public readonly agentType: AgentType;
  public readonly agentId: string;
  public readonly storage: PluginStorage;
  public readonly permissions: PluginPermissions;
  public readonly events: PluginEvents;
  public readonly apis: PluginAPIs;
  public readonly carbonClient?: any;
  public readonly trustRegistry?: any;
  public readonly schemaRegistry?: any;
  public readonly dlr: DIDLinkedResourceClient;

  constructor(
    agentType: AgentType,
    agentId: string,
    options?: PluginContextOptions
  ) {
    this.agentType = agentType;
    this.agentId = agentId;
    
    // Initialize storage with agent-specific prefix
    const storagePrefix = options?.storagePrefix || `plugin-${agentId}-`;
    this.storage = new PluginStorageImpl(storagePrefix);
    
    // Initialize permissions with default or provided permissions
    const initialPermissions = options?.permissions || ['read', 'write', 'sign', 'verify'];
    this.permissions = new PluginPermissionsImpl(initialPermissions);
    
    // Initialize events
    this.events = new PluginEventsImpl();
    
    // Initialize APIs with agent capabilities
    this.apis = new PluginAPIsImpl(agentType, agentId, {
      didManager: options?.didManager,
      credentialManager: options?.credentialManager,
      keyManager: options?.keyManager,
      storageManager: options?.storageManager,
      networkManager: options?.networkManager,
    });
    this.carbonClient = options?.carbonClient;
    this.trustRegistry = options?.trustRegistry;
    this.schemaRegistry = options?.schemaRegistry;
    this.dlr = dlrClient;
  }

  getContextInfo(): {
    agentType: AgentType;
    agentId: string;
    permissions: string[];
    hasCarbonClient: boolean;
    hasTrustRegistry: boolean;
    hasSchemaRegistry: boolean;
  } {
    return {
      agentType: this.agentType,
      agentId: this.agentId,
      permissions: this.permissions.list(),
      hasCarbonClient: !!this.carbonClient,
      hasTrustRegistry: !!this.trustRegistry,
      hasSchemaRegistry: !!this.schemaRegistry,
    };
  }

  async requestPermissions(permissions: string[]): Promise<boolean[]> {
    const results: boolean[] = [];
    for (const permission of permissions) {
      const granted = await this.permissions.request(permission);
      results.push(granted);
    }
    return results;
  }

  hasAllPermissions(requiredPermissions: string[]): boolean {
    return (this.permissions as any).hasAllPermissions(requiredPermissions);
  }

  subscribeToAgentEvents(eventTypes: string[], handler: (event: string, data: any) => void): void {
    for (const eventType of eventTypes) {
      this.events.subscribe(eventType, (data) => handler(eventType, data));
    }
  }

  publishToAgent(event: string, data: any): void {
    this.events.publish(event, data);
  }

  async getStorageStats(): Promise<{
    totalKeys: number;
    totalSize: number;
    lastAccessed: string;
  }> {
    const stats = (this.storage as any).getStats();
    return {
      totalKeys: stats.totalEntries,
      totalSize: stats.totalSize,
      lastAccessed: stats.mostAccessedKey || 'never',
    };
  }

  async cleanup(): Promise<void> {
    // Clear all event handlers
    (this.events as any).clearAllHandlers();
    
    // Clear storage
    await this.storage.clear();
    
    // Reset permissions to defaults
    (this.permissions as any).resetToDefaults();
  }
} 