// Plugin Factory Utility for dynamic instantiation
import { Plugin } from './interfaces.js';
import { BasePlugin } from './base-plugin.js';
import { PluginStorageManager } from './storage-manager.js';
import { AgentPluginConfig } from '../agents/types.js';

// Only register concrete plugin classes (not abstract BasePlugin)
// Example plugin class imports (expand as needed)
// import { DidKeyPlugin } from './did-methods/did-key-plugin';
// import { CredentialW3CPlugin } from './credential-types/credential-w3c-plugin';
// ...

// Registry of available plugin classes (expand as new plugins are added)
const pluginClassRegistry: Record<string, { new (...args: any[]): BasePlugin }> = {
  // 'did-key': DidKeyPlugin,
  // 'credential-w3c': CredentialW3CPlugin,
  // ...
};

export class PluginFactory {
  static registerPluginClass(name: string, pluginClass: { new (...args: any[]): BasePlugin }) {
    pluginClassRegistry[name] = pluginClass;
  }

  static async createPluginFromConfig(config: AgentPluginConfig): Promise<Plugin> {
    const PluginClass = pluginClassRegistry[config.name];
    if (!PluginClass) {
      throw new Error(`No plugin class registered for name: ${config.name}`);
    }
    // Prevent instantiating abstract class
    if (PluginClass === BasePlugin) {
      throw new Error('Cannot instantiate abstract BasePlugin. Register a concrete plugin class.');
    }
    // You may need to adapt this to your plugin constructor signature
    return new PluginClass(
      config.name,
      config.name,
      config.version,
      config.type,
      config.type, // category (may need mapping)
      { name: 'Unknown', did: '', email: '' }, // author (should be improved)
      config.config?.capabilities || [],
      { config: config.config }
    );
  }

  static async createPluginFromId(pluginId: string, storageManager: PluginStorageManager): Promise<Plugin> {
    const config = await storageManager.getPluginConfig(pluginId);
    if (!config) {
      throw new Error(`No plugin config found for id: ${pluginId}`);
    }
    return this.createPluginFromConfig(config);
  }
} 