import { createDIDLinkedResourceClient, DIDLinkedResourceClient } from '@/core/resource'

/**
 * Shared singleton instance used throughout the SDK.  
 * Avoids spawning multiple in-memory caches and ensures all components
 * (agents, plugins, schema manager, etc.) see the same view of DLRs.
 */
export const dlrClient: DIDLinkedResourceClient = createDIDLinkedResourceClient()

export type { DIDLinkedResourceClient } 