---
ADR: 0015
Title: DID Core Architecture and Purpose
Date: 2025-01-14
Status: Proposed
Priority: MVP
Principles: [creator_first, user_sovereignty, proof_first_trust, privacy_by_design, modular_open_source, security_first, resilience_by_design]
Related_ADRs: [0001, 0007, 0006, 0016, 0017, 0018]
BusinessImpact: >-
  - Provides unified DID management across multiple methods and platforms
  - Enables seamless integration with Veramo framework while maintaining custom functionality
  - Supports both agent-integrated and standalone DID operations
  - Ensures backward compatibility and future extensibility
Runbook: |
  1. Create DID with agent: `./scripts/create-did-with-agent.sh {method} {alias}`
  2. Create DID standalone: `./scripts/create-did-standalone.sh {method} {alias}`
  3. Import existing DID: `./scripts/import-did.sh {did} {private-key}`
  4. Resolve DID document: `./scripts/resolve-did.sh {did}`
  5. Sign data with DID: `./scripts/sign-with-did.sh {did} {data}`
  6. Verify DID signature: `./scripts/verify-did-signature.sh {did} {data} {proof}`
---

## Context

The DID (Decentralized Identifier) core is the foundational component for identity management in the Open Verifiable ID SDK. It must support multiple DID methods (did:key, did:cheqd, did:web), integrate seamlessly with the Veramo framework, and provide both agent-integrated and standalone functionality. The architecture must balance flexibility, security, and ease of use while maintaining compatibility with W3C DID Core 2.0 specifications.

## Requirements

### Must
- Support multiple DID methods (did:key, did:cheqd, did:web)
- Integrate with Veramo agents for enhanced functionality
- Provide standalone DID operations for non-agent use cases
- Implement W3C DID Core 2.0 compliant operations
- Support secure key generation and storage
- Enable DID document creation and resolution
- Provide signing and verification capabilities

### Should
- Support DID import/export workflows
- Enable DID lifecycle management (create, update, deactivate)
- Provide audit logging for DID operations
- Support custom DID method extensions
- Enable batch DID operations

### Could
- Support DID rotation and key updates
- Enable DID delegation and hierarchical relationships
- Provide DID analytics and usage metrics
- Support DID-based authentication flows

## Decision

### 1. Dual-Mode Architecture

The DID core implements a dual-mode architecture that supports both agent-integrated and standalone operations:

#### Agent-Integrated Mode
- Uses Veramo's DID manager and key manager for enhanced functionality
- Leverages agent's secure storage and plugin system
- Provides seamless integration with credential issuance and verification
- Supports advanced features like DID resolution and cross-method operations

#### Standalone Mode
- Provides independent DID operations without requiring an agent
- Uses direct cryptographic operations and local storage
- Suitable for lightweight applications or migration scenarios
- Maintains full DID functionality in isolation

### 2. Implementation Approach

#### Core DID Manager Interface
```typescript
interface DIDManager {
  createDID(options: DIDCreationOptions): Promise<DIDCreationResult>;
  importDID(options: DIDImportOptions): Promise<DIDImportResult>;
  resolveDID(did: string): Promise<DIDDocument_2_0 | null>;
  signWithDID(did: string, data: Uint8Array): Promise<DataIntegrityProof>;
  verifyWithDID(did: string, data: Uint8Array, proof: DataIntegrityProof): Promise<boolean>;
  listDIDs(): Promise<string[]>;
  deleteDID(did: string): Promise<void>;
}

interface DIDCreationOptions {
  method?: string;
  keyType?: string;
  alias?: string;
}

interface DIDCreationResult {
  did: string;
  document: DIDDocument_2_0;
  keyId: string;
  credential: VerifiableCredential_2_0;
  recoveryPhrase: string;
}
```

#### DID Manager Implementation
```typescript
export class DIDManagerImpl implements DIDManager {
  private storage: SecureStorage;
  private platform: Platform;
  private agent?: OVAgent; // Optional agent reference

  constructor(storage: SecureStorage, agent?: OVAgent) {
    this.storage = storage;
    this.platform = PlatformDetector.detectPlatform();
    this.agent = agent;
  }

  async createDID(options: DIDCreationOptions): Promise<DIDCreationResult> {
    // If agent is available, use agent-integrated mode
    if (this.agent) {
      return await this.createDIDWithAgent(options);
    }
    // Otherwise, use standalone mode
    return await this.createDIDStandalone(options);
  }
}
```

#### DID Method Support
- **did:key**: Local key-based DIDs with Ed25519 support
- **did:cheqd**: Blockchain-based DIDs on Cheqd network (mainnet/testnet)
- **did:web**: Web-based DIDs with domain verification
- **Extensible**: Plugin system allows adding new DID methods

#### Integration with Veramo
- Uses Veramo's DID manager for agent-integrated operations
- Leverages Veramo's key manager for cryptographic operations
- Integrates with Veramo's DID resolver for cross-method resolution
- Maintains compatibility with Veramo's plugin ecosystem

### 3. DID Operations

#### Creation
- Generate cryptographic key pairs (Ed25519 by default)
- Create DID documents compliant with W3C DID Core 2.0
- Store private keys securely using agent or standalone storage
- Generate DID creation credentials with Data Integrity Proofs

#### Resolution
- Support universal DID resolution across methods
- Cache resolved DID documents for performance
- Handle resolution errors gracefully
- Support custom resolution strategies

#### Signing and Verification
- Use Data Integrity Proofs for W3C VC 2.0 compliance
- Support multiple cryptographic suites (eddsa-2022, jwt)
- Provide both agent-integrated and standalone signing
- Enable signature verification across methods

#### Import and Export
- Support importing existing DIDs with private keys
- Enable secure backup and recovery workflows
- Provide DID document export in multiple formats
- Support migration between different DID methods

### 4. Security and Privacy

#### Key Management
- All private keys encrypted at rest
- Use hardware-backed storage when available
- Support key rotation and recovery
- Provide secure key deletion

#### Access Control
- Require authentication for sensitive operations
- Log all DID operations for audit
- Support biometric authentication
- Enable secure key escrow if needed

## Consequences

### Positives
- **Flexibility**: Dual-mode architecture supports diverse use cases
- **Integration**: Seamless Veramo integration enhances functionality
- **Compatibility**: W3C DID Core 2.0 compliance ensures interoperability
- **Extensibility**: Plugin system allows adding new DID methods
- **Security**: Strong cryptographic foundations and secure storage

### Negatives
- **Complexity**: Dual-mode architecture adds implementation complexity
- **Dependencies**: Veramo integration creates external dependencies
- **Performance**: Agent integration may add overhead for simple operations

### Trade-offs
- **Flexibility vs Simplicity**: Dual-mode provides flexibility but increases complexity
- **Integration vs Independence**: Veramo integration enhances features but creates dependencies

## Business Impact
- **Required for MVP**: DID core is foundational for identity management
- **Ecosystem Integration**: Veramo integration enables broader ecosystem adoption
- **Competitive Advantage**: Dual-mode architecture provides unique flexibility
- **Future-Proofing**: Extensible design supports emerging DID methods

## Mission Alignment & Principle Coverage
- **Creator First, Always**: Enables creators to manage their digital identities
- **User Sovereignty**: Users control their DIDs and associated keys
- **Proof-First Trust**: DID-based identity underpins verifiable trust
- **Privacy by Design**: Secure key management and minimal data collection
- **Modular & Open-Source Foundation**: Pluggable DID method support
- **Security First**: Strong cryptographic foundations and secure storage
- **Resilience by Design**: Backup, recovery, and cross-method support 