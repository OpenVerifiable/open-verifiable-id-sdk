# ADR-0058: General-Purpose DID-Linked Resource Client

## Status

Proposed

## Context

The Open Verifiable ID SDK needs a unified, agent-agnostic way to create, retrieve, update, and delete DID-linked resources (DLRs) of any type (schemas, credentials, files, etc.), supporting both Cheqd and custom endpoints. Currently, DLR operations are scattered across different modules (SchemaManager, deprecated resourceManager, etc.) with no consistent interface.

## Decision

We will implement a `DIDLinkedResourceClient` in `src/core/resource/` with a clean CRUD interface that:

- Supports resource creation from data or file
- Supports retrieval, update, deletion, and listing by DID and resourceId
- Abstracts DLR endpoint/service details
- Uses types and schemas compatible with `open-verifiable-types` and the new `did-linked-resource.schema.json`
- Is integrated into agent and plugin workflows
- Becomes the canonical way to manage DLRs in the SDK
- **Supports resource visibility and access control** (see below)

## Resource Visibility and Access Control

### ResourceVisibility Enum

The client supports a `ResourceVisibility` enum to control access to resources:

- `PUBLIC`: Accessible by anyone (e.g., public X.509 certs, schemas)
- `PRIVATE`: Only accessible by the owning DID (e.g., personal credentials)
- `SHARED`: Accessible by the owner and a list of explicitly shared DIDs (e.g., collaborative resources)

### Rationale
- **Public resources** are needed for things like public keys, schemas, and service endpoints, which must be discoverable and verifiable by anyone.
- **Private resources** protect sensitive data, such as personal credentials or confidential business information.
- **Shared resources** enable collaboration or selective sharing between DIDs.

### Access Control Logic

The client enforces access control using a `canAccessResource` method:
- **Public**: Anyone can access
- **Private**: Only the owner DID can access
- **Shared**: Owner and DIDs in `sharedWith` can access

This enables flexible patterns for both open and restricted DLRs, supporting a wide range of use cases.

### Key Interfaces

```typescript
interface DIDLinkedResourceClient {
  createResource(params: CreateResourceParams): Promise<ResourceMetadata>;
  getResource(did: string, resourceId: string): Promise<ResourceMetadata | null>;
  getPublicResource(resourceId: string): Promise<ResourceMetadata | null>;
  updateResource(did: string, resourceId: string, updates: UpdateResourceParams): Promise<ResourceMetadata>;
  deleteResource(did: string, resourceId: string): Promise<boolean>;
  listResources(did: string, options?: { limit?: number; offset?: number }): Promise<ResourceListResult>;
  searchResources(params: ResourceSearchParams): Promise<ResourceSearchResult>;
}
```

## Consequences

### Positive

- **Unified Interface**: All DLR operations use the same client interface
- **Agent Agnostic**: Works with any agent type without tight coupling
- **Extensible**: Easy to add new DLR endpoints or services
- **Type Safe**: Full TypeScript support with comprehensive types
- **Cached**: Built-in caching for performance
- **Searchable**: Advanced search capabilities across resources
- **Flexible Access**: Supports public, private, and shared resources

### Negative

- **Migration Required**: Existing code using deprecated resource managers needs migration
- **Learning Curve**: New interface to learn for developers
- **Dependency**: Adds dependency on uuid for resource ID generation

### Neutral

- **Schema Compliance**: Enforces consistent resource structure via JSON schema
- **Performance**: Caching improves performance but adds memory usage
- **Flexibility**: Supports both data and file-based resource creation

## Implementation

### File Structure

```
src/core/resource/
├── types.ts              # Resource types and interfaces
├── resource-client.ts    # Main client implementation
└── index.ts             # Barrel exports
```

### Integration Points

- **Agent Integration**: Agents can use the client for resource operations
- **Plugin Integration**: Plugins can access resources via the client
- **CLI Integration**: CLI commands can use the client for resource management
- **Schema Registry**: SchemaManager can use the client for schema DLRs

### Migration Strategy

1. **Phase 1**: Implement new client alongside existing code
2. **Phase 2**: Update SchemaManager to use the new client
3. **Phase 3**: Migrate agent and plugin code to use the client
4. **Phase 4**: Remove deprecated resource managers

## Related ADRs

- ADR-0007: Agent Architecture and Extensibility
- ADR-0046: Monetized Plugin Installation Architecture
- ADR-0057: Agent Plugin Integration Architecture

## References

- [DID-Linked Resources Specification](https://w3c-ccg.github.io/did-linked-resources/)
- [Cheqd DLR Implementation](https://docs.cheqd.io/node/architecture/adr-list/adr-002-did-linked-resources)
- [Open Verifiable Types](https://github.com/originvault/open-verifiable-types) 