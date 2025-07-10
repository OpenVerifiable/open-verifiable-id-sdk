/**
 * Schema Types
 * 
 * Type definitions for schema management and validation
 */

export interface SchemaManagerConfig {
  cache?: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
  };
  validation?: {
    strict: boolean;
    allowUnknown: boolean;
    maxDepth: number;
  };
  dlr?: {
    endpoint: string;
    timeout: number;
    retries: number;
  };
  [key: string]: any;
}

export interface DLRResult {
  success: boolean;
  resourceId: string;
  did?: string;
  resourceUrl?: string;
  timestamp?: string;
  metadata?: Record<string, any>;
  error?: string;
}

export interface SchemaDefinition {
  id: string;
  name: string;
  version: string;
  description?: string;
  type: string;
  properties: Record<string, any>;
  required?: string[];
  additionalProperties?: boolean;
  tags?: string[];
  metadata?: Record<string, any>;
  updated?: string;
  schema?: Record<string, any>;
  created?: string;
  dependencies?: string[];
}

export interface SchemaList {
  schemas: SchemaDefinition[];
  total: number;
  page: number;
  limit: number;
  hasMore?: boolean;
}

export interface SchemaSearchResult {
  schemas: SchemaDefinition[];
  total: number;
  query: SchemaQuery;
  executionTime?: number;
}

export interface SchemaValidationResult {
  isValid: boolean;
  errors: SchemaValidationError[];
  warnings: ValidationWarning[];
  timestamp?: string;
  schemaVersion?: string;
}

export interface SchemaValidationError {
  path: string;
  message: string;
  code: string;
  severity?: string;
}

export interface ValidationError {
  path: string;
  message: string;
  code: string;
  severity?: string;
}

export interface ValidationWarning {
  path: string;
  message: string;
  code: string;
  severity?: string;
  details?: any;
}

export interface SchemaQuery {
  name?: string;
  version?: string;
  type?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
  query?: string;
  author?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SchemaRegistry {
  schemas: SchemaDefinition[];
  metadata: {
    name: string;
    description?: string;
    version: string;
    lastUpdated: string;
  };
}

export interface SchemaImportOptions {
  overwrite?: boolean;
  validate?: boolean;
  source?: string;
}

export interface SchemaExportOptions {
  format?: 'json' | 'yaml';
  includeMetadata?: boolean;
  filter?: SchemaQuery;
  includeExamples?: boolean;
  pretty?: boolean;
} 