---
ADR: 0017
Title: Agent Type Architecture and Purpose
Date: 2025-01-14
Status: Proposed
Priority: MVP
Principles: [creator_first, user_sovereignty, proof_first_trust, privacy_by_design, modular_open_source, security_first, resilience_by_design]
Related_ADRs: [0007, 0015, 0016, 0018]
BusinessImpact: >-
  - Provides specialized agents for different identity use cases
  - Enables targeted functionality for users, packages, organizations, and services
  - Supports diverse identity workflows and requirements
  - Enables ecosystem growth through specialized agent capabilities
Runbook: |
  1. List agent capabilities: `./scripts/list-agent-capabilities.sh {type}`
  2. Create agent instance: `./scripts/create-agent.sh {type} {id} {config}`
  3. Test agent functionality: `./scripts/test-agent.sh {type} {id}`
  4. Compare agent types: `./scripts/compare-agent-types.sh`
  5. Migrate between agent types: `./scripts/migrate-agent.sh {from} {to} {id}`
---

## Context

The Open Verifiable ID SDK supports four distinct agent types, each designed for specific identity use cases and workflows. These agent types provide specialized functionality while sharing a common foundation through the BaseAgent class. The architecture must support diverse identity requirements while maintaining consistency and interoperability.

## Requirements

### Must
- Support User, Package, Parent, and Service agent types
- Provide specialized capabilities for each agent type
- Maintain common interface through BaseAgent
- Support agent type-specific configuration and initialization
- Enable agent type discovery and capability reporting

### Should
- Support agent type migration and conversion
- Enable agent type-specific plugins and extensions
- Provide agent type comparison and selection guidance
- Support agent type inheritance and composition

### Could
- Support custom agent type creation
- Enable agent type templates and presets
- Provide agent type performance optimization
- Support agent type federation and collaboration

## Decision

### 1. Agent Type Hierarchy

The SDK implements a hierarchical agent architecture with a common base and specialized implementations:

#### Base Agent (Abstract)
```typescript
export abstract class BaseAgent implements OpenVerifiableAgent {
  public readonly agentId: string;
  public readonly agentType: AgentType;
  protected plugins: Map<string, AgentPlugin> = new Map();
  protected veramoAgent: any;
  public secureStorage: SecureStorage;
  public keyManager: any;
  public didManager: any;
  protected platform: Platform;

  // Common functionality for all agent types
  abstract createDID(method: string, options?: CreateDIDOptions): Promise<IIdentifier>;
  abstract issueCredential(template: CredentialTemplate): Promise<VerifiableCredential_2_0>;
  abstract verifyCredential(credential: VerifiableCredential_2_0): Promise<VerificationResult>;
}
```

#### Agent Type Enum
```typescript
export enum AgentType {
  USER = 'user',
  PACKAGE = 'package', 
  PARENT = 'parent',
  SERVICE = 'service'
}
```

### 2. User Agent

#### Purpose and Use Cases
- **Primary Purpose**: Individual user identity management and personal credential workflows
- **Target Users**: End users, consumers, individual developers
- **Key Workflows**: Personal identity creation, credential storage, authentication

#### Capabilities
```typescript
export class UserAgent extends BaseAgent {
  getCapabilities(): string[] {
    return [
      'create-did',
      'import-did', 
      'issue-credential',
      'verify-credential',
      'store-credential',
      'export-backup',
      'biometric-auth'
    ];
  }

  // User-specific methods
  async setPrimaryDID(did: string): Promise<void>;
  async getPrimaryDID(): Promise<string | null>;
  async createPrimaryDID(method?: string): Promise<DIDCreationResult>;
  async signCredential(credential: VerifiableCredential_2_0, issuerDID: string): Promise<VerifiableCredential_2_0>;
  async getStoredCredentials(): Promise<VerifiableCredential_2_0[]>;
  async exportWallet(passphrase: string): Promise<string>;
}
```

#### Configuration
- **User ID**: Unique identifier for the user
- **Encryption Key**: Optional encryption key for secure storage
- **Biometric Settings**: Biometric authentication preferences
- **Storage Preferences**: Local vs cloud storage options

### 3. Package Agent

#### Purpose and Use Cases
- **Primary Purpose**: Software package identity, signing, and verification
- **Target Users**: Software developers, package maintainers, supply chain security
- **Key Workflows**: Package signing, release verification, metadata management

#### Capabilities
```typescript
export class PackageAgent extends BaseAgent {
  getCapabilities(): string[] {
    return [
      'create-package-did',
      'sign-package-metadata',
      'verify-package-signatures',
      'manage-release-credentials'
    ];
  }

  // Package-specific methods
  async signRelease(packageInfo: any): Promise<VerifiableCredential_2_0>;
  async createPackageCredential(metadata: any): Promise<VerifiableCredential_2_0>;
}
```

#### Configuration
- **Package Name**: Name of the software package
- **Package Version**: Version of the package
- **Signing Keys**: Keys for package signing and verification
- **Release Policies**: Policies for release signing and verification

### 4. Parent Agent

#### Purpose and Use Cases
- **Primary Purpose**: Organizational and hierarchical identity management
- **Target Users**: Organizations, enterprises, governance bodies
- **Key Workflows**: Authority delegation, organizational governance, trust management

#### Capabilities
```typescript
export class ParentAgent extends BaseAgent {
  getCapabilities(): string[] {
    return [
      'create-organization-did',
      'delegate-permissions',
      'manage-child-agents',
      'issue-organization-credentials',
      'revoke-credentials'
    ];
  }

  // Parent-specific methods
  async delegateAuthority(childDID: string, permissions: string[]): Promise<VerifiableCredential_2_0>;
  async delegateToChild(childAgentId: string, permissions: string[]): Promise<VerifiableCredential_2_0>;
}
```

#### Configuration
- **Organization ID**: Unique identifier for the organization
- **Delegation Policies**: Policies for authority delegation
- **Trust Settings**: Trust registry and verification settings
- **Governance Rules**: Organizational governance and compliance rules

### 5. Service Agent

#### Purpose and Use Cases
- **Primary Purpose**: API and service identity management and verification
- **Target Users**: Service providers, API developers, integration teams
- **Key Workflows**: Service authentication, external verification, trust registry queries

#### Capabilities
```typescript
export class ServiceAgent extends BaseAgent {
  getCapabilities(): string[] {
    return [
      'external-verification',
      'trust-registry-query',
      'revocation-checking',
      'schema-validation'
    ];
  }

  // Service-specific methods
  async authenticateService(serviceEndpoint: string): Promise<boolean>;
  async testConnection(): Promise<boolean>;
  async queryExternalService(query: any): Promise<any>;
}
```

#### Configuration
- **Service Name**: Name of the service
- **Service Config**: Endpoint, API keys, authentication settings
- **Verification Settings**: External verification and trust settings
- **Integration Settings**: Integration with external services and registries

### 6. Agent Type Relationships

#### Inheritance Hierarchy
```
BaseAgent (Abstract)
├── UserAgent
├── PackageAgent  
├── ParentAgent
└── ServiceAgent
```

#### Collaboration Patterns
- **User ↔ Package**: Users can verify package signatures and credentials
- **Parent ↔ User**: Parents can delegate authority to user agents
- **Parent ↔ Service**: Parents can manage service authentication and trust
- **Service ↔ All**: Services can verify credentials from all agent types

#### Migration and Conversion
- Support migration between agent types when appropriate
- Enable agent type conversion with data preservation
- Provide migration tools and validation

## Consequences

### Positives
- **Specialization**: Each agent type provides targeted functionality for specific use cases
- **Flexibility**: Multiple agent types support diverse identity workflows
- **Consistency**: Common base ensures consistent behavior across agent types
- **Extensibility**: Agent type architecture supports future extensions and custom types
- **Interoperability**: Agent types can collaborate and exchange credentials

### Negatives
- **Complexity**: Multiple agent types increase system complexity
- **Learning Curve**: Developers must understand different agent types and their capabilities
- **Maintenance**: Each agent type requires separate maintenance and testing

### Trade-offs
- **Specialization vs Simplicity**: Specialized agents provide targeted functionality but increase complexity
- **Flexibility vs Consistency**: Multiple agent types provide flexibility but require consistent interfaces

## Business Impact
- **Market Coverage**: Multiple agent types address diverse market segments
- **Developer Adoption**: Specialized agents reduce complexity for specific use cases
- **Ecosystem Growth**: Agent type architecture enables ecosystem expansion
- **Competitive Advantage**: Comprehensive agent type support differentiates the SDK

## Mission Alignment & Principle Coverage
- **Creator First, Always**: Specialized agents support creators' specific needs
- **User Sovereignty**: User agents give individuals control over their identity
- **Proof-First Trust**: All agent types support verifiable trust and proof
- **Privacy by Design**: Agent types support privacy-preserving workflows
- **Modular & Open-Source Foundation**: Agent type architecture supports modular development
- **Security First**: Each agent type implements appropriate security measures
- **Resilience by Design**: Agent type diversity improves system resilience 