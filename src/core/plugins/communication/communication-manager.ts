/**
 * Plugin Communication Manager
 * 
 * Orchestrates the communication layer between plugins and agents
 * Implements ADR-0057: Agent Plugin Integration Architecture
 */

import { Plugin } from '../interfaces.js';
import { AgentType } from '../../agents/types.js';
import { PluginContextImpl } from './plugin-context.js';
import { PluginEventsImpl } from './plugin-events.js';

export interface CommunicationChannel {
  pluginId: string;
  agentId: string;
  context: PluginContextImpl;
  events: PluginEventsImpl;
  isActive: boolean;
  createdAt: string;
  lastActivity: string;
}

export interface Message {
  id: string;
  from: string;
  to: string;
  type: string;
  data: any;
  timestamp: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
}

export class PluginCommunicationManager {
  private channels: Map<string, CommunicationChannel> = new Map();
  private messageQueue: Message[] = [];
  private maxQueueSize: number = 1000;
  private eventHandlers: Map<string, (message: Message) => void> = new Map();

  constructor(maxQueueSize: number = 1000) {
    this.maxQueueSize = maxQueueSize;
  }

  /**
   * Create a communication channel for a plugin
   */
  createChannel(
    plugin: Plugin,
    agentType: AgentType,
    agentId: string,
    options?: {
      carbonClient?: any;
      trustRegistry?: any;
      schemaRegistry?: any;
      permissions?: string[];
    }
  ): CommunicationChannel {
    const channelId = this.generateChannelId(plugin.id, agentId);
    
    const context = new PluginContextImpl(agentType, agentId, {
      carbonClient: options?.carbonClient,
      trustRegistry: options?.trustRegistry,
      schemaRegistry: options?.schemaRegistry,
      permissions: options?.permissions
    });

    const events = new PluginEventsImpl();

    const channel: CommunicationChannel = {
      pluginId: plugin.id,
      agentId,
      context,
      events,
      isActive: true,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };

    this.channels.set(channelId, channel);
    return channel;
  }

  /**
   * Get a communication channel
   */
  getChannel(pluginId: string, agentId: string): CommunicationChannel | undefined {
    const channelId = this.generateChannelId(pluginId, agentId);
    return this.channels.get(channelId);
  }

  /**
   * Send a message between plugin and agent
   */
  async sendMessage(message: Omit<Message, 'id' | 'timestamp'>): Promise<void> {
    const fullMessage: Message = {
      ...message,
      id: this.generateMessageId(),
      timestamp: new Date().toISOString()
    };

    // Add to queue
    this.messageQueue.push(fullMessage);

    // Maintain queue size
    if (this.messageQueue.length > this.maxQueueSize) {
      this.messageQueue.shift();
    }

    // Update channel activity
    const channelId = this.generateChannelId(message.from, message.to);
    const channel = this.channels.get(channelId);
    if (channel) {
      channel.lastActivity = fullMessage.timestamp;
    }

    // Route message
    await this.routeMessage(fullMessage);
  }

  /**
   * Subscribe to messages
   */
  subscribeToMessages(
    subscriberId: string,
    handler: (message: Message) => void
  ): void {
    this.eventHandlers.set(subscriberId, handler);
  }

  /**
   * Unsubscribe from messages
   */
  unsubscribeFromMessages(subscriberId: string): void {
    this.eventHandlers.delete(subscriberId);
  }

  /**
   * Broadcast message to all channels
   */
  async broadcastMessage(
    from: string,
    type: string,
    data: any,
    priority: Message['priority'] = 'normal'
  ): Promise<void> {
    const message: Message = {
      id: this.generateMessageId(),
      from,
      to: 'broadcast',
      type,
      data,
      timestamp: new Date().toISOString(),
      priority
    };

    this.messageQueue.push(message);

    // Send to all active channels
    for (const channel of this.channels.values()) {
      if (channel.isActive) {
        channel.events.publish(type, data);
        channel.lastActivity = message.timestamp;
      }
    }

    // Notify subscribers
    for (const handler of this.eventHandlers.values()) {
      try {
        handler(message);
      } catch (error) {
        console.error('Error in message handler:', error);
      }
    }
  }

  /**
   * Close a communication channel
   */
  async closeChannel(pluginId: string, agentId: string): Promise<void> {
    const channelId = this.generateChannelId(pluginId, agentId);
    const channel = this.channels.get(channelId);
    
    if (channel) {
      channel.isActive = false;
      await channel.context.cleanup();
      this.channels.delete(channelId);
    }
  }

  /**
   * Get communication statistics
   */
  getStats(): {
    totalChannels: number;
    activeChannels: number;
    totalMessages: number;
    queueSize: number;
    channelsByAgent: Record<string, number>;
  } {
    const channelsByAgent: Record<string, number> = {};
    let activeChannels = 0;

    for (const channel of this.channels.values()) {
      if (channel.isActive) {
        activeChannels++;
      }
      
      channelsByAgent[channel.agentId] = (channelsByAgent[channel.agentId] || 0) + 1;
    }

    return {
      totalChannels: this.channels.size,
      activeChannels,
      totalMessages: this.messageQueue.length,
      queueSize: this.messageQueue.length,
      channelsByAgent
    };
  }

  /**
   * Get message history
   */
  getMessageHistory(filter?: {
    from?: string;
    to?: string;
    type?: string;
    since?: string;
    limit?: number;
  }): Message[] {
    let filtered = this.messageQueue;

    if (filter?.from) {
      filtered = filtered.filter(msg => msg.from === filter.from);
    }

    if (filter?.to) {
      filtered = filtered.filter(msg => msg.to === filter.to);
    }

    if (filter?.type) {
      filtered = filtered.filter(msg => msg.type === filter.type);
    }

    if (filter?.since) {
      filtered = filtered.filter(msg => msg.timestamp >= filter.since!);
    }

    if (filter?.limit) {
      filtered = filtered.slice(-filter.limit);
    }

    return filtered;
  }

  /**
   * Clear message history
   */
  clearMessageHistory(): void {
    this.messageQueue = [];
  }

  /**
   * Get all channels
   */
  getAllChannels(): CommunicationChannel[] {
    return Array.from(this.channels.values());
  }

  /**
   * Route message to appropriate handlers
   */
  private async routeMessage(message: Message): Promise<void> {
    // Route to specific channel if not broadcast
    if (message.to !== 'broadcast') {
      const channelId = this.generateChannelId(message.from, message.to);
      const channel = this.channels.get(channelId);
      
      if (channel && channel.isActive) {
        channel.events.publish(message.type, message.data);
      }
    }

    // Notify all subscribers
    for (const handler of this.eventHandlers.values()) {
      try {
        handler(message);
      } catch (error) {
        console.error('Error routing message:', error);
      }
    }
  }

  /**
   * Generate unique channel ID
   */
  private generateChannelId(pluginId: string, agentId: string): string {
    return `${pluginId}:${agentId}`;
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
} 