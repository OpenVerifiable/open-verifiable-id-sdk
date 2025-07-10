/**
 * DID-Linked Resource Client Tests
 * 
 * Tests for the general-purpose DLR client implementation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DIDLinkedResourceClientImpl, createDIDLinkedResourceClient } from '../../../src/core/resource/resource-client.js';
import { ResourceVisibility } from '../../../src/core/resource/types.js';

describe('DIDLinkedResourceClient', () => {
  let client: DIDLinkedResourceClientImpl;

  beforeEach(() => {
    client = new DIDLinkedResourceClientImpl();
  });

  describe('createResource', () => {
    it('should create a resource with default private visibility', async () => {
      const params = {
        did: 'did:cheqd:test123',
        name: 'Test Resource',
        type: 'schema',
        data: { test: 'data' }
      };

      const result = await client.createResource(params);

      expect(result.resourceId).toBeDefined();
      expect(result.did).toBe(params.did);
      expect(result.name).toBe(params.name);
      expect(result.type).toBe(params.type);
      expect(result.visibility).toBe(ResourceVisibility.PRIVATE);
      expect(result.createdAt).toBeDefined();
    });

    it('should create a public resource', async () => {
      const params = {
        did: 'did:cheqd:test123',
        name: 'Public Certificate',
        type: 'certificate',
        data: { cert: 'public-key-data' },
        visibility: ResourceVisibility.PUBLIC
      };

      const result = await client.createResource(params);

      expect(result.visibility).toBe(ResourceVisibility.PUBLIC);
    });

    it('should create a shared resource', async () => {
      const params = {
        did: 'did:cheqd:test123',
        name: 'Shared Document',
        type: 'document',
        data: { content: 'shared-content' },
        visibility: ResourceVisibility.SHARED,
        sharedWith: ['did:cheqd:user456', 'did:cheqd:user789']
      };

      const result = await client.createResource(params);

      expect(result.visibility).toBe(ResourceVisibility.SHARED);
      expect(result.sharedWith).toEqual(['did:cheqd:user456', 'did:cheqd:user789']);
    });

    it('should create a resource from file', async () => {
      // This test would require a mock file system
      // For now, we'll test the validation
      const params = {
        did: 'did:cheqd:test123',
        name: 'File Resource',
        type: 'file',
        filePath: '/path/to/file.json'
      };

      await expect(client.createResource(params)).rejects.toThrow('Failed to read file');
    });
  });

  describe('getResource', () => {
    it('should return private resource for owner', async () => {
      const params = {
        did: 'did:cheqd:owner123',
        name: 'Private Resource',
        type: 'credential',
        data: { private: 'data' },
        visibility: ResourceVisibility.PRIVATE
      };

      const created = await client.createResource(params);
      const retrieved = await client.getResource('did:cheqd:owner123', created.resourceId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.resourceId).toBe(created.resourceId);
    });

    it('should return null for private resource when accessed by non-owner', async () => {
      const params = {
        did: 'did:cheqd:owner123',
        name: 'Private Resource',
        type: 'credential',
        data: { private: 'data' },
        visibility: ResourceVisibility.PRIVATE
      };

      const created = await client.createResource(params);
      const retrieved = await client.getResource('did:cheqd:other456', created.resourceId);

      expect(retrieved).toBeNull();
    });

    it('should return public resource for anyone', async () => {
      const params = {
        did: 'did:cheqd:issuer123',
        name: 'Public Certificate',
        type: 'certificate',
        data: { cert: 'public-data' },
        visibility: ResourceVisibility.PUBLIC
      };

      const created = await client.createResource(params);
      const retrieved = await client.getResource('did:cheqd:anyone789', created.resourceId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.resourceId).toBe(created.resourceId);
    });

    it('should return shared resource for owner', async () => {
      const params = {
        did: 'did:cheqd:owner123',
        name: 'Shared Resource',
        type: 'document',
        data: { content: 'shared' },
        visibility: ResourceVisibility.SHARED,
        sharedWith: ['did:cheqd:user456']
      };

      const created = await client.createResource(params);
      const retrieved = await client.getResource('did:cheqd:owner123', created.resourceId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.resourceId).toBe(created.resourceId);
    });

    it('should return shared resource for explicitly shared DID', async () => {
      const params = {
        did: 'did:cheqd:owner123',
        name: 'Shared Resource',
        type: 'document',
        data: { content: 'shared' },
        visibility: ResourceVisibility.SHARED,
        sharedWith: ['did:cheqd:user456']
      };

      const created = await client.createResource(params);
      const retrieved = await client.getResource('did:cheqd:user456', created.resourceId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.resourceId).toBe(created.resourceId);
    });

    it('should return null for shared resource when accessed by non-shared DID', async () => {
      const params = {
        did: 'did:cheqd:owner123',
        name: 'Shared Resource',
        type: 'document',
        data: { content: 'shared' },
        visibility: ResourceVisibility.SHARED,
        sharedWith: ['did:cheqd:user456']
      };

      const created = await client.createResource(params);
      const retrieved = await client.getResource('did:cheqd:other789', created.resourceId);

      expect(retrieved).toBeNull();
    });
  });

  describe('getPublicResource', () => {
    it('should return public resource without requiring DID', async () => {
      const params = {
        did: 'did:cheqd:issuer123',
        name: 'Public Certificate',
        type: 'certificate',
        data: { cert: 'public-data' },
        visibility: ResourceVisibility.PUBLIC
      };

      const created = await client.createResource(params);
      const retrieved = await client.getPublicResource(created.resourceId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.resourceId).toBe(created.resourceId);
    });

    it('should return null for private resource', async () => {
      const params = {
        did: 'did:cheqd:owner123',
        name: 'Private Resource',
        type: 'credential',
        data: { private: 'data' },
        visibility: ResourceVisibility.PRIVATE
      };

      const created = await client.createResource(params);
      const retrieved = await client.getPublicResource(created.resourceId);

      expect(retrieved).toBeNull();
    });

    it('should return null for shared resource', async () => {
      const params = {
        did: 'did:cheqd:owner123',
        name: 'Shared Resource',
        type: 'document',
        data: { content: 'shared' },
        visibility: ResourceVisibility.SHARED,
        sharedWith: ['did:cheqd:user456']
      };

      const created = await client.createResource(params);
      const retrieved = await client.getPublicResource(created.resourceId);

      expect(retrieved).toBeNull();
    });
  });

  describe('updateResource', () => {
    it('should update resource metadata', async () => {
      const params = {
        did: 'did:cheqd:owner123',
        name: 'Original Name',
        type: 'schema',
        data: { original: 'data' }
      };

      const created = await client.createResource(params);
      const updated = await client.updateResource('did:cheqd:owner123', created.resourceId, {
        name: 'Updated Name',
        metadata: { updated: true }
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.metadata?.updated).toBe(true);
      expect(updated.updatedAt).toBeDefined();
    });
  });

  describe('deleteResource', () => {
    it('should delete resource for owner', async () => {
      const params = {
        did: 'did:cheqd:owner123',
        name: 'To Delete',
        type: 'temp',
        data: { temp: 'data' }
      };

      const created = await client.createResource(params);
      const deleted = await client.deleteResource('did:cheqd:owner123', created.resourceId);

      expect(deleted).toBe(true);

      // Verify it's gone
      const retrieved = await client.getResource('did:cheqd:owner123', created.resourceId);
      expect(retrieved).toBeNull();
    });

    it('should not delete resource for non-owner', async () => {
      const params = {
        did: 'did:cheqd:owner123',
        name: 'Protected Resource',
        type: 'important',
        data: { important: 'data' }
      };

      const created = await client.createResource(params);
      const deleted = await client.deleteResource('did:cheqd:other456', created.resourceId);

      expect(deleted).toBe(false);

      // Verify it still exists
      const retrieved = await client.getResource('did:cheqd:owner123', created.resourceId);
      expect(retrieved).toBeDefined();
    });
  });

  describe('listResources', () => {
    it('should list resources for a DID', async () => {
      // Create multiple resources
      await client.createResource({
        did: 'did:cheqd:user123',
        name: 'Resource 1',
        type: 'schema',
        data: { data: 1 }
      });

      await client.createResource({
        did: 'did:cheqd:user123',
        name: 'Resource 2',
        type: 'credential',
        data: { data: 2 }
      });

      await client.createResource({
        did: 'did:cheqd:other456',
        name: 'Other Resource',
        type: 'schema',
        data: { data: 3 }
      });

      const result = await client.listResources('did:cheqd:user123');

      expect(result.resources).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(false);
      expect(result.resources.every(r => r.did === 'did:cheqd:user123')).toBe(true);
    });
  });

  describe('searchResources', () => {
    it('should search resources by name', async () => {
      await client.createResource({
        did: 'did:cheqd:user123',
        name: 'Test Schema',
        type: 'schema',
        data: { data: 1 }
      });

      await client.createResource({
        did: 'did:cheqd:user123',
        name: 'Other Resource',
        type: 'credential',
        data: { data: 2 }
      });

      const result = await client.searchResources({ name: 'Test' });

      expect(result.resources).toHaveLength(1);
      expect(result.resources[0].name).toBe('Test Schema');
    });

         it('should search resources by type', async () => {
       await client.createResource({
         did: 'did:cheqd:user123',
         name: 'Schema 1',
         type: 'schema',
         data: { data: 1 }
       });

       await client.createResource({
         did: 'did:cheqd:user123',
         name: 'Schema 2',
         type: 'schema',
         data: { data: 2 }
       });

       await client.createResource({
         did: 'did:cheqd:user123',
         name: 'Credential 1',
         type: 'credential',
         data: { data: 3 }
       });

       const result = await client.searchResources({ type: 'schema' });

       expect(result.resources).toHaveLength(2);
       expect(result.resources.every(r => r.type === 'schema')).toBe(true);
       expect(result.total).toBe(2);
     });
  });

  describe('factory function', () => {
    it('should create client with default options', () => {
      const client = createDIDLinkedResourceClient();
      expect(client).toBeInstanceOf(DIDLinkedResourceClientImpl);
    });

    it('should create client with custom options', () => {
      const client = createDIDLinkedResourceClient({
        endpoint: 'https://custom-dlr.org',
        timeout: 60000,
        enableCache: false
      });
      expect(client).toBeInstanceOf(DIDLinkedResourceClientImpl);
    });
  });

  describe('statistics', () => {
    it('should provide client statistics', async () => {
      await client.createResource({
        did: 'did:cheqd:user123',
        name: 'Schema 1',
        type: 'schema',
        data: { data: 1 }
      });

      await client.createResource({
        did: 'did:cheqd:user123',
        name: 'Credential 1',
        type: 'credential',
        data: { data: 2 }
      });

      const stats = client.getStats();

      expect(stats.totalResources).toBe(2);
      expect(stats.resourcesByType.schema).toBe(1);
      expect(stats.resourcesByType.credential).toBe(1);
      expect(stats.cachedResources).toBeGreaterThanOrEqual(0);
      expect(stats.cacheHitRate).toBeGreaterThanOrEqual(0);
    });
  });
}); 