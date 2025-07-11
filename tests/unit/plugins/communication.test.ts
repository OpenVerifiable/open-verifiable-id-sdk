/**
 * Plugin Communication Layer Tests
 * 
 * Tests for the plugin-agent communication system
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  PluginContextImpl,
  PluginStorageImpl,
  PluginPermissionsImpl,
  PluginEventsImpl,
  PluginAPIsImpl,
  PluginCommunicationManager
} from '../../../src/core/plugins/communication/index.js';
import { AgentType } from '../../../src/core/agents/types.js';
import { BasePlugin } from '../../../src/core/plugins/base-plugin.js';
import { PluginType, PluginCategory } from '../../../src/core/plugins/interfaces.js';

// Mock plugin for testing
class MockPlugin extends BasePlugin {
  constructor() {
    super(
      'test-plugin',
      'Test Plugin',
      '1.0.0',
      'regular' as const,
      'utility' as const,
      { name: 'Test Author', did: 'did:test:author', email: 'test@example.com' },
      ['test-capability'],
      { description: 'A test plugin' }
    );
  }

  protected async onInitialize(): Promise<void> {
    // Mock implementation
  }

  protected async onCleanup(): Promise<void> {
    // Mock implementation
  }

  protected async onValidateConfig(): Promise<any> {
    return { isValid: true, errors: [], warnings: [] };
  }
}

describe('Plugin Communication Layer', () => {
  let mockPlugin: MockPlugin;
  let communicationManager: PluginCommunicationManager;

  beforeEach(() => {
    mockPlugin = new MockPlugin();
    communicationManager = new PluginCommunicationManager();
  });

  afterEach(() => {
    // Cleanup
  });

  describe('PluginContextImpl', () => {
    let context: PluginContextImpl;

    beforeEach(() => {
      context = new PluginContextImpl(AgentType.USER, 'test-agent', {
        permissions: ['read', 'write', 'sign']
      });
    });

    it('should create context with correct agent information', () => {
      expect(context.agentType).toBe(AgentType.USER);
      expect(context.agentId).toBe('test-agent');
    });

    it('should provide storage functionality', async () => {
      await context.storage.store('test-key', 'test-value');
      const value = await context.storage.get('test-key');
      expect(value).toBe('test-value');
    });

    it('should manage permissions correctly', () => {
      expect(context.permissions.has('read')).toBe(true);
      expect(context.permissions.has('admin')).toBe(false);
    });

    it('should provide event system', () => {
      let eventReceived = false;
      context.events.subscribe('test-event', () => {
        eventReceived = true;
      });
      
      context.events.publish('test-event', { data: 'test' });
      expect(eventReceived).toBe(true);
    });

    it('should provide API access', () => {
      const apis = context.apis;
      expect(apis).toBeDefined();
      expect(apis.storage).toBeDefined();
    });

    it('should get context information', () => {
      const info = context.getContextInfo();
      expect(info.agentType).toBe(AgentType.USER);
      expect(info.agentId).toBe('test-agent');
      expect(info.permissions).toContain('read');
    });

    it('should request permissions', async () => {
      const results = await context.requestPermissions(['network', 'storage']);
      expect(results).toEqual([true, true]);
    });

    it('should check all permissions', () => {
      const hasAll = context.hasAllPermissions(['read', 'write']);
      expect(hasAll).toBe(true);
    });

    it('should get storage statistics', async () => {
      await context.storage.store('key1', 'value1');
      await context.storage.store('key2', 'value2');
      
      const stats = await context.getStorageStats();
      expect(stats.totalKeys).toBe(2);
      expect(stats.totalSize).toBeGreaterThan(0);
    });

    it('should cleanup resources', async () => {
      await context.storage.store('test-key', 'test-value');
      await context.cleanup();
      
      const keys = await context.storage.listKeys();
      expect(keys).toHaveLength(0);
    });
  });

  describe('PluginStorageImpl', () => {
    let storage: PluginStorageImpl;

    beforeEach(() => {
      storage = new PluginStorageImpl('test-prefix');
    });

    it('should store and retrieve data', async () => {
      await storage.store('test-key', 'test-value');
      const value = await storage.get('test-key');
      expect(value).toBe('test-value');
    });

    it('should handle missing keys', async () => {
      const value = await storage.get('missing-key');
      expect(value).toBeNull();
    });

    it('should delete data', async () => {
      await storage.store('test-key', 'test-value');
      await storage.delete('test-key');
      const value = await storage.get('test-key');
      expect(value).toBeNull();
    });

    it('should list keys with prefix isolation', async () => {
      await storage.store('key1', 'value1');
      await storage.store('key2', 'value2');
      
      const keys = await storage.listKeys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
    });

    it('should clear all data', async () => {
      await storage.store('key1', 'value1');
      await storage.store('key2', 'value2');
      await storage.clear();
      
      const keys = await storage.listKeys();
      expect(keys).toHaveLength(0);
    });

    it('should track access statistics', async () => {
      await storage.store('test-key', 'test-value');
      await storage.get('test-key');
      await storage.get('test-key');
      
      const stats = storage.getStats();
      expect(stats.totalEntries).toBe(1);
    });

    it('should check key existence', async () => {
      await storage.store('test-key', 'test-value');
      expect(await storage.has('test-key')).toBe(true);
      expect(await storage.has('missing-key')).toBe(false);
    });

    it('should get entry metadata', async () => {
      await storage.store('test-key', 'test-value');
      const metadata = await storage.getMetadata('test-key');
      
      expect(metadata).not.toBeNull();
      expect(metadata?.accessCount).toBe(0);
      expect(metadata?.size).toBeGreaterThan(0);
    });
  });

  describe('PluginPermissionsImpl', () => {
    let permissions: PluginPermissionsImpl;

    beforeEach(() => {
      permissions = new PluginPermissionsImpl(['custom-permission']);
    });

    it('should grant default permissions', () => {
      expect(permissions.has('read')).toBe(true);
      expect(permissions.has('write')).toBe(true);
      expect(permissions.has('sign')).toBe(true);
      expect(permissions.has('verify')).toBe(true);
    });

    it('should grant custom permissions', () => {
      expect(permissions.has('custom-permission')).toBe(true);
    });

    it('should request permissions', async () => {
      const result = await permissions.request('network');
      expect(result).toBe(true);
      expect(permissions.has('network')).toBe(true);
    });

    it('should deny sensitive permissions', async () => {
      const result = await permissions.request('admin');
      expect(result).toBe(false);
      expect(permissions.has('admin')).toBe(false);
    });

    it('should list granted permissions', () => {
      const granted = permissions.list();
      expect(granted).toContain('read');
      expect(granted).toContain('custom-permission');
    });

    it('should grant permissions manually', () => {
      permissions.grantPermission('new-permission', 'Test reason');
      expect(permissions.has('new-permission')).toBe(true);
    });

    it('should deny permissions', () => {
      permissions.denyPermission('test-permission', 'Test denial');
      const history = permissions.getPermissionHistory();
      const denied = history.find(req => req.permission === 'test-permission');
      expect(denied?.deniedAt).toBeDefined();
    });

    it('should revoke permissions', () => {
      permissions.grantPermission('revokable-permission');
      const revoked = permissions.revokePermission('revokable-permission');
      expect(revoked).toBe(true);
      expect(permissions.has('revokable-permission')).toBe(false);
    });

    it('should not revoke default permissions', () => {
      const revoked = permissions.revokePermission('read');
      expect(revoked).toBe(false);
      expect(permissions.has('read')).toBe(true);
    });

    it('should check all permissions', () => {
      const hasAll = permissions.hasAllPermissions(['read', 'write']);
      expect(hasAll).toBe(true);
    });

    it('should get permission statistics', () => {
      const stats = permissions.getStats();
      expect(stats.totalGranted).toBeGreaterThan(0);
      expect(stats.totalRequested).toBeGreaterThanOrEqual(0);
    });

    it('should reset to defaults', () => {
      permissions.grantPermission('temp-permission');
      permissions.resetToDefaults();
      expect(permissions.has('temp-permission')).toBe(false);
      expect(permissions.has('read')).toBe(true);
    });

    it('should export permissions', () => {
      const exported = permissions.exportPermissions();
      expect(exported.granted).toContain('read');
      expect(exported.requests).toBeInstanceOf(Array);
      expect(exported.stats).toBeDefined();
    });
  });

  describe('PluginEventsImpl', () => {
    let events: PluginEventsImpl;

    beforeEach(() => {
      events = new PluginEventsImpl();
    });

    it('should subscribe and publish events', () => {
      let receivedData: any = null;
      events.subscribe('test-event', (data) => {
        receivedData = data;
      });
      
      events.publish('test-event', { message: 'hello' });
      expect(receivedData).toEqual({ message: 'hello' });
    });

    it('should handle multiple subscribers', () => {
      const received: any[] = [];
      
      events.subscribe('test-event', (data) => received.push(data));
      events.subscribe('test-event', (data) => received.push(data));
      
      events.publish('test-event', { message: 'hello' });
      expect(received).toHaveLength(2);
    });

    it('should unsubscribe from events', () => {
      let callCount = 0;
      const handler = () => callCount++;
      
      events.subscribe('test-event', handler);
      events.publish('test-event', {});
      events.unsubscribe('test-event', handler);
      events.publish('test-event', {});
      
      expect(callCount).toBe(1);
    });

    it('should publish targeted events', () => {
      let receivedData: any = null;
      events.subscribe('test-event:target', (data) => {
        receivedData = data;
      });
      
      events.publishToTarget('test-event', { message: 'hello' }, 'target');
      expect(receivedData).toEqual({ message: 'hello' });
    });

    it('should get event statistics', () => {
      events.subscribe('event1', () => {});
      events.subscribe('event2', () => {});
      events.publish('event1', {});
      
      const stats = events.getEventStats();
      expect(stats.totalEvents).toBe(1);
      expect(stats.totalHandlers).toBe(2);
      expect(stats.eventsByType['event1']).toBe(1);
    });

    it('should get event history with filters', () => {
      events.publish('event1', { data: 'test1' });
      events.publish('event2', { data: 'test2' });
      
      const history = events.getEventHistory({ event: 'event1' });
      expect(history).toHaveLength(1);
      expect(history[0].event).toBe('event1');
    });

    it('should clear event history', () => {
      events.publish('test-event', {});
      events.clearHistory();
      
      const history = events.getEventHistory();
      expect(history).toHaveLength(0);
    });

    it('should get active subscriptions', () => {
      events.subscribe('event1', () => {});
      events.subscribe('event2', () => {});
      
      const subscriptions = events.getActiveSubscriptions();
      expect(subscriptions).toHaveLength(2);
      expect(subscriptions[0].event).toBe('event1');
    });

    it('should clear all handlers', () => {
      events.subscribe('event1', () => {});
      events.clearAllHandlers();
      
      const subscriptions = events.getActiveSubscriptions();
      expect(subscriptions).toHaveLength(0);
    });
  });

  describe('PluginAPIsImpl', () => {
    let apis: PluginAPIsImpl;

    beforeEach(() => {
      apis = new PluginAPIsImpl(AgentType.USER, 'test-agent');
    });

    it('should provide storage API by default', () => {
      const availableAPIs = apis.getAvailableAPIs();
      expect(availableAPIs).toContain('storage');
    });

    it('should check API availability', () => {
      expect(apis.hasAPI('storage')).toBe(true);
      expect(apis.hasAPI('network')).toBe(false);
    });

    it('should get API statistics', () => {
      const stats = apis.getAPIStats();
      expect(stats.totalAPIs).toBe(1);
      expect(stats.availableAPIs).toContain('storage');
      expect(stats.restrictedAPIs).toContain('network');
    });

    it('should provide storage functionality', async () => {
      if (apis.storage) {
        await apis.storage.store('test-key', 'test-value');
        const value = await apis.storage.get('test-key');
        expect(value).toBe('test-value');
      }
    });
  });

  describe('PluginCommunicationManager', () => {
    it('should create communication channels', () => {
      const channel = communicationManager.createChannel(
        mockPlugin,
        AgentType.USER,
        'test-agent'
      );
      
      expect(channel.pluginId).toBe('test-plugin');
      expect(channel.agentId).toBe('test-agent');
      expect(channel.isActive).toBe(true);
    });

    it('should get communication channels', () => {
      const channel = communicationManager.createChannel(
        mockPlugin,
        AgentType.USER,
        'test-agent'
      );
      
      const retrieved = communicationManager.getChannel('test-plugin', 'test-agent');
      expect(retrieved).toBeDefined();
      expect(retrieved?.pluginId).toBe('test-plugin');
    });

    it('should send messages between plugin and agent', async () => {
      let receivedMessage: any = null;
      communicationManager.subscribeToMessages('test-subscriber', (message) => {
        receivedMessage = message;
      });
      
      await communicationManager.sendMessage({
        from: 'test-plugin',
        to: 'test-agent',
        type: 'test-message',
        data: { message: 'hello' },
        priority: 'normal'
      });
      
      expect(receivedMessage).toBeDefined();
      expect(receivedMessage.type).toBe('test-message');
      expect(receivedMessage.data.message).toBe('hello');
    });

    it('should broadcast messages to all channels', async () => {
      const channel1 = communicationManager.createChannel(
        mockPlugin,
        AgentType.USER,
        'agent1'
      );
      const channel2 = communicationManager.createChannel(
        mockPlugin,
        AgentType.USER,
        'agent2'
      );
      
      let eventReceived = false;
      channel1.events.subscribe('broadcast-event', () => {
        eventReceived = true;
      });
      
      await communicationManager.broadcastMessage(
        'test-plugin',
        'broadcast-event',
        { message: 'broadcast' }
      );
      
      expect(eventReceived).toBe(true);
    });

    it('should close communication channels', async () => {
      const channel = communicationManager.createChannel(
        mockPlugin,
        AgentType.USER,
        'test-agent'
      );
      
      await communicationManager.closeChannel('test-plugin', 'test-agent');
      
      const retrieved = communicationManager.getChannel('test-plugin', 'test-agent');
      expect(retrieved).toBeUndefined();
    });

    it('should get communication statistics', () => {
      communicationManager.createChannel(mockPlugin, AgentType.USER, 'agent1');
      communicationManager.createChannel(mockPlugin, AgentType.USER, 'agent2');
      
      const stats = communicationManager.getStats();
      expect(stats.totalChannels).toBe(2);
      expect(stats.activeChannels).toBe(2);
      expect(stats.channelsByAgent['agent1']).toBe(1);
    });

    it('should get message history', async () => {
      await communicationManager.sendMessage({
        from: 'plugin1',
        to: 'agent1',
        type: 'test-message',
        data: { test: 'data' },
        priority: 'normal'
      });
      
      const history = communicationManager.getMessageHistory();
      expect(history).toHaveLength(1);
      expect(history[0].type).toBe('test-message');
    });

    it('should filter message history', async () => {
      await communicationManager.sendMessage({
        from: 'plugin1',
        to: 'agent1',
        type: 'message1',
        data: { test: 'data1' },
        priority: 'normal'
      });
      
      await communicationManager.sendMessage({
        from: 'plugin2',
        to: 'agent1',
        type: 'message2',
        data: { test: 'data2' },
        priority: 'normal'
      });
      
      const filtered = communicationManager.getMessageHistory({ from: 'plugin1' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].from).toBe('plugin1');
    });

    it('should clear message history', async () => {
      await communicationManager.sendMessage({
        from: 'plugin1',
        to: 'agent1',
        type: 'test-message',
        data: { test: 'data' },
        priority: 'normal'
      });
      
      communicationManager.clearMessageHistory();
      const history = communicationManager.getMessageHistory();
      expect(history).toHaveLength(0);
    });

    it('should get all channels', () => {
      communicationManager.createChannel(mockPlugin, AgentType.USER, 'agent1');
      communicationManager.createChannel(mockPlugin, AgentType.USER, 'agent2');
      
      const channels = communicationManager.getAllChannels();
      expect(channels).toHaveLength(2);
      expect(channels[0].agentId).toBe('agent1');
      expect(channels[1].agentId).toBe('agent2');
    });
  });
}); 