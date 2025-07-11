---
ADR: 0007
Title: open-verifiable-id-sdk Agent Architecture and Extensibility
Date: 2025-01-14
Status: Proposed
Priority: MVP
Principles: [creator_first, modular_open_source, security_first, resilience_by_design, inclusive_integration, community_collaboration]
Related_ADRs: [0001, 0002, 0003, 0004, 0005, 0006]
BusinessImpact: >-
  - Enables modular, pluggable identity and credential workflows
  - Supports rapid integration of new DID methods, credential types, and cryptographic suites
  - Fosters community contributions and ecosystem growth
Runbook: |
  1. List installed agent plugins: `./scripts/list-agent-plugins.sh`
  2. Add new DID method plugin: `./scripts/add-did-method-plugin.sh {plugin}`
  3. Add new credential type plugin: `./scripts/add-credential-type-plugin.sh {plugin}`
  4. Validate agent configuration: `./scripts/validate-agent-config.sh`
  5. Monitor agent health: `./scripts/monitor-agent-health.sh`
---

## Context

The open-verifiable-id-sdk must support a wide range of DID methods, credential types, and cryptographic primitives. A modular, extensible agent architecture is required to enable rapid innovation, community contributions, and integration with evolving standards. This architecture should allow new plugins to be added with minimal friction and maximum security.

## Requirements

### Must
- Support pluggable DID method providers (e.g., did:cheqd, did:key, did:web)
- Support pluggable credential type handlers (e.g., VC 2.0, custom schemas)
- Enable cryptographic suite extensibility (e.g., new proof types)
- Provide clear plugin API and lifecycle hooks
- Ensure agent security and isolation between plugins

### Should
- Allow plugins to be installed/removed at runtime or build time
- Support plugin versioning and compatibility checks
- Enable plugin discovery and documentation
- Provide agent health and diagnostics APIs

### Could
- Support remote/distributed agent plugins
- Enable plugin marketplace or registry
- Allow plugin configuration via CLI or UI

## Decision

### 1. Agent and Plugin Model
- **Agent Core**: Provides base identity, credential, and key management APIs
- **DID Method Plugins**: Implement support for specific DID methods (e.g., did:cheqd, did:key)
- **Credential Type Plugins**: Implement support for specific credential schemas and proof types
- **Crypto Suite Plugins**: Add new cryptographic primitives and proof mechanisms
- **Plugin API**: Standard interface for plugin registration, lifecycle, and configuration
- **Security Model**: Plugins run in isolated contexts with least privilege

### 2. Implementation Approach

#### Agent Core Interface
```typescript
interface OpenVerifiableAgent {
  registerPlugin(plugin: AgentPlugin): void;
  getPlugin(name: string): AgentPlugin | undefined;
  listPlugins(): AgentPlugin[];
  createDID(method: string, options: any): Promise<IIdentifier>;
  issueCredential(type: string, data: any): Promise<VerifiableCredential>;
  verifyCredential(credential: VerifiableCredential): Promise<ValidationResult>;
  sign(data: any, options: any): Promise<any>;
  resolveDID(did: string): Promise<DIDDocument>;
  // ...other core APIs
}

interface AgentPlugin {
  name: string;
  version: string;
  type: 'did-method' | 'credential-type' | 'crypto-suite' | 'utility';
  register(agent: OpenVerifiableAgent): void;
  unregister?(agent: OpenVerifiableAgent): void;
  getInfo(): PluginInfo;
}

interface PluginInfo {
  name: string;
  version: string;
  description: string;
  author: string;
  type: string;
  capabilities: string[];
}
```

#### Plugin Lifecycle
- Plugins are registered at agent initialization or dynamically at runtime
- Plugins can expose new APIs, event hooks, and configuration options
- Agent maintains a registry of active plugins and their capabilities
- Plugins can be safely unregistered or upgraded

#### Security and Isolation
- Plugins run in isolated contexts (e.g., separate processes or sandboxes)
- Agent enforces least privilege and validates plugin signatures
- Plugins cannot access other plugins' data unless explicitly allowed

#### Extensibility and Community
- Plugin API and documentation are open and versioned
- Community can contribute new plugins for DID methods, credential types, and cryptographic suites
- Agent supports plugin discovery, health checks, and diagnostics

### 3. User Experience

#### Plugin Management
- List, install, and remove plugins via CLI or UI
- View plugin documentation and capabilities
- Validate agent configuration and plugin compatibility

#### Extending Functionality
- Add new DID methods or credential types without modifying core SDK
- Enable/disable plugins as needed for specific workflows
- Receive updates and security patches for plugins

## Consequences

### Positives
- **Modularity**: Rapid integration of new identity and credential standards
- **Community Growth**: Open plugin model encourages contributions
- **Security**: Isolated plugins reduce risk of compromise
- **Flexibility**: Users can tailor agent to their needs

### Negatives
- **Complexity**: Plugin management and isolation add development overhead
- **Compatibility**: Versioning and dependency management required
- **Performance**: Plugin isolation may add runtime overhead

### Trade-offs
- **Modularity vs Simplicity**: Extensibility adds complexity but is essential for innovation
- **Security vs Performance**: Isolation may impact performance but is critical for trust

## Business Impact
- **Required for MVP**: Modular agent is foundational for SDK adoption
- **Ecosystem Growth**: Plugin model enables rapid ecosystem expansion
- **Competitive Advantage**: Extensible, secure agent differentiates open-verifiable-id-sdk

## Mission Alignment & Principle Coverage
- **Creator First, Always**: Enables creators to use the best tools for their needs
- **Modular & Open-Source Foundation**: Pluggable, community-driven architecture
- **Security First**: Plugin isolation and validation
- **Resilience by Design**: Agent can adapt to new standards and threats
- **Inclusive Integration**: Supports global, diverse identity ecosystems
- **Community Collaboration**: Open plugin API and documentation 