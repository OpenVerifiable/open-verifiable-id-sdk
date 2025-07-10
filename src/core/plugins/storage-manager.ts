/**
 * Plugin Storage Manager
 * 
 * Handles secure storage of plugin configurations and cached licenses
 * Implements ADR-0046: Monetized Plugin Installation Architecture
 */

import { AgentPluginConfig, CachedPluginLicense } from '../agents/types.js';

/**
 * Plugin Storage Manager
 * 
 * Manages secure storage for:
 * - Plugin configurations
 * - Cached licenses for offline execution
 * - Installation metadata
 */
export class PluginStorageManager {
  private storagePrefix = 'ov-plugin-';
  private encryptionKey?: string;

  constructor(options?: {
    encryptionKey?: string;
  }) {
    this.encryptionKey = options?.encryptionKey;
  }

  /**
   * Store plugin configuration
   */
  async storePluginConfig(pluginId: string, config: AgentPluginConfig): Promise<void> {
    try {
      const key = `${this.storagePrefix}config-${pluginId}`;
      const data = JSON.stringify(config);
      
      if (this.encryptionKey) {
        // Encrypt sensitive data
        const encryptedData = await this.encrypt(data);
        this.setStorageItem(key, encryptedData);
      } else {
        this.setStorageItem(key, data);
      }

      console.log(`Plugin config stored: ${pluginId}`);

    } catch (error) {
      console.error(`Failed to store plugin config: ${pluginId}`, error);
      throw error;
    }
  }

  /**
   * Get plugin configuration
   */
  async getPluginConfig(pluginId: string): Promise<AgentPluginConfig | null> {
    try {
      const key = `${this.storagePrefix}config-${pluginId}`;
      const data = this.getStorageItem(key);
      
      if (!data) {
        return null;
      }

      let decryptedData: string;
      if (this.encryptionKey) {
        decryptedData = await this.decrypt(data);
      } else {
        decryptedData = data;
      }

      return JSON.parse(decryptedData);

    } catch (error) {
      console.error(`Failed to get plugin config: ${pluginId}`, error);
      return null;
    }
  }

  /**
   * Store cached license
   */
  async storeCachedLicense(pluginId: string, license: CachedPluginLicense): Promise<void> {
    try {
      const key = `${this.storagePrefix}license-${pluginId}`;
      const data = JSON.stringify(license);
      
      if (this.encryptionKey) {
        const encryptedData = await this.encrypt(data);
        this.setStorageItem(key, encryptedData);
      } else {
        this.setStorageItem(key, data);
      }

      console.log(`Cached license stored: ${pluginId}`);

    } catch (error) {
      console.error(`Failed to store cached license: ${pluginId}`, error);
      throw error;
    }
  }

  /**
   * Get cached license
   */
  async getCachedLicense(pluginId: string): Promise<CachedPluginLicense | null> {
    try {
      const key = `${this.storagePrefix}license-${pluginId}`;
      const data = this.getStorageItem(key);
      
      if (!data) {
        return null;
      }

      let decryptedData: string;
      if (this.encryptionKey) {
        decryptedData = await this.decrypt(data);
      } else {
        decryptedData = data;
      }

      return JSON.parse(decryptedData);

    } catch (error) {
      console.error(`Failed to get cached license: ${pluginId}`, error);
      return null;
    }
  }

  /**
   * List all installed plugins
   */
  async listInstalledPlugins(): Promise<string[]> {
    try {
      const plugins: string[] = [];
      const keys = this.getStorageKeys();
      
      for (const key of keys) {
        if (key.startsWith(`${this.storagePrefix}config-`)) {
          const pluginId = key.replace(`${this.storagePrefix}config-`, '');
          plugins.push(pluginId);
        }
      }

      return plugins;

    } catch (error) {
      console.error('Failed to list installed plugins:', error);
      return [];
    }
  }

  /**
   * Remove plugin and its cached license
   */
  async removePlugin(pluginId: string): Promise<void> {
    try {
      const configKey = `${this.storagePrefix}config-${pluginId}`;
      const licenseKey = `${this.storagePrefix}license-${pluginId}`;
      
      this.removeStorageItem(configKey);
      this.removeStorageItem(licenseKey);

      console.log(`Plugin removed: ${pluginId}`);

    } catch (error) {
      console.error(`Failed to remove plugin: ${pluginId}`, error);
      throw error;
    }
  }

  /**
   * Clear all plugin data
   */
  async clearAllPluginData(): Promise<void> {
    try {
      const keysToRemove: string[] = [];
      const keys = this.getStorageKeys();
      
      for (const key of keys) {
        if (key.startsWith(this.storagePrefix)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => this.removeStorageItem(key));

      console.log('All plugin data cleared');

    } catch (error) {
      console.error('Failed to clear plugin data:', error);
      throw error;
    }
  }

  /**
   * Encrypt data
   */
  private async encrypt(data: string): Promise<string> {
    // This would implement proper encryption
    // For now, return base64 encoded data
    return btoa(data);
  }

  /**
   * Decrypt data
   */
  private async decrypt(encryptedData: string): Promise<string> {
    // This would implement proper decryption
    // For now, return base64 decoded data
    return atob(encryptedData);
  }

  /**
   * Storage helper methods for cross-platform compatibility
   */
  private setStorageItem(key: string, value: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    } else {
      // Node.js environment - use in-memory storage for tests
      (global as any).__testStorage = (global as any).__testStorage || new Map();
      (global as any).__testStorage.set(key, value);
    }
  }

  private getStorageItem(key: string): string | null {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    } else {
      // Node.js environment - use in-memory storage for tests
      (global as any).__testStorage = (global as any).__testStorage || new Map();
      return (global as any).__testStorage.get(key) || null;
    }
  }

  private removeStorageItem(key: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    } else {
      // Node.js environment - use in-memory storage for tests
      (global as any).__testStorage = (global as any).__testStorage || new Map();
      (global as any).__testStorage.delete(key);
    }
  }

  private clearStorage(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    } else {
      // Node.js environment - use in-memory storage for tests
      (global as any).__testStorage = new Map();
    }
  }

  private getStorageKeys(): string[] {
    if (typeof localStorage !== 'undefined') {
      return Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)!);
    } else {
      // Node.js environment - use in-memory storage for tests
      (global as any).__testStorage = (global as any).__testStorage || new Map();
      return Array.from((global as any).__testStorage.keys());
    }
  }
} 