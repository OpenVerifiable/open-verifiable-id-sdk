/**
 * DID-Linked Resource Module
 * 
 * Exports the general-purpose DID-linked resource client and related types
 */

export type { DIDLinkedResourceClient } from './resource-client.js';
export { DIDLinkedResourceClientImpl, createDIDLinkedResourceClient } from './resource-client.js';

export type {
  CreateResourceParams,
  ResourceMetadata,
  UpdateResourceParams,
  ResourceListResult,
  DIDLinkedResourceClientOptions,
  ResourceOperationResult,
  ResourceSearchParams,
  ResourceSearchResult
} from './types.js'; 