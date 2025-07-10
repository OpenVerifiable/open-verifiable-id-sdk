/**
 * Plugin Manager for the Open Verifiable ID SDK
 * Implements ADR-0056: Plugin Lifecycle Management Architecture
 */

import { 
  Plugin, 
  VerifiablePlugin, 
  PluginContext, 
  PluginDependency, 
  PluginMetadata,
  ValidationResult 
} from './interfaces.js';
import { PluginLicenseManager } from './license-manager.js';
import { PluginVerificationEngine } from './verification-engine.js';

/**
 * Plugin manager options
 */
export interface PluginManagerOptions {
  /** Whether to enable plugin verification */
  enableVerification?: boolean;
  
  /** Whether to enable plugin sandboxing */
  enableSandboxing?: boolean;
  
  /** Plugin storage directory */
  storageDirectory?: string;
  
  /** Plugin cache directory */
  cacheDirectory?: string;
  
  /** Maximum number of plugins to load */
  maxPlugins?: number;
  
  /** Plugin timeout in milliseconds */
  pluginTimeout?: number;
  
  /** Whether to auto-update plugins */
  autoUpdate?: boolean;
  
  /** Plugin update interval in hours */
  updateInterval?: number;
}

/**
 * Plugin registration result
 */
export interface PluginRegistrationResult {
  /** Whether registration was successful */
  success: boolean;
  
  /** Plugin ID */
  pluginId: string;
  
  /** Registration timestamp */
  registeredAt: string;
  
  /** Registration errors */
  errors?: string[];
  
  /** Registration warnings */
  warnings?: string[];
  
  /** Dependencies resolved */
  dependenciesResolved?: string[];
  
  /** Dependencies missing */
  dependenciesMissing?: string[];
}

/**
 * Plugin discovery result
 */
export interface PluginDiscoveryResult {
  /** Discovered plugins */
  plugins: PluginMetadata[];
  
  /** Discovery timestamp */
  discoveredAt: string;
  
  /** Discovery errors */
  errors: string[];
  
  /** Discovery warnings */
  warnings: string[];
}

/**
 * Plugin lifecycle event
 */
export interface PluginLifecycleEvent {
  /** Event type */
  type: 'registered' | 'unregistered' | 'enabled' | 'disabled' | 'updated' | 'error';
  
  /** Plugin ID */
  pluginId: string;
  
  /** Event timestamp */
  timestamp: string;
  
  /** Event data */
  data?: any;
  
  /** Error message if applicable */
  error?: string;
}

/**
 * Plugin Manager class
 */
export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private pluginContexts: Map<string, PluginContext> = new Map();
  private lifecycleHandlers: ((event: PluginLifecycleEvent) => void)[] = [];
  private options: PluginManagerOptions;
  private licenseManager?: PluginLicenseManager;
  private verificationEngine?: PluginVerificationEngine;
  private initialized: boolean = false;

  constructor(options: PluginManagerOptions = {}) {
    this.options = {
      enableVerification: true,
      enableSandboxing: true,
      maxPlugins: 100,
      pluginTimeout: 30000,
      autoUpdate: false,
      updateInterval: 24,
      ...options
    };
  }

  /**
   * Initialize the plugin manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      throw new Error('Plugin manager is already initialized');
    }

    // Initialize license manager if verification is enabled
    if (this.options.enableVerification) {
      this.licenseManager = new PluginLicenseManager();
      this.verificationEngine = new PluginVerificationEngine();
    }

    this.initialized = true;
  }

  /**
   * Register a plugin
   */
  async registerPlugin(plugin: Plugin, context?: PluginContext): Promise<PluginRegistrationResult> {
    if (!this.initialized) {
      throw new Error('Plugin manager must be initialized before registering plugins');
    }

    const result: PluginRegistrationResult = {
      success: false,
      pluginId: plugin.id,
      registeredAt: new Date().toISOString(),
      errors: [],
      warnings: []
    };

    try {
      // Check if plugin is already registered
      if (this.plugins.has(plugin.id)) {
        result.errors!.push(`Plugin ${plugin.id} is already registered`);
        return result;
      }

      // Check plugin limit
      if (this.plugins.size >= this.options.maxPlugins!) {
        result.errors!.push(`Maximum number of plugins (${this.options.maxPlugins}) reached`);
        return result;
      }

      // Validate plugin
      const validation = await this.validatePlugin(plugin);
      if (!validation.isValid) {
        result.errors!.push(...validation.errors);
        return result;
      }
      result.warnings!.push(...validation.warnings);

      // Resolve dependencies
      const dependencyResult = await this.resolveDependencies(plugin);
      if (dependencyResult.missing.length > 0) {
        result.dependenciesMissing = dependencyResult.missing;
        result.errors!.push(`Missing dependencies: ${dependencyResult.missing.join(', ')}`);
        return result;
      }
      result.dependenciesResolved = dependencyResult.resolved;

      // Verify plugin if it's verifiable
      if (this.options.enableVerification && plugin.type === 'verifiable') {
        const verifiablePlugin = plugin as VerifiablePlugin;
        const verification = await verifiablePlugin.verifyIntegrity();
        if (!verification.isValid) {
          result.errors!.push(`Plugin verification failed: ${verification.errors?.join(', ')}`);
          return result;
        }
        result.warnings!.push(...(verification.warnings || []));
      }

      // Initialize plugin if context is provided
      if (context) {
        await this.initializePlugin(plugin, context);
      }

      // Register plugin
      this.plugins.set(plugin.id, plugin);
      if (context) {
        this.pluginContexts.set(plugin.id, context);
      }

      result.success = true;
      this.emitLifecycleEvent('registered', plugin.id);

    } catch (error) {
      result.errors!.push(`Registration failed: ${error}`);
    }

    return result;
  }

  /**
   * Unregister a plugin
   */
  async unregisterPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} is not registered`);
    }

    // Cleanup plugin
    await plugin.cleanup();

    // Remove from registries
    this.plugins.delete(pluginId);
    this.pluginContexts.delete(pluginId);

    this.emitLifecycleEvent('unregistered', pluginId);
  }

  /**
   * Get a plugin by ID
   */
  getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Get all registered plugins
   */
  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get plugins by category
   */
  getPluginsByCategory(category: string): Plugin[] {
    return Array.from(this.plugins.values()).filter(plugin => plugin.category === category);
  }

  /**
   * Get plugins by type
   */
  getPluginsByType(type: string): Plugin[] {
    return Array.from(this.plugins.values()).filter(plugin => plugin.type === type);
  }

  /**
   * Enable a plugin
   */
  async enablePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} is not registered`);
    }

    plugin.enabled = true;
    this.emitLifecycleEvent('enabled', pluginId);
  }

  /**
   * Disable a plugin
   */
  async disablePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} is not registered`);
    }

    plugin.enabled = false;
    this.emitLifecycleEvent('disabled', pluginId);
  }

  /**
   * Discover plugins from a directory
   */
  async discoverPlugins(directory: string): Promise<PluginDiscoveryResult> {
    const result: PluginDiscoveryResult = {
      plugins: [],
      discoveredAt: new Date().toISOString(),
      errors: [],
      warnings: []
    };

    try {
      // This would implement actual plugin discovery logic
      // For now, we'll return an empty result
      result.warnings.push('Plugin discovery not yet implemented');
    } catch (error) {
      result.errors.push(`Discovery failed: ${error}`);
    }

    return result;
  }

  /**
   * Update a plugin
   */
  async updatePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} is not registered`);
    }

    // This would implement actual plugin update logic
    // For now, we'll just emit an event
    this.emitLifecycleEvent('updated', pluginId);
  }

  /**
   * Get plugin statistics
   */
  getStatistics(): {
    total: number;
    enabled: number;
    disabled: number;
    byCategory: Record<string, number>;
    byType: Record<string, number>;
  } {
    const plugins = Array.from(this.plugins.values());
    const byCategory: Record<string, number> = {};
    const byType: Record<string, number> = {};

    plugins.forEach(plugin => {
      byCategory[plugin.category] = (byCategory[plugin.category] || 0) + 1;
      byType[plugin.type] = (byType[plugin.type] || 0) + 1;
    });

    return {
      total: plugins.length,
      enabled: plugins.filter(p => p.enabled).length,
      disabled: plugins.filter(p => !p.enabled).length,
      byCategory,
      byType
    };
  }

  /**
   * Add lifecycle event handler
   */
  onLifecycleEvent(handler: (event: PluginLifecycleEvent) => void): void {
    this.lifecycleHandlers.push(handler);
  }

  /**
   * Remove lifecycle event handler
   */
  removeLifecycleHandler(handler: (event: PluginLifecycleEvent) => void): void {
    const index = this.lifecycleHandlers.indexOf(handler);
    if (index > -1) {
      this.lifecycleHandlers.splice(index, 1);
    }
  }

  /**
   * Cleanup the plugin manager
   */
  async cleanup(): Promise<void> {
    // Cleanup all plugins
    const cleanupPromises = Array.from(this.plugins.values()).map(plugin => plugin.cleanup());
    await Promise.all(cleanupPromises);

    // Clear registries
    this.plugins.clear();
    this.pluginContexts.clear();

    this.initialized = false;
  }

  /**
   * Validate a plugin
   */
  private async validatePlugin(plugin: Plugin): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!plugin.id) {
      errors.push('Plugin ID is required');
    }

    if (!plugin.name) {
      errors.push('Plugin name is required');
    }

    if (!plugin.version) {
      errors.push('Plugin version is required');
    }

    if (!plugin.author) {
      errors.push('Plugin author is required');
    }

    if (!plugin.capabilities || plugin.capabilities.length === 0) {
      warnings.push('Plugin has no capabilities defined');
    }

    // Plugin-specific validation
    const pluginValidation = await plugin.validateConfig(plugin.config || {});
    errors.push(...pluginValidation.errors);
    warnings.push(...pluginValidation.warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Resolve plugin dependencies
   */
  private async resolveDependencies(plugin: Plugin): Promise<{
    resolved: string[];
    missing: string[];
  }> {
    const resolved: string[] = [];
    const missing: string[] = [];

    if (!plugin.dependencies) {
      return { resolved, missing };
    }

    for (const dependency of plugin.dependencies) {
      const dependentPlugin = this.plugins.get(dependency.pluginId);
      if (dependentPlugin) {
        resolved.push(dependency.pluginId);
      } else if (!dependency.optional) {
        missing.push(dependency.pluginId);
      }
    }

    return { resolved, missing };
  }

  /**
   * Initialize a plugin with context
   */
  private async initializePlugin(plugin: Plugin, context: PluginContext): Promise<void> {
    await plugin.initialize(context);
  }

  /**
   * Emit lifecycle event
   */
  private emitLifecycleEvent(type: PluginLifecycleEvent['type'], pluginId: string, data?: any, error?: string): void {
    const event: PluginLifecycleEvent = {
      type,
      pluginId,
      timestamp: new Date().toISOString(),
      data,
      error
    };

    this.lifecycleHandlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error('Error in lifecycle handler:', error);
      }
    });
  }
} 