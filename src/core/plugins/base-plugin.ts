/**
 * Base plugin class for the Open Verifiable ID SDK
 * Implements ADR-0048: Verifiable Plugin Architecture
 */

import { 
  Plugin, 
  PluginType, 
  PluginCategory, 
  PluginAuthor, 
  PluginDependency, 
  PluginContext, 
  PluginMetadata, 
  ValidationResult 
} from './interfaces.js';

import { CreateResourceParams, ResourceMetadata, UpdateResourceParams, ResourceListResult, ResourceVisibility } from '@/core/resource/types'

/**
 * Abstract base class for all plugins
 */
export abstract class BasePlugin implements Plugin {
  public readonly id: string;
  public readonly name: string;
  public readonly version: string;
  public readonly type: PluginType;
  public readonly category: PluginCategory;
  public readonly description?: string;
  public readonly author: PluginAuthor;
  public readonly capabilities: string[];
  public readonly dependencies?: PluginDependency[];
  
  public enabled: boolean = true;
  public config?: Record<string, any>;
  
  protected context?: PluginContext;
  protected initialized: boolean = false;
  protected cleanupHandlers: (() => Promise<void>)[] = [];

  constructor(
    id: string,
    name: string,
    version: string,
    type: PluginType,
    category: PluginCategory,
    author: PluginAuthor,
    capabilities: string[],
    options?: {
      description?: string;
      dependencies?: PluginDependency[];
      config?: Record<string, any>;
    }
  ) {
    this.id = id;
    this.name = name;
    this.version = version;
    this.type = type;
    this.category = category;
    this.author = author;
    this.capabilities = capabilities;
    this.description = options?.description;
    this.dependencies = options?.dependencies;
    this.config = options?.config;
  }

  /**
   * Initialize the plugin
   */
  async initialize(context: PluginContext): Promise<void> {
    if (this.initialized) {
      throw new Error(`Plugin ${this.id} is already initialized`);
    }

    this.context = context;
    
    // Validate configuration
    if (this.config) {
      const validation = await this.validateConfig(this.config);
      if (!validation.isValid) {
        throw new Error(`Plugin configuration validation failed: ${validation.errors.join(', ')}`);
      }
    }

    // Initialize plugin-specific functionality
    await this.onInitialize(context);
    
    this.initialized = true;
  }

  /**
   * Cleanup the plugin
   */
  async cleanup(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    // Run cleanup handlers in reverse order
    for (let i = this.cleanupHandlers.length - 1; i >= 0; i--) {
      try {
        await this.cleanupHandlers[i]();
      } catch (error) {
        console.error(`Error during plugin cleanup: ${error}`);
      }
    }

    // Plugin-specific cleanup
    await this.onCleanup();
    
    this.initialized = false;
    this.context = undefined;
  }

  /**
   * Get plugin metadata
   */
  getMetadata(): PluginMetadata {
    return {
      id: this.id,
      name: this.name,
      version: this.version,
      type: this.type,
      category: this.category,
      description: this.description,
      author: this.author,
      capabilities: this.capabilities,
      dependencies: this.dependencies,
      configSchema: this.getConfigSchema(),
      entryPoints: this.getEntryPoints(),
      icons: this.getIcons(),
      screenshots: this.getScreenshots(),
      tags: this.getTags(),
      license: this.getLicense(),
      repository: this.getRepository(),
      homepage: this.getHomepage(),
      bugs: this.getBugs(),
      keywords: this.getKeywords(),
      engines: this.getEngines(),
      os: this.getOSCompatibility(),
      cpu: this.getCPUCompatibility(),
      memory: this.getMemoryRequirements(),
      storage: this.getStorageRequirements(),
      network: this.getNetworkRequirements()
    };
  }

  /**
   * Validate plugin configuration
   */
  async validateConfig(config: any): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!config) {
      errors.push('Configuration is required');
      return { isValid: false, errors, warnings };
    }

    // Plugin-specific validation
    const pluginValidation = await this.onValidateConfig(config);
    errors.push(...pluginValidation.errors);
    warnings.push(...pluginValidation.warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Check if plugin is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get plugin context
   */
  getContext(): PluginContext | undefined {
    return this.context;
  }

  /**
   * Add cleanup handler
   */
  protected addCleanupHandler(handler: () => Promise<void>): void {
    this.cleanupHandlers.push(handler);
  }

  /**
   * Plugin-specific initialization
   */
  protected abstract onInitialize(context: PluginContext): Promise<void>;

  /**
   * Plugin-specific cleanup
   */
  protected abstract onCleanup(): Promise<void>;

  /**
   * Plugin-specific configuration validation
   */
  protected abstract onValidateConfig(config: any): Promise<ValidationResult>;

  /**
   * Get configuration schema
   */
  protected getConfigSchema(): any {
    return undefined;
  }

  /**
   * Get entry points
   */
  protected getEntryPoints(): any {
    return undefined;
  }

  /**
   * Get icons
   */
  protected getIcons(): any {
    return undefined;
  }

  /**
   * Get screenshots
   */
  protected getScreenshots(): string[] {
    return [];
  }

  /**
   * Get tags
   */
  protected getTags(): string[] {
    return [];
  }

  /**
   * Get license
   */
  protected getLicense(): string | undefined {
    return undefined;
  }

  /**
   * Get repository
   */
  protected getRepository(): string | undefined {
    return undefined;
  }

  /**
   * Get homepage
   */
  protected getHomepage(): string | undefined {
    return undefined;
  }

  /**
   * Get bugs URL
   */
  protected getBugs(): string | undefined {
    return undefined;
  }

  /**
   * Get keywords
   */
  protected getKeywords(): string[] {
    return [];
  }

  /**
   * Get engines
   */
  protected getEngines(): any {
    return undefined;
  }

  /**
   * Get OS compatibility
   */
  protected getOSCompatibility(): string[] {
    return [];
  }

  /**
   * Get CPU compatibility
   */
  protected getCPUCompatibility(): string[] {
    return [];
  }

  /**
   * Get memory requirements
   */
  protected getMemoryRequirements(): any {
    return undefined;
  }

  /**
   * Get storage requirements
   */
  protected getStorageRequirements(): any {
    return undefined;
  }

  /**
   * Get network requirements
   */
  protected getNetworkRequirements(): any {
    return undefined;
  }

  /**
   * Publish a DID-linked resource from this plugin.
   * Uses the agent's DID as the owner.
   */
  async publishResource(params: Omit<CreateResourceParams, 'did'>): Promise<ResourceMetadata> {
    if (!this.context) {
      throw new Error('Plugin context not initialized. Call initialize() first.');
    }
    return this.context.dlr.createResource({ ...params, did: this.context.agentId });
  }

  /** Retrieve a resource owned by the agent (access-control enforced). */
  async getResource(resourceId: string): Promise<ResourceMetadata | null> {
    if (!this.context) {
      throw new Error('Plugin context not initialized. Call initialize() first.');
    }
    return this.context.dlr.getResource(this.context.agentId, resourceId);
  }

  /** Update an existing resource the agent owns. */
  async updateResource(resourceId: string, updates: UpdateResourceParams): Promise<ResourceMetadata> {
    if (!this.context) {
      throw new Error('Plugin context not initialized. Call initialize() first.');
    }
    return this.context.dlr.updateResource(this.context.agentId, resourceId, updates);
  }

  /** Delete an owned resource. */
  async deleteResource(resourceId: string): Promise<boolean> {
    if (!this.context) {
      throw new Error('Plugin context not initialized. Call initialize() first.');
    }
    return this.context.dlr.deleteResource(this.context.agentId, resourceId);
  }

  /** List resources owned by the agent. */
  async listResources(options?: { limit?: number; offset?: number }): Promise<ResourceListResult> {
    if (!this.context) {
      throw new Error('Plugin context not initialized. Call initialize() first.');
    }
    return this.context.dlr.listResources(this.context.agentId, options);
  }

  /** Publish plugin metadata as a DLR. */
  async publishPluginMetadata(visibility: ResourceVisibility = ResourceVisibility.PUBLIC): Promise<ResourceMetadata> {
    const metadata = this.getMetadata();
    return this.publishResource({
      type: 'plugin-metadata',
      name: `${this.name}-metadata`,
      data: metadata,
      visibility,
      metadata: {
        description: `Metadata for plugin ${this.name}`,
        tags: ['plugin', 'metadata', this.category]
      }
    });
  }

  /** Publish plugin signature/verification data as a DLR. */
  async publishPluginSignature(signatureData: any, visibility: ResourceVisibility = ResourceVisibility.PUBLIC): Promise<ResourceMetadata> {
    return this.publishResource({
      type: 'plugin-signature',
      name: `${this.name}-signature`,
      data: signatureData,
      visibility,
      metadata: {
        description: `Signature data for plugin ${this.name}`,
        tags: ['plugin', 'signature', this.category]
      }
    });
  }
} 