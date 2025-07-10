import { describe, it, expect } from 'vitest';
import { PluginFactory } from '../../../src/core/plugins/plugin-factory';
import { BasePlugin } from '../../../src/core/plugins/base-plugin';
import { AgentPluginConfig } from '../../../src/core/agents/types';

// Mock concrete plugin class
class MockPlugin extends BasePlugin {
  protected async onInitialize() {}
  protected async onCleanup() {}
  protected async onValidateConfig() { return { isValid: true, errors: [], warnings: [] }; }
}

describe('PluginFactory', () => {
  it('registers and instantiates a concrete plugin class', async () => {
    PluginFactory.registerPluginClass('mock-plugin', MockPlugin);
    const config: AgentPluginConfig = {
      name: 'mock-plugin',
      version: '1.0.0',
      type: 'utility',
      enabled: true,
      config: { foo: 'bar' }
    };
    const plugin = await PluginFactory.createPluginFromConfig(config);
    expect(plugin).toBeInstanceOf(MockPlugin);
    expect(plugin.name).toBe('mock-plugin');
    expect(plugin.version).toBe('1.0.0');
    expect(plugin.config).toEqual({ foo: 'bar' });
  });

  it('throws if no plugin class is registered', async () => {
    const config: AgentPluginConfig = {
      name: 'unregistered-plugin',
      version: '1.0.0',
      type: 'utility',
      enabled: true,
      config: {}
    };
    await expect(PluginFactory.createPluginFromConfig(config)).rejects.toThrow('No plugin class registered for name: unregistered-plugin');
  });

  it('throws if trying to instantiate abstract BasePlugin', async () => {
    PluginFactory.registerPluginClass('abstract-plugin', BasePlugin as any);
    const config: AgentPluginConfig = {
      name: 'abstract-plugin',
      version: '1.0.0',
      type: 'utility',
      enabled: true,
      config: {}
    };
    await expect(PluginFactory.createPluginFromConfig(config)).rejects.toThrow('Cannot instantiate abstract BasePlugin');
  });
}); 