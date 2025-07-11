import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BasePlugin } from '../../../src/core/plugins/base-plugin.js';
import type { PluginContext, ValidationResult } from '../../../src/core/plugins/interfaces.js';

class TestPlugin extends BasePlugin {
  public initialized = false;
  public cleanedUp = false;
  public validatedConfig: any = null;
  constructor(id = 'test', name = 'Test', version = '1.0.0') {
    super(
      id,
      name,
      version,
      'regular',
      'utility',
      { name: 'Tester', did: 'did:example:tester' },
      ['test']
    );
  }
  protected async onInitialize(_context: PluginContext): Promise<void> {
    this.initialized = true;
  }
  protected async onCleanup(): Promise<void> {
    this.cleanedUp = true;
  }
  protected async onValidateConfig(config: any): Promise<ValidationResult> {
    this.validatedConfig = config;
    return { isValid: true, errors: [], warnings: [] };
  }
  // Expose a public method for testing cleanup handlers
  public addTestCleanupHandler(handler: () => Promise<void>): void {
    this.addCleanupHandler(handler);
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

describe('BasePlugin', () => {
  it('assigns properties on construction', () => {
    const plugin = new TestPlugin();
    expect(plugin.id).toBe('test');
    expect(plugin.name).toBe('Test');
    expect(plugin.version).toBe('1.0.0');
    expect(plugin.type).toBe('regular');
    expect(plugin.category).toBe('utility');
    expect(plugin.author.name).toBe('Tester');
    expect(plugin.capabilities).toEqual(['test']);
    expect(plugin.enabled).toBe(true);
  });

  it('initializes and calls onInitialize', async () => {
    const plugin = new TestPlugin();
    await plugin.initialize(mockContext);
    expect(plugin.initialized).toBe(true);
    expect(plugin.isInitialized()).toBe(true);
    expect(plugin.getContext()).toBe(mockContext);
  });

  it('throws on double initialization', async () => {
    const plugin = new TestPlugin();
    await plugin.initialize(mockContext);
    await expect(plugin.initialize(mockContext)).rejects.toThrow('Plugin test is already initialized');
  });

  it('cleans up and calls onCleanup and cleanup handlers', async () => {
    const plugin = new TestPlugin();
    let handlerCalled = false;
    plugin.addTestCleanupHandler(async () => { handlerCalled = true; });
    await plugin.initialize(mockContext);
    await plugin.cleanup();
    expect(plugin.cleanedUp).toBe(true);
    expect(handlerCalled).toBe(true);
    expect(plugin.isInitialized()).toBe(false);
    expect(plugin.getContext()).toBeUndefined();
  });

  it('getMetadata returns correct structure', () => {
    const plugin = new TestPlugin();
    const meta = plugin.getMetadata();
    expect(meta.id).toBe('test');
    expect(meta.name).toBe('Test');
    expect(meta.version).toBe('1.0.0');
    expect(meta.type).toBe('regular');
    expect(meta.category).toBe('utility');
    expect(meta.author.name).toBe('Tester');
    expect(meta.capabilities).toEqual(['test']);
  });

  it('validateConfig returns correct result and calls onValidateConfig', async () => {
    const plugin = new TestPlugin();
    const config = { foo: 'bar' };
    const result = await plugin.validateConfig(config);
    expect(result.isValid).toBe(true);
    expect(plugin.validatedConfig).toBe(config);
  });
}); 