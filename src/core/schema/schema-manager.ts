/**
 * Schema Manager
 * 
 * Core schema management system supporting DID-Linked Resource (DLR) operations
 * and W3C VC 2.0 compliance for verifiable credentials
 */

import {
  SchemaDefinition,
  DLRResult,
  SchemaList,
  SchemaQuery,
  SchemaSearchResult,
  SchemaValidationResult,
  SchemaManagerConfig,
  SchemaImportOptions,
  SchemaExportOptions,
  ValidationError,
  ValidationWarning
} from './types.js';
import { VerifiableCredential } from '../../types/index.js';

/**
 * Schema Manager Implementation
 * 
 * Provides comprehensive schema management capabilities including:
 * - DID-Linked Resource (DLR) operations
 * - Schema validation against W3C VC 2.0 standards
 * - Schema discovery and resolution
 * - Schema caching for performance
 */
export class SchemaManager {
  private config: SchemaManagerConfig;
  private cache: Map<string, { schema: SchemaDefinition; timestamp: number }> = new Map();
  private schemas: Map<string, SchemaDefinition> = new Map();

  constructor(config: SchemaManagerConfig = {}) {
    this.config = {
      cache: {
        enabled: true,
        ttl: 300000, // 5 minutes
        maxSize: 1000
      },
      validation: {
        strict: true,
        allowUnknown: false,
        maxDepth: 10
      },
      dlr: {
        endpoint: 'https://dlr.openverifiable.org',
        timeout: 30000,
        retries: 3
      },
      ...config
    };
  }

  /**
   * Publish a schema as a DID-Linked Resource
   */
  async publishSchema(schema: SchemaDefinition, did: string): Promise<DLRResult> {
    try {
      // Validate schema before publishing
      const validation = await this.validateSchema(schema);
      if (!validation.isValid) {
        return {
          success: false,
          resourceId: '',
          did,
          timestamp: new Date().toISOString(),
          error: `Schema validation failed: ${validation.errors.map(e => e.message).join(', ')}`
        };
      }

      // Generate resource ID
      const resourceId = this.generateResourceId(schema.id || schema.name, did);

      // Simulate DLR publication (in real implementation, this would call DLR service)
      const dlrResult: DLRResult = {
        success: true,
        resourceId,
        did,
        resourceUrl: `${this.config.dlr?.endpoint}/resources/${resourceId}`,
        timestamp: new Date().toISOString(),
        metadata: {
          schemaId: schema.id,
          schemaVersion: schema.version,
          contentType: 'application/schema+json'
        }
      };

      // Store schema locally
      this.schemas.set(schema.id, schema);
      
      // Cache schema if caching is enabled
      if (this.config.cache?.enabled) {
        this.setCache(schema.id, schema);
      }

      return dlrResult;
    } catch (error) {
      return {
        success: false,
        resourceId: '',
        did,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update an existing schema
   */
  async updateSchema(schemaName: string, schema: SchemaDefinition, did: string): Promise<DLRResult> {
    try {
      // Check if schema exists
      const existingSchema = this.schemas.get(schemaName);
      if (!existingSchema) {
        return {
          success: false,
          resourceId: '',
          did,
          timestamp: new Date().toISOString(),
          error: `Schema not found: ${schemaName}`
        };
      }

      // Validate updated schema
      const validation = await this.validateSchema(schema);
      if (!validation.isValid) {
        return {
          success: false,
          resourceId: '',
          did,
          timestamp: new Date().toISOString(),
          error: `Schema validation failed: ${validation.errors.map(e => e.message).join(', ')}`
        };
      }

      // Update schema
      schema.updated = new Date().toISOString();
      this.schemas.set(schemaName, schema);

      // Update cache
      if (this.config.cache?.enabled) {
        this.setCache(schemaName, schema);
      }

      // Simulate DLR update
      const resourceId = this.generateResourceId(schemaName, did);
      return {
        success: true,
        resourceId,
        did,
        resourceUrl: `${this.config.dlr?.endpoint}/resources/${resourceId}`,
        timestamp: new Date().toISOString(),
        metadata: {
          schemaId: schemaName,
          schemaVersion: schema.version,
          contentType: 'application/schema+json',
          updated: true
        }
      };
    } catch (error) {
      return {
        success: false,
        resourceId: '',
        did,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get a schema by name and DID
   */
  async getSchema(schemaName: string, did: string, version?: string): Promise<SchemaDefinition | null> {
    try {
      // Check cache first
      if (this.config.cache?.enabled) {
        const cached = this.getCache(schemaName);
        if (cached) {
          if (version && cached.version !== version) {
            return null;
          }
          return cached;
        }
      }

      // Check local schemas
      const schema = this.schemas.get(schemaName);
      if (schema) {
        // Filter by version if specified
        if (version && schema.version !== version) {
          return null;
        }
        // Cache the result
        if (this.config.cache?.enabled) {
          this.setCache(schemaName, schema);
        }
        return schema;
      }

      // Simulate DLR resolution (in real implementation, this would call DLR service)
      const resourceId = this.generateResourceId(schemaName, did);
      
      // For now, return null if not found locally
      // In real implementation, this would fetch from DLR service
      return null;
    } catch (error) {
      console.error('Error getting schema:', error);
      return null;
    }
  }

  /**
   * List all schemas for a DID
   */
  async listSchemas(did: string): Promise<SchemaList> {
    try {
      const schemas = Array.from(this.schemas.values())
        .filter(schema => schema.metadata?.author === did);

      return {
        schemas,
        total: schemas.length,
        page: 1,
        limit: schemas.length,
        hasMore: false
      };
    } catch (error) {
      console.error('Error listing schemas:', error);
      return {
        schemas: [],
        total: 0,
        page: 1,
        limit: 0,
        hasMore: false
      };
    }
  }

  /**
   * Delete a schema
   */
  async deleteSchema(schemaName: string, did: string): Promise<void> {
    try {
      const schema = this.schemas.get(schemaName);
      if (!schema) {
        throw new Error(`Schema not found: ${schemaName}`);
      }

      // Check if user owns the schema
      if (schema.metadata?.author !== did) {
        throw new Error(`Unauthorized: Schema ${schemaName} is not owned by ${did}`);
      }

      // Remove from local storage
      this.schemas.delete(schemaName);
      console.log(`Schema ${schemaName} deleted from storage. Storage size: ${this.schemas.size}`);

      // Remove from cache
      if (this.config.cache?.enabled) {
        this.cache.delete(schemaName);
      }

      // Simulate DLR deletion (in real implementation, this would call DLR service)
      console.log(`Schema ${schemaName} deleted for DID ${did}`);
    } catch (error) {
      console.error('Error deleting schema:', error);
      throw error;
    }
  }

  /**
   * Validate a credential against a schema
   */
  async validateCredential(credential: VerifiableCredential, schema: SchemaDefinition): Promise<SchemaValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const startTime = Date.now();

    try {
      // Basic credential structure validation
      if (!credential['@context']) {
        errors.push({
          code: 'MISSING_CONTEXT',
          message: 'Credential is missing @context field',
          path: '@context',
          severity: 'error'
        });
      }

      if (!credential.id) {
        errors.push({
          code: 'MISSING_ID',
          message: 'Credential is missing id field',
          path: 'id',
          severity: 'error'
        });
      }

      if (!credential.type || !Array.isArray(credential.type)) {
        errors.push({
          code: 'MISSING_TYPE',
          message: 'Credential is missing or has invalid type field',
          path: 'type',
          severity: 'error'
        });
      }

      if (!credential.issuer) {
        errors.push({
          code: 'MISSING_ISSUER',
          message: 'Credential is missing issuer field',
          path: 'issuer',
          severity: 'error'
        });
      }

      if (!credential.validFrom) {
        errors.push({
          code: 'MISSING_VALID_FROM',
          message: 'Credential is missing validFrom field',
          path: 'validFrom',
          severity: 'error'
        });
      }

      if (!credential.credentialSubject) {
        errors.push({
          code: 'MISSING_CREDENTIAL_SUBJECT',
          message: 'Credential is missing credentialSubject field',
          path: 'credentialSubject',
          severity: 'error'
        });
      }

      // Schema-specific validation
      if (schema.schema) {
        const schemaValidation = this.validateAgainstSchema(credential.credentialSubject, schema.schema);
        errors.push(...schemaValidation.errors);
        warnings.push(...schemaValidation.warnings);
      }

      // W3C VC 2.0 specific validations
      if (this.config.validation?.strict) {
        const vc2Validation = this.validateVC2Compliance(credential);
        errors.push(...vc2Validation.errors);
        warnings.push(...vc2Validation.warnings);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        timestamp: new Date().toISOString(),
        schemaVersion: schema.version
      };
    } catch (error) {
      errors.push({
        path: 'unknown',
        code: 'VALIDATION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown validation error',
        severity: 'critical'
      });

      return {
        isValid: false,
        errors,
        warnings,
        timestamp: new Date().toISOString(),
        schemaVersion: schema.version
      };
    }
  }

  /**
   * Validate a schema definition
   */
  async validateSchema(schema: SchemaDefinition): Promise<SchemaValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // Required fields validation
      if (!schema.id) {
        errors.push({
          code: 'MISSING_SCHEMA_ID',
          message: 'Schema is missing id field',
          path: 'id',
          severity: 'error'
        });
      }

      if (!schema.version) {
        errors.push({
          code: 'MISSING_SCHEMA_VERSION',
          message: 'Schema is missing version field',
          path: 'version',
          severity: 'error'
        });
      }

      if (!schema.name) {
        errors.push({
          code: 'MISSING_SCHEMA_NAME',
          message: 'Schema is missing name field',
          path: 'name',
          severity: 'error'
        });
      }

      if (!schema.schema) {
        errors.push({
          code: 'MISSING_SCHEMA_CONTENT',
          message: 'Schema is missing schema content',
          path: 'schema',
          severity: 'error'
        });
      }

      // Schema content validation
      if (schema.schema && typeof schema.schema === 'object') {
        const schemaContentValidation = this.validateSchemaContent(schema.schema);
        errors.push(...schemaContentValidation.errors);
        warnings.push(...schemaContentValidation.warnings);
      }

      // Metadata validation
      if (schema.metadata) {
        const metadataValidation = this.validateSchemaMetadata(schema.metadata);
        errors.push(...metadataValidation.errors);
        warnings.push(...metadataValidation.warnings);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        timestamp: new Date().toISOString(),
        schemaVersion: schema.version
      };
    } catch (error) {
      errors.push({
        path: 'schema',
        code: 'SCHEMA_VALIDATION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown schema validation error',
        severity: 'critical'
      });

      return {
        isValid: false,
        errors,
        warnings,
        timestamp: new Date().toISOString(),
        schemaVersion: schema.version
      };
    }
  }

  /**
   * Resolve a schema by ID
   */
  async resolveSchema(schemaId: string): Promise<SchemaDefinition | null> {
    try {
      // Check cache first
      if (this.config.cache?.enabled) {
        const cached = this.getCache(schemaId);
        if (cached) {
          return cached;
        }
      }

      // Check local schemas
      const schema = this.schemas.get(schemaId);
      if (schema) {
        if (this.config.cache?.enabled) {
          this.setCache(schemaId, schema);
        }
        return schema;
      }

      // In real implementation, this would resolve from DLR or external registry
      return null;
    } catch (error) {
      console.error('Error resolving schema:', error);
      return null;
    }
  }

  /**
   * Search schemas
   */
  async searchSchemas(query: SchemaQuery): Promise<SchemaSearchResult> {
    const startTime = Date.now();
    
    try {
      let results = Array.from(this.schemas.values());

      // Apply filters
      if (query.query) {
        const searchTerm = query.query.toLowerCase();
        results = results.filter(schema => 
          schema.name.toLowerCase().includes(searchTerm) ||
          schema.description?.toLowerCase().includes(searchTerm) ||
          schema.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
        );
      }

      if (query.tags && query.tags.length > 0) {
        results = results.filter(schema => 
          schema.tags?.some(tag => query.tags!.includes(tag))
        );
      }

      if (query.author) {
        results = results.filter(schema => 
          schema.metadata?.author === query.author
        );
      }

      if (query.name) {
        results = results.filter(schema => 
          schema.name.toLowerCase().includes(query.name!.toLowerCase())
        );
      }

      if (query.version) {
        results = results.filter(schema => 
          schema.version === query.version
        );
      }

      // Apply sorting
      if (query.sortBy) {
        results.sort((a, b) => {
          let aValue: any;
          let bValue: any;

          switch (query.sortBy) {
            case 'name':
              aValue = a.name;
              bValue = b.name;
              break;
            case 'created':
              aValue = new Date(a.created || new Date());
              bValue = new Date(b.created || new Date());
              break;
            case 'updated':
              aValue = new Date(a.updated || new Date());
              bValue = new Date(b.updated || new Date());
              break;
            case 'usage':
              aValue = a.metadata?.usage?.usageCount || 0;
              bValue = b.metadata?.usage?.usageCount || 0;
              break;
            default:
              return 0;
          }

          if (query.sortOrder === 'desc') {
            return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
          } else {
            return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
          }
        });
      }

      // Apply pagination
      const offset = query.offset || 0;
      const limit = query.limit || results.length;
      const paginatedResults = results.slice(offset, offset + limit);

      return {
        schemas: paginatedResults,
        total: results.length,
        query,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      console.error('Error searching schemas:', error);
      return {
        schemas: [],
        total: 0,
        query,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Import schemas from external source
   */
  async importSchemas(schemas: SchemaDefinition[], options: SchemaImportOptions = {}): Promise<{ imported: number; errors: string[] }> {
    const errors: string[] = [];
    let imported = 0;

    for (const schema of schemas) {
      try {
        // Validate schema if requested
        if (options.validate !== false) {
          const validation = await this.validateSchema(schema);
          if (!validation.isValid) {
            errors.push(`Schema ${schema.name} validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
            continue;
          }
        }

        // Check if schema already exists
        const existing = this.schemas.get(schema.id);
        if (existing && !options.overwrite) {
          errors.push(`Schema ${schema.name} already exists. Use overwrite option to replace.`);
          continue;
        }

        // Import schema
        this.schemas.set(schema.id, schema);
        
        // Cache if enabled
        if (this.config.cache?.enabled) {
          this.setCache(schema.id, schema);
        }

        imported++;
      } catch (error) {
        errors.push(`Failed to import schema ${schema.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { imported, errors };
  }

  /**
   * Export schemas
   */
  async exportSchemas(schemaIds: string[], options: SchemaExportOptions): Promise<string> {
    try {
      const schemas = schemaIds
        .map(id => this.schemas.get(id))
        .filter((schema): schema is SchemaDefinition => schema !== undefined);

      // Check if all requested schemas were found
      if (schemas.length !== schemaIds.length) {
        const missingSchemas = schemaIds.filter(id => !this.schemas.has(id));
        throw new Error(`Schemas not found: ${missingSchemas.join(', ')}`);
      }

      const exportData = {
        schemas: schemas.map(schema => {
          const exportSchema: any = {
            id: schema.id,
            version: schema.version,
            name: schema.name,
            description: schema.description,
            schema: schema.schema,
            tags: schema.tags,
            dependencies: schema.dependencies,
            created: schema.created,
            updated: schema.updated
          };

          if (options.includeMetadata && schema.metadata) {
            exportSchema.metadata = schema.metadata;
          }

          if (options.includeExamples && schema.metadata?.examples) {
            exportSchema.examples = schema.metadata.examples;
          }

          return exportSchema;
        }),
        exportInfo: {
          timestamp: new Date().toISOString(),
          format: options.format,
          totalSchemas: schemas.length
        }
      };

      if (options.format === 'json') {
        return options.pretty ? JSON.stringify(exportData, null, 2) : JSON.stringify(exportData);
      } else if (options.format === 'yaml') {
        // In real implementation, use a YAML library
        return JSON.stringify(exportData, null, 2);
      } else if (options.format === 'typescript') {
        // Generate TypeScript types
        return this.generateTypeScriptTypes(schemas);
      }

      return JSON.stringify(exportData);
    } catch (error) {
      throw new Error(`Failed to export schemas: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get schema manager statistics
   */
  getStatistics(): {
    totalSchemas: number;
    cachedSchemas: number;
    totalCacheSize: number;
    cacheHitRate: number;
  } {
    const totalSchemas = this.schemas.size;
    const cachedSchemas = this.cache.size;
    const totalCacheSize = this.config.cache?.maxSize || 0;
    
    // Calculate cache hit rate (simplified)
    const cacheHitRate = cachedSchemas > 0 ? (cachedSchemas / totalSchemas) * 100 : 0;

    return {
      totalSchemas,
      cachedSchemas,
      totalCacheSize,
      cacheHitRate
    };
  }

  // Private helper methods

  private generateResourceId(schemaId: string, did: string): string {
    return `${did}:${schemaId}:${Date.now()}`;
  }

  private setCache(key: string, schema: SchemaDefinition): void {
    if (!this.config.cache?.enabled) return;

    // Check cache size limit
    if (this.cache.size >= (this.config.cache.maxSize || 1000)) {
      // Remove oldest entry
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      schema,
      timestamp: Date.now()
    });
  }

  private getCache(key: string): SchemaDefinition | null {
    if (!this.config.cache?.enabled) return null;

    const cached = this.cache.get(key);
    if (!cached) return null;

    // Check if cache entry is expired
    const now = Date.now();
    const ttl = this.config.cache.ttl || 300000;
    
    if (now - cached.timestamp > ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.schema;
  }

  private validateAgainstSchema(data: any, schema: Record<string, any>): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Basic JSON Schema validation (simplified)
    // In real implementation, use a proper JSON Schema validator
    if (schema.type && typeof data !== schema.type) {
      errors.push({
        code: 'TYPE_MISMATCH',
        message: `Expected type ${schema.type}, got ${typeof data}`,
        path: '',
        severity: 'error'
      });
    }

    if (schema.required && Array.isArray(schema.required)) {
      for (const requiredField of schema.required) {
        if (!(requiredField in data)) {
          errors.push({
            code: 'MISSING_REQUIRED_FIELD',
            message: `Missing required field: ${requiredField}`,
            path: requiredField,
            severity: 'error'
          });
        }
      }
    }

    return { errors, warnings };
  }

  private validateVC2Compliance(credential: VerifiableCredential): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check for VC 2.0 specific requirements
    if (!credential['@context'] || !Array.isArray(credential['@context'])) {
      errors.push({
        code: 'VC2_CONTEXT_REQUIRED',
        message: 'VC 2.0 requires @context to be an array',
        path: '@context',
        severity: 'error'
      });
    }

    // Check for validFrom instead of issuanceDate
    if ('issuanceDate' in credential && !('validFrom' in credential)) {
      warnings.push({
        code: 'VC2_VALID_FROM_PREFERRED',
        message: 'VC 2.0 prefers validFrom over issuanceDate',
        path: 'validFrom',
        details: { suggestion: 'Use validFrom instead of issuanceDate' }
      });
    }

    return { errors, warnings };
  }

  private validateSchemaContent(schema: Record<string, any>): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Basic schema content validation
    if (!schema.type && !schema.$ref && !schema.allOf && !schema.anyOf && !schema.oneOf) {
      warnings.push({
        code: 'SCHEMA_NO_TYPE',
        message: 'Schema should specify a type',
        path: 'type',
        details: { suggestion: 'Add a type field to the schema' }
      });
    }

    return { errors, warnings };
  }

  private validateSchemaMetadata(metadata: any): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!metadata.author) {
      errors.push({
        code: 'MISSING_AUTHOR',
        message: 'Schema metadata must include author field',
        path: 'metadata.author',
        severity: 'error'
      });
    }

    return { errors, warnings };
  }

  private generateTypeScriptTypes(schemas: SchemaDefinition[]): string {
    let typescript = '// Generated TypeScript types from schemas\n\n';

    for (const schema of schemas) {
      const interfaceName = this.generateInterfaceName(schema.name || 'Unknown');
      typescript += `export interface ${interfaceName} {\n`;
      
      if (schema.schema?.properties) {
        for (const [key, value] of Object.entries(schema.schema.properties)) {
          const type = this.getTypeScriptType(value);
          const required = schema.schema.required?.includes(key) ? '' : '?';
          typescript += `  ${key}${required}: ${type};\n`;
        }
      }
      
      typescript += '}\n\n';
    }

    return typescript;
  }

  private generateInterfaceName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('') + 'Credential';
  }

  private getTypeScriptType(schemaProperty: any): string {
    if (schemaProperty.type === 'string') {
      return 'string';
    } else if (schemaProperty.type === 'number' || schemaProperty.type === 'integer') {
      return 'number';
    } else if (schemaProperty.type === 'boolean') {
      return 'boolean';
    } else if (schemaProperty.type === 'array') {
      const itemType = this.getTypeScriptType(schemaProperty.items || {});
      return `${itemType}[]`;
    } else if (schemaProperty.type === 'object') {
      return 'Record<string, any>';
    } else {
      return 'any';
    }
  }
} 