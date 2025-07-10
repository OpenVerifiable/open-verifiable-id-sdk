import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PluginManager, PluginManagerOptions } from '../../../src/core/plugins/manager.js';
import { BasePlugin } from '../../../src/core/plugins/base-plugin.js';
import type { PluginContext, PluginAuthor, ValidationResult } from '../../../src/core/plugins/interfaces.js';

// Minimal mock plugin
class MockPlugin extends BasePlugin {
  constructor(id: string, name = 'Mock', version = '1.0.0') {
    super(
      id,
      name,
      version,
      'regular',
      'utility',
      { name: 'Tester', did: 'did:example:tester' } as PluginAuthor,
      ['test']
    );
  }
  protected async onInitialize(_context: PluginContext): Promise<void> {}
  protected async onCleanup(): Promise<void> {}
  protected async onValidateConfig(_config: any): Promise<ValidationResult> {
    return { isValid: true, errors: [], warnings: [] };
  }
}

const mockContext: PluginContext = {
  agentType: 'USER',
  agentId: 'agent-1',
  storage: {
    async store() {},
    async get() { return null; },
    async delete() {},
    async listKeys() { return []; },
    async clear() {}
  },
  permissions: {
    has: () => true,
    request: async () => true,
    list: () => []
  },
  events: {
    subscribe: () => {},
    unsubscribe: () => {},
    publish: () => {}
  },
  apis: {}
};

describe('PluginManager', () => {
  let manager: PluginManager;

  beforeEach(async () => {
    manager = new PluginManager({ maxPlugins: 5 });
    await manager.initialize();
  });

  it('registers a plugin successfully', async () => {
    const plugin = new MockPlugin('plugin-1');
    const result = await manager.registerPlugin(plugin, mockContext);
    expect(result.success).toBe(true);
    expect(manager.getPlugin('plugin-1')).toStrictEqual(plugin);
  });

  it('prevents duplicate plugin registration', async () => {
    const plugin = new MockPlugin('plugin-1');
    await manager.registerPlugin(plugin, mockContext);
    const result = await manager.registerPlugin(plugin, mockContext);
    expect(result.success).toBe(false);
    expect(result.errors).toContain('Plugin plugin-1 is already registered');
  });

  it('enforces max plugin limit', async () => {
    // Register up to the limit
    for (let i = 0; i < 5; i++) {
      const plugin = new MockPlugin(`plugin-${i}`);
      await manager.registerPlugin(plugin, mockContext);
    }
    
    // Try to register one more
    const extraPlugin = new MockPlugin('plugin-extra');
    const result = await manager.registerPlugin(extraPlugin, mockContext);
    expect(result.success).toBe(false);
    expect(result.errors).toContain('Maximum number of plugins (5) reached');
  });

  it('validates plugin fields', async () => {
    const invalidPlugin = new MockPlugin('', '', '');
    const result = await manager.registerPlugin(invalidPlugin, mockContext);
    expect(result.success).toBe(false);
    expect(result.errors).toContain('Plugin name is required');
  });

  it('enables and disables a plugin', async () => {
    const plugin = new MockPlugin('plugin-1');
    await manager.registerPlugin(plugin, mockContext);
    
    expect(plugin.enabled).toBe(true);
    
    await manager.disablePlugin('plugin-1');
    expect(plugin.enabled).toBe(false);
    
    await manager.enablePlugin('plugin-1');
    expect(plugin.enabled).toBe(true);
  });

  it('emits lifecycle events', async () => {
    const events: string[] = [];
    manager.onLifecycleEvent((event) => {
      events.push(event.type);
    });

    const plugin = new MockPlugin('plugin-3');
    await manager.registerPlugin(plugin, mockContext);
    await manager.disablePlugin('plugin-3');
    await manager.enablePlugin('plugin-3');
    await manager.unregisterPlugin('plugin-3');
    
    expect(events).toEqual(['registered', 'disabled', 'enabled', 'unregistered']);
  });

  it('cleans up all plugins', async () => {
    const plugin1 = new MockPlugin('plugin-1');
    const plugin2 = new MockPlugin('plugin-2');
    
    await manager.registerPlugin(plugin1, mockContext);
    await manager.registerPlugin(plugin2, mockContext);
    
    expect(manager.getAllPlugins()).toHaveLength(2);
    
    await manager.cleanup();
    
    expect(manager.getAllPlugins()).toHaveLength(0);
  });
}); 