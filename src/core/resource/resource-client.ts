/**
 * DID-Linked Resource Client
 * 
 * General-purpose client for creating, retrieving, updating, and deleting
 * DID-linked resources (DLRs) of any type
 * 
 * Implements ADR-00XX: General-Purpose DID-Linked Resource Client
 */

import fs from 'fs/promises';
import path from 'path';
import { v5 as uuidv5 } from 'uuid';
import {
  CreateResourceParams,
  ResourceMetadata,
  UpdateResourceParams,
  ResourceListResult,
  DIDLinkedResourceClientOptions,
  ResourceOperationResult,
  ResourceSearchParams,
  ResourceSearchResult,
  ResourceVisibility
} from './types.js';

export interface DIDLinkedResourceClient {
  createResource(params: CreateResourceParams): Promise<ResourceMetadata>;
  getResource(did: string, resourceId: string): Promise<ResourceMetadata | null>;
  getPublicResource(resourceId: string): Promise<ResourceMetadata | null>;
  updateResource(did: string, resourceId: string, updates: UpdateResourceParams): Promise<ResourceMetadata>;
  deleteResource(did: string, resourceId: string): Promise<boolean>;
  listResources(did: string, options?: { limit?: number; offset?: number }): Promise<ResourceListResult>;
  searchResources(params: ResourceSearchParams): Promise<ResourceSearchResult>;
}

export class DIDLinkedResourceClientImpl implements DIDLinkedResourceClient {
  private options: DIDLinkedResourceClientOptions;
  private cache: Map<string, { resource: ResourceMetadata; timestamp: number }> = new Map();
  private resources: Map<string, ResourceMetadata> = new Map();

  constructor(options: DIDLinkedResourceClientOptions = {}) {
    this.options = {
      endpoint: 'https://dlr.openverifiable.org',
      timeout: 30000,
      retries: 3,
      enableCache: true,
      cacheTTL: 300000, // 5 minutes
      ...options
    };
  }

  /**
   * Get a resource by DID and resource ID
   * Implements access control based on resource visibility
   */
  async getResource(did: string, resourceId: string): Promise<ResourceMetadata | null> {
    try {
      // Check cache first
      if (this.options.enableCache) {
        const cached = this.getCache(resourceId);
        if (cached) {
          // Check access permissions for cached resource
          if (this.canAccessResource(cached, did)) {
            return cached;
          }
          return null;
        }
      }

      // Check local resources
      const resource = this.resources.get(resourceId);
      if (!resource) {
        console.log(`Resource not found: ${resourceId}`);
        return null;
      }

      // Check access permissions
      if (!this.canAccessResource(resource, did)) {
        console.log(`Access denied to resource: ${resourceId} for DID: ${did}`);
        return null;
      }

      // Cache the result
      if (this.options.enableCache) {
        this.setCache(resourceId, resource);
      }

      return resource;
    } catch (error) {
      console.error('Failed to get resource:', error);
      throw error;
    }
  }

  /**
   * Check if a DID can access a resource based on visibility settings
   */
  private canAccessResource(resource: ResourceMetadata, requestingDid: string): boolean {
    switch (resource.visibility) {
      case ResourceVisibility.PUBLIC:
        // Public resources are accessible by anyone
        return true;
      
      case ResourceVisibility.PRIVATE:
        // Private resources are only accessible by the owner
        return resource.did === requestingDid;
      
      case ResourceVisibility.SHARED:
        // Shared resources are accessible by owner and explicitly shared DIDs
        return resource.did === requestingDid || 
               (resource.sharedWith ? resource.sharedWith.includes(requestingDid) : false);
      
      default:
        // Default to private for backward compatibility
        return resource.did === requestingDid;
    }
  }

  /**
   * Get a public resource by resource ID (no DID required)
   */
  async getPublicResource(resourceId: string): Promise<ResourceMetadata | null> {
    try {
      // Check cache first
      if (this.options.enableCache) {
        const cached = this.getCache(resourceId);
        if (cached && cached.visibility === ResourceVisibility.PUBLIC) {
          return cached;
        }
      }

      // Check local resources
      const resource = this.resources.get(resourceId);
      if (resource && resource.visibility === ResourceVisibility.PUBLIC) {
        // Cache the result
        if (this.options.enableCache) {
          this.setCache(resourceId, resource);
        }
        return resource;
      }

      console.log(`Public resource not found: ${resourceId}`);
      return null;
    } catch (error) {
      console.error('Failed to get public resource:', error);
      throw error;
    }
  }

  /**
   * Create a new DID-linked resource
   */
  async createResource(params: CreateResourceParams): Promise<ResourceMetadata> {
    try {
      // Validate parameters
      this.validateCreateParams(params);

      // Generate resource ID
      const resourceId = this.generateResourceId(params.name, params.did);

      // Prepare resource data
      let resourceData: any;
      if (params.data) {
        resourceData = params.data;
      } else if (params.filePath) {
        resourceData = await this.readFileData(params.filePath);
      } else {
        throw new Error('Either data or filePath must be provided');
      }

      // Create resource metadata
      const resource: ResourceMetadata = {
        resourceId,
        did: params.did,
        name: params.name,
        type: params.type,
        version: params.version,
        resourceUrl: `${this.options.endpoint}/resources/${resourceId}`,
        createdAt: new Date().toISOString(),
        metadata: params.metadata,
        visibility: params.visibility || ResourceVisibility.PRIVATE, // Default to private
        sharedWith: params.sharedWith
      };

      // Store resource locally (in real implementation, this would call DLR service)
      this.resources.set(resourceId, resource);

      // Cache resource if caching is enabled
      if (this.options.enableCache) {
        this.setCache(resourceId, resource);
      }

      console.log(`Created DLR resource: ${resourceId} for DID: ${params.did} (visibility: ${resource.visibility})`);

      return resource;
    } catch (error) {
      console.error('Failed to create resource:', error);
      throw error;
    }
  }

  /**
   * Update an existing resource
   */
  async updateResource(did: string, resourceId: string, updates: UpdateResourceParams): Promise<ResourceMetadata> {
    try {
      // Get existing resource
      const existingResource = await this.getResource(did, resourceId);
      if (!existingResource) {
        throw new Error(`Resource not found: ${resourceId}`);
      }

      // Prepare updated data
      let resourceData: any;
      if (updates.data) {
        resourceData = updates.data;
      } else if (updates.filePath) {
        resourceData = await this.readFileData(updates.filePath);
      }

      // Update resource metadata
      const updatedResource: ResourceMetadata = {
        ...existingResource,
        ...updates,
        updatedAt: new Date().toISOString(),
        metadata: {
          ...existingResource.metadata,
          ...updates.metadata
        }
      };

      // Store updated resource
      this.resources.set(resourceId, updatedResource);

      // Update cache
      if (this.options.enableCache) {
        this.setCache(resourceId, updatedResource);
      }

      console.log(`Updated DLR resource: ${resourceId}`);

      return updatedResource;
    } catch (error) {
      console.error('Failed to update resource:', error);
      throw error;
    }
  }

  /**
   * Delete a resource
   */
  async deleteResource(did: string, resourceId: string): Promise<boolean> {
    try {
      // Check if resource exists and belongs to the DID
      const resource = await this.getResource(did, resourceId);
      if (!resource) {
        return false;
      }

      // Remove from local storage
      this.resources.delete(resourceId);

      // Remove from cache
      if (this.options.enableCache) {
        this.cache.delete(resourceId);
      }

      console.log(`Deleted DLR resource: ${resourceId}`);

      return true;
    } catch (error) {
      console.error('Failed to delete resource:', error);
      throw error;
    }
  }

  /**
   * List resources for a DID
   */
  async listResources(did: string, options: { limit?: number; offset?: number } = {}): Promise<ResourceListResult> {
    try {
      const { limit = 50, offset = 0 } = options;

      // Filter resources by DID
      const didResources = Array.from(this.resources.values())
        .filter(resource => resource.did === did)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const total = didResources.length;
      const resources = didResources.slice(offset, offset + limit);
      const hasMore = offset + limit < total;

      return {
        resources,
        total,
        hasMore
      };
    } catch (error) {
      console.error('Failed to list resources:', error);
      throw error;
    }
  }

  /**
   * Search resources
   */
  async searchResources(params: ResourceSearchParams): Promise<ResourceSearchResult> {
    const startTime = Date.now();

    try {
      let filteredResources = Array.from(this.resources.values());

      // Apply filters
      if (params.name) {
        filteredResources = filteredResources.filter(r => 
          r.name.toLowerCase().includes(params.name!.toLowerCase())
        );
      }

      if (params.type) {
        filteredResources = filteredResources.filter(r => r.type === params.type);
      }

      if (params.version) {
        filteredResources = filteredResources.filter(r => r.version === params.version);
      }

      if (params.metadata) {
        filteredResources = filteredResources.filter(r => {
          if (!r.metadata) return false;
          return Object.entries(params.metadata!).every(([key, value]) => 
            r.metadata![key] === value
          );
        });
      }

      const total = filteredResources.length;
      const limit = params.limit || 50;
      const offset = params.offset || 0;
      const resources = filteredResources.slice(offset, offset + limit);

      const executionTime = Date.now() - startTime;

      return {
        resources,
        total,
        searchParams: params,
        executionTime
      };
    } catch (error) {
      console.error('Failed to search resources:', error);
      throw error;
    }
  }

  /**
   * Get client statistics
   */
  getStats(): {
    totalResources: number;
    cachedResources: number;
    cacheHitRate: number;
    resourcesByType: Record<string, number>;
  } {
    const resourcesByType: Record<string, number> = {};
    
    for (const resource of this.resources.values()) {
      resourcesByType[resource.type] = (resourcesByType[resource.type] || 0) + 1;
    }

    const cacheHitRate = this.options.enableCache ? this.calculateCacheHitRate() : 0;

    return {
      totalResources: this.resources.size,
      cachedResources: this.cache.size,
      cacheHitRate,
      resourcesByType
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Validate create resource parameters
   */
  private validateCreateParams(params: CreateResourceParams): void {
    if (!params.did) {
      throw new Error('DID is required');
    }
    if (!params.name) {
      throw new Error('Resource name is required');
    }
    if (!params.type) {
      throw new Error('Resource type is required');
    }
    if (!params.data && !params.filePath) {
      throw new Error('Either data or filePath must be provided');
    }
  }

  /**
   * Generate unique resource ID
   */
  private generateResourceId(name: string, did: string): string {
    const namespace = uuidv5(did, uuidv5.URL);
    return uuidv5(`${name}-${Date.now()}`, namespace);
  }

  /**
   * Read file data
   */
  private async readFileData(filePath: string): Promise<any> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Try to parse as JSON, fallback to string
      try {
        return JSON.parse(content);
      } catch {
        return content;
      }
    } catch (error) {
      throw new Error(`Failed to read file: ${filePath}`);
    }
  }

  /**
   * Set cache entry
   */
  private setCache(key: string, resource: ResourceMetadata): void {
    this.cache.set(key, {
      resource,
      timestamp: Date.now()
    });
  }

  /**
   * Get cache entry
   */
  private getCache(key: string): ResourceMetadata | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check if cache entry is expired
    if (Date.now() - entry.timestamp > (this.options.cacheTTL || 300000)) {
      this.cache.delete(key);
      return null;
    }

    return entry.resource;
  }

  /**
   * Calculate cache hit rate
   */
  private calculateCacheHitRate(): number {
    // This is a simplified calculation
    // In a real implementation, you'd track actual cache hits/misses
    return this.cache.size > 0 ? 0.8 : 0; // Placeholder
  }
}

/**
 * Factory function to create a DID-linked resource client
 */
export function createDIDLinkedResourceClient(
  options?: DIDLinkedResourceClientOptions
): DIDLinkedResourceClient {
  return new DIDLinkedResourceClientImpl(options);
} 