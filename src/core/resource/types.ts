/**
 * DID-Linked Resource Types
 * 
 * Defines interfaces and types for DID-linked resource operations
 * Implements the did-linked-resource.schema.json structure
 */

export enum ResourceVisibility {
  /** Public - accessible by anyone */
  PUBLIC = 'public',
  /** Private - only accessible by the owning DID */
  PRIVATE = 'private',
  /** Shared - accessible by specific DIDs */
  SHARED = 'shared'
}

export interface CreateResourceParams {
  /** DID that owns or publishes the resource */
  did: string;
  /** Human-readable resource name */
  name: string;
  /** Resource type (e.g., schema, credential, file, etc.) */
  type: string;
  /** Resource version (optional) */
  version?: string;
  /** Resource data (optional - use either data or filePath) */
  data?: any;
  /** File path to resource (optional - use either data or filePath) */
  filePath?: string;
  /** Additional metadata */
  metadata?: Record<string, any>;
  /** Resource visibility level */
  visibility?: ResourceVisibility;
  /** For SHARED visibility, list of DIDs that can access this resource */
  sharedWith?: string[];
}

export interface ResourceMetadata {
  /** Unique identifier for the resource */
  resourceId: string;
  /** DID that owns the resource */
  did: string;
  /** Human-readable resource name */
  name: string;
  /** Resource type */
  type: string;
  /** Resource version */
  version?: string;
  /** Resolvable URL for the resource */
  resourceUrl: string;
  /** Resource creation timestamp */
  createdAt: string;
  /** Resource last update timestamp */
  updatedAt?: string;
  /** Additional metadata */
  metadata?: Record<string, any>;
  /** Resource visibility level */
  visibility: ResourceVisibility;
  /** For SHARED visibility, list of DIDs that can access this resource */
  sharedWith?: string[];
}

export interface UpdateResourceParams {
  /** Resource name */
  name?: string;
  /** Resource type */
  type?: string;
  /** Resource version */
  version?: string;
  /** Resource data */
  data?: any;
  /** File path to resource */
  filePath?: string;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

export interface ResourceListResult {
  /** List of resources */
  resources: ResourceMetadata[];
  /** Total count */
  total: number;
  /** Whether there are more resources */
  hasMore: boolean;
}

export interface DIDLinkedResourceClientOptions {
  /** DLR endpoint URL */
  endpoint?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Number of retry attempts */
  retries?: number;
  /** Whether to enable caching */
  enableCache?: boolean;
  /** Cache TTL in milliseconds */
  cacheTTL?: number;
}

export interface ResourceOperationResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Resource metadata if successful */
  resource?: ResourceMetadata;
  /** Error message if failed */
  error?: string;
  /** Operation timestamp */
  timestamp: string;
}

export interface ResourceSearchParams {
  /** Search by resource name */
  name?: string;
  /** Search by resource type */
  type?: string;
  /** Search by resource version */
  version?: string;
  /** Search in metadata */
  metadata?: Record<string, any>;
  /** Maximum number of results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

export interface ResourceSearchResult {
  /** Matching resources */
  resources: ResourceMetadata[];
  /** Total count of matching resources */
  total: number;
  /** Search parameters used */
  searchParams: ResourceSearchParams;
  /** Search execution time in milliseconds */
  executionTime: number;
} 