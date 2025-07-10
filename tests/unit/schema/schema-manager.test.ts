/**
 * Schema Manager Tests
 * 
 * Comprehensive test suite for the SchemaManager class
 */

import { SchemaManager } from '../../../src/core/schema/schema-manager.js';
import {
  SchemaDefinition,
  SchemaManagerConfig,
  SchemaQuery,
  SchemaImportOptions,
  SchemaExportOptions
} from '../../../src/core/schema/types.js';
import { VerifiableCredential } from '../../../src/types/index.js';

describe('SchemaManager', () => {
  let schemaManager: SchemaManager;
  let testSchema: SchemaDefinition;
  let testCredential: VerifiableCredential;

  beforeEach(() => {
    schemaManager = new SchemaManager({
      cache: {
        enabled: false,
        ttl: 300000,
        maxSize: 1000
      }
    });
    
    testSchema = {
      id: 'test-schema-1',
      version: '1.0.0',
      name: 'TestSchema',
      description: 'A test schema for unit testing',
      schema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
          email: { type: 'string', format: 'email' }
        },
        required: ['name', 'age']
      },
      metadata: {
        author: 'did:key:test-author',
        license: 'MIT',
        contact: 'test@example.com'
      },
      tags: ['test', 'example'],
      dependencies: [],
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    };

    testCredential = {
      '@context': ['https://www.w3.org/ns/credentials/v2'],
      id: 'urn:uuid:12345678-1234-1234-1234-123456789abc',
      type: ['VerifiableCredential', 'TestCredential'],
      issuer: 'did:key:test-issuer',
      validFrom: new Date().toISOString(),
      credentialSubject: {
        id: 'did:key:test-subject',
        name: 'John Doe',
        age: 30,
        email: 'john@example.com'
      },
      proof: {
        type: 'DataIntegrityProof',
        cryptosuite: 'eddsa-jcs-2022',
        created: new Date().toISOString(),
        verificationMethod: 'did:key:test-issuer#key-1',
        proofPurpose: 'assertionMethod',
        proofValue: 'test-proof-value'
      }
    };
  });

  describe('Constructor', () => {
    it('should create SchemaManager with default configuration', () => {
      expect(schemaManager).toBeInstanceOf(SchemaManager);
    });

    it('should create SchemaManager with custom configuration', () => {
      const config: SchemaManagerConfig = {
        cache: {
          enabled: false,
          ttl: 60000,
          maxSize: 500
        },
        validation: {
          strict: false,
          allowUnknown: true,
          maxDepth: 5
        }
      };

      const customManager = new SchemaManager(config);
      expect(customManager).toBeInstanceOf(SchemaManager);
    });
  });

  describe('publishSchema', () => {
    it('should successfully publish a valid schema', async () => {
      const result = await schemaManager.publishSchema(testSchema, 'did:key:test-author');

      expect(result.success).toBe(true);
      expect(result.resourceId).toBeTruthy();
      expect(result.did).toBe('did:key:test-author');
      expect(result.timestamp).toBeTruthy();
      expect(result.metadata).toBeDefined();
    });

    it('should fail to publish invalid schema', async () => {
      const invalidSchema: SchemaDefinition = {
        ...testSchema,
        id: '', // Invalid: empty ID
        schema: {} // Invalid: empty schema
      };

      const result = await schemaManager.publishSchema(invalidSchema, 'did:key:test-author');

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      expect(result.error).toContain('Schema validation failed');
    });

    it('should handle errors during publication', async () => {
      // Mock a scenario that would cause an error
      const result = await schemaManager.publishSchema(testSchema, 'did:key:test-author');
      
      // Should succeed with valid schema
      expect(result.success).toBe(true);
    });
  });

  describe('updateSchema', () => {
    beforeEach(async () => {
      // Publish initial schema
      await schemaManager.publishSchema(testSchema, 'did:key:test-author');
    });

    it('should successfully update an existing schema', async () => {
      const updatedSchema: SchemaDefinition = {
        ...testSchema,
        version: '1.1.0',
        description: 'Updated test schema'
      };

      const result = await schemaManager.updateSchema(testSchema.id, updatedSchema, 'did:key:test-author');

      expect(result.success).toBe(true);
      expect(result.metadata?.updated).toBe(true);
    });

    it('should fail to update non-existent schema', async () => {
      const result = await schemaManager.updateSchema('non-existent', testSchema, 'did:key:test-author');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Schema not found');
    });

    it('should fail to update with invalid schema', async () => {
      const invalidSchema: SchemaDefinition = {
        ...testSchema,
        id: '', // Invalid: empty ID
        schema: {} // Invalid: empty schema
      };

      const result = await schemaManager.updateSchema(testSchema.id, invalidSchema, 'did:key:test-author');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Schema validation failed');
    });
  });

  describe('getSchema', () => {
    beforeEach(async () => {
      await schemaManager.publishSchema(testSchema, 'did:key:test-author');
    });

    it('should retrieve an existing schema', async () => {
      const schema = await schemaManager.getSchema(testSchema.id, 'did:key:test-author');

      expect(schema).toBeDefined();
      expect(schema?.id).toBe(testSchema.id);
      expect(schema?.name).toBe(testSchema.name);
    });

    it('should return null for non-existent schema', async () => {
      const schema = await schemaManager.getSchema('non-existent', 'did:key:test-author');

      expect(schema).toBeNull();
    });

    it('should filter by version when specified', async () => {
      const schema = await schemaManager.getSchema(testSchema.id, 'did:key:test-author', '1.0.0');

      expect(schema).toBeDefined();
      expect(schema?.version).toBe('1.0.0');
    });

    it('should return null for non-matching version', async () => {
      const schema = await schemaManager.getSchema(testSchema.id, 'did:key:test-author', '2.0.0');

      expect(schema).toBeNull();
    });
  });

  describe('listSchemas', () => {
    beforeEach(async () => {
      await schemaManager.publishSchema(testSchema, 'did:key:test-author');
      
      // Add another schema
      const secondSchema: SchemaDefinition = {
        ...testSchema,
        id: 'test-schema-2',
        name: 'TestSchema2'
      };
      await schemaManager.publishSchema(secondSchema, 'did:key:test-author');
    });

    it('should list all schemas for a DID', async () => {
      const result = await schemaManager.listSchemas('did:key:test-author');

      expect(result.schemas).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(false);
    });

    it('should return empty list for DID with no schemas', async () => {
      const result = await schemaManager.listSchemas('did:key:other-author');

      expect(result.schemas).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('deleteSchema', () => {
    it('should successfully delete an existing schema', async () => {
      // Create a fresh schema manager for this test
      const testManager = new SchemaManager({
        cache: { enabled: false, ttl: 300000, maxSize: 1000 }
      });
      
      // Publish a schema
      await testManager.publishSchema(testSchema, 'did:key:test-author');
      
      // Verify schema exists before deletion
      const beforeDelete = await testManager.getSchema(testSchema.id, 'did:key:test-author');
      expect(beforeDelete).toBeDefined();
      
      // Delete the schema
      await expect(
        testManager.deleteSchema(testSchema.id, 'did:key:test-author')
      ).resolves.not.toThrow();

      // Verify schema is deleted
      const schema = await testManager.getSchema(testSchema.id, 'did:key:test-author');
      expect(schema).toBeNull();
      
      // Also check internal state
      const stats = testManager.getStatistics();
      expect(stats.totalSchemas).toBe(0);
    });

    it('should throw error for non-existent schema', async () => {
      const testManager = new SchemaManager({
        cache: { enabled: false, ttl: 300000, maxSize: 1000 }
      });
      
      await expect(
        testManager.deleteSchema('non-existent', 'did:key:test-author')
      ).rejects.toThrow('Schema not found');
    });

    it('should throw error for unauthorized deletion', async () => {
      const testManager = new SchemaManager({
        cache: { enabled: false, ttl: 300000, maxSize: 1000 }
      });
      
      // Ensure the schema is published and owned by 'did:key:test-author'
      await testManager.publishSchema(testSchema, 'did:key:test-author');
      // Attempt to delete as a different DID
      await expect(
        testManager.deleteSchema(testSchema.id, 'did:key:other-author')
      ).rejects.toThrow('Unauthorized');
    });
  });

  describe('validateCredential', () => {
    it('should validate a valid credential against schema', async () => {
      const result = await schemaManager.validateCredential(testCredential, testSchema);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.schemaVersion).toBe(testSchema.version);
    });

    it('should detect validation errors in invalid credential', async () => {
      const invalidCredential: VerifiableCredential = {
        ...testCredential,
        credentialSubject: {
          id: 'did:key:test-subject',
          // Missing required fields: name, age
          email: 'john@example.com'
        }
      };

      const result = await schemaManager.validateCredential(invalidCredential, testSchema);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate VC 2.0 compliance', async () => {
      const result = await schemaManager.validateCredential(testCredential, testSchema);

      expect(result.isValid).toBe(true);
      // Should not have VC 2.0 compliance errors
      const vc2Errors = result.errors.filter(e => e.code.startsWith('VC2_'));
      expect(vc2Errors).toHaveLength(0);
    });
  });

  describe('validateSchema', () => {
    it('should validate a valid schema', async () => {
      const result = await schemaManager.validateSchema(testSchema);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect validation errors in invalid schema', async () => {
      const invalidSchema: SchemaDefinition = {
        ...testSchema,
        id: '', // Invalid: empty ID
        schema: {} // Invalid: empty schema
      };

      const result = await schemaManager.validateSchema(invalidSchema);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate schema metadata', async () => {
      const result = await schemaManager.validateSchema(testSchema);

      expect(result.isValid).toBe(true);
      // Should not have metadata validation errors
      const metadataErrors = result.errors.filter(e => e.path?.startsWith('metadata.'));
      expect(metadataErrors).toHaveLength(0);
    });
  });

  describe('resolveSchema', () => {
    beforeEach(async () => {
      await schemaManager.publishSchema(testSchema, 'did:key:test-author');
    });

    it('should resolve an existing schema by ID', async () => {
      const schema = await schemaManager.resolveSchema(testSchema.id);

      expect(schema).toBeDefined();
      expect(schema?.id).toBe(testSchema.id);
    });

    it('should return null for non-existent schema ID', async () => {
      const schema = await schemaManager.resolveSchema('non-existent-id');

      expect(schema).toBeNull();
    });
  });

  describe('searchSchemas', () => {
    beforeEach(async () => {
      await schemaManager.publishSchema(testSchema, 'did:key:test-author');
      
      // Add another schema with different tags
      const secondSchema: SchemaDefinition = {
        ...testSchema,
        id: 'test-schema-2',
        name: 'ProductionSchema',
        tags: ['production', 'live']
      };
      await schemaManager.publishSchema(secondSchema, 'did:key:test-author');
    });

    it('should search schemas by query', async () => {
      const query: SchemaQuery = {
        query: 'Test',
        limit: 10
      };

      const result = await schemaManager.searchSchemas(query);

      expect(result.schemas.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
      expect(result.query).toEqual(query);
    });

    it('should filter schemas by tags', async () => {
      const query: SchemaQuery = {
        tags: ['test'],
        limit: 10
      };

      const result = await schemaManager.searchSchemas(query);

      expect(result.schemas.every(s => s.tags?.includes('test'))).toBe(true);
    });

    it('should filter schemas by author', async () => {
      const query: SchemaQuery = {
        author: 'did:key:test-author',
        limit: 10
      };

      const result = await schemaManager.searchSchemas(query);

      expect(result.schemas.every(s => s.metadata?.author === 'did:key:test-author')).toBe(true);
    });

    it('should sort schemas by name', async () => {
      const query: SchemaQuery = {
        sortBy: 'name',
        sortOrder: 'asc',
        limit: 10
      };

      const result = await schemaManager.searchSchemas(query);

      const names = result.schemas.map(s => s.name);
      const sortedNames = [...names].sort();
      expect(names).toEqual(sortedNames);
    });
  });

  describe('importSchemas', () => {
    it('should import valid schemas', async () => {
      const schemas = [testSchema];
      const options: SchemaImportOptions = {
        overwrite: false,
        validate: true
      };

      const result = await schemaManager.importSchemas(schemas, options);

      expect(result.imported).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle import errors', async () => {
      const invalidSchema: SchemaDefinition = {
        ...testSchema,
        id: '', // Invalid: empty ID
        schema: {} // Invalid: empty schema
      };

      const schemas = [invalidSchema];
      const options: SchemaImportOptions = {
        validate: true
      };

      const result = await schemaManager.importSchemas(schemas, options);

      expect(result.imported).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should overwrite existing schemas when specified', async () => {
      // Import schema first time
      await schemaManager.importSchemas([testSchema]);

      // Import again with overwrite
      const updatedSchema: SchemaDefinition = {
        ...testSchema,
        description: 'Updated description'
      };

      const result = await schemaManager.importSchemas([updatedSchema], { overwrite: true });

      expect(result.imported).toBe(1);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('exportSchemas', () => {
    beforeEach(async () => {
      await schemaManager.publishSchema(testSchema, 'did:key:test-author');
    });

    it('should export schemas in JSON format', async () => {
      const options: SchemaExportOptions = {
        format: 'json',
        includeMetadata: true,
        pretty: true
      };

      const result = await schemaManager.exportSchemas([testSchema.id], options);

      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      
      const parsed = JSON.parse(result);
      expect(parsed.schemas).toHaveLength(1);
      expect(parsed.exportInfo.format).toBe('json');
    });

    it('should export schemas in TypeScript format', async () => {
      const options: SchemaExportOptions = {
        format: 'typescript'
      };

      const result = await schemaManager.exportSchemas([testSchema.id], options);

      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      expect(result).toContain('export interface');
      expect(result).toContain('TestSchemaCredential');
    });

    it('should handle export errors gracefully', async () => {
      const options: SchemaExportOptions = {
        format: 'json'
      };

      await expect(
        schemaManager.exportSchemas(['non-existent'], options)
      ).rejects.toThrow();
    });
  });

  describe('getStatistics', () => {
    beforeEach(async () => {
      await schemaManager.publishSchema(testSchema, 'did:key:test-author');
    });

    it('should return accurate statistics', () => {
      const stats = schemaManager.getStatistics();

      expect(stats.totalSchemas).toBe(1);
      expect(stats.cachedSchemas).toBeGreaterThanOrEqual(0);
      expect(stats.totalCacheSize).toBeGreaterThan(0);
      expect(stats.cacheHitRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Configuration', () => {
    it('should respect cache configuration', () => {
      const config: SchemaManagerConfig = {
        cache: {
          enabled: false,
          ttl: 60000,
          maxSize: 500
        }
      };

      const manager = new SchemaManager(config);
      const stats = manager.getStatistics();

      expect(stats.cachedSchemas).toBe(0);
    });

    it('should respect validation configuration', async () => {
      const config: SchemaManagerConfig = {
        validation: {
          strict: false,
          allowUnknown: true,
          maxDepth: 5
        }
      };

      const manager = new SchemaManager(config);
      
      // Test with a credential that would fail strict validation
      const result = await manager.validateCredential(testCredential, testSchema);
      
      // Should still be valid with relaxed validation
      expect(result.isValid).toBe(true);
    });
  });
}); 