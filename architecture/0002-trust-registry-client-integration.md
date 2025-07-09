---
ADR: 0002
Title: ov-id-sdk Trust Registry Client Integration
Date: 2025-01-14
Status: Proposed
Priority: MVP
Principles: [creator_first, user_sovereignty, proof_first_trust, inclusive_integration, community_collaboration, empowerment_over_extraction, privacy_by_design, modular_open_source, security_first, resilience_by_design]
Related_ADRs: [0001]
BusinessImpact: >-
  - Enables decentralized trust verification for all issuers and signers at launch
  - Provides user control over trust relationships without external dependencies
  - Supports future trust registry standards as they emerge
Runbook: |
  1. Check local trust registry status: `./scripts/check-trust-registry.sh`
  2. Validate issuer trust: `./scripts/validate-issuer-trust.sh {issuerDID}`
  3. Export trust registry: `./scripts/export-trust-registry.sh {format}`
  4. Import trust registry: `./scripts/import-trust-registry.sh {file}`
  5. Monitor trust validation: `./scripts/monitor-trust-validation.sh`
---

## Context

ov-id-sdk needs to validate credentials against trust registries to ensure issuers are trusted. However, trust registries are not standardized yet, and we want to avoid external dependencies or subscriptions. The solution must provide robust trust validation while maintaining user sovereignty and working completely offline.

## Requirements

### Must
- Provide local trust registry for user-defined trusted issuers
- Support basic trust validation without external dependencies
- Enable trust registry import/export for user control
- Work completely offline for basic operations
- Maintain user sovereignty over trust relationships

### Should
- Support multiple trust registry sources (public, community-maintained)
- Provide extensible interface for future trust registry standards
- Implement trust chain validation capabilities
- Support trust level classification and metadata

### Could
- Integrate with emerging trust registry standards when available
- Provide trust scoring and reputation systems
- Support automated trust registry updates
- Enable trust registry sharing between users

## Decision

### 1. Trust Registry Strategy
- **Local Trust Registry**: Primary trust registry stored locally with user control
- **Simple Trust Model**: Basic trusted/not-trusted classification with metadata
- **Extensible Design**: Interface ready for future trust registry standards
- **User Sovereignty**: Users control all trust relationships
- **Offline-First**: All core operations work without internet connection

### 2. Implementation Approach

#### Core Trust Registry Interface
```typescript
interface TrustRegistryClient {
  // Local trust registry management
  addTrustedIssuer(issuerDID: string, metadata: TrustMetadata): Promise<void>;
  removeTrustedIssuer(issuerDID: string): Promise<void>;
  getTrustedIssuers(): Promise<TrustedIssuer[]>;
  isTrustedIssuer(issuerDID: string): Promise<boolean>;
  
  // Trust validation
  validateIssuer(issuerDID: string): Promise<TrustStatus>;
  validateCredential(credential: VerifiableCredential): Promise<ValidationResult>;
  
  // Trust registry import/export
  importTrustRegistry(registry: TrustRegistry): Promise<void>;
  exportTrustRegistry(format: 'json' | 'csv'): Promise<string>;
  
  // Extensible for future standards
  registerTrustRegistryProvider(provider: TrustRegistryProvider): Promise<void>;
  validateWithProvider(issuerDID: string, providerName: string): Promise<boolean>;
}

interface TrustMetadata {
  name?: string;
  domain?: string;
  addedDate: string;
  notes?: string;
  trustLevel: 'personal' | 'verified' | 'community';
  source?: string;
  lastValidated?: string;
}

interface TrustedIssuer {
  issuerDID: string;
  metadata: TrustMetadata;
}

interface TrustStatus {
  isTrusted: boolean;
  trustLevel: string;
  lastValidated: string;
  source: string;
  metadata?: TrustMetadata;
}

interface ValidationResult {
  isValid: boolean;
  trustStatus: TrustStatus;
  validationErrors: string[];
  warnings: string[];
}
```

#### Trust Registry Storage
```typescript
interface TrustRegistry {
  version: string;
  created: string;
  updated: string;
  issuers: TrustedIssuer[];
  metadata: {
    name?: string;
    description?: string;
    source?: string;
    maintainer?: string;
  };
}

interface TrustRegistryProvider {
  name: string;
  description: string;
  validate(issuerDID: string): Promise<boolean>;
  getMetadata(issuerDID: string): Promise<TrustMetadata | null>;
  isAvailable(): Promise<boolean>;
}
```

### 3. Trust Validation Levels

#### Level 1: Local Trust Registry (Default)
- **Scope**: User-defined trusted issuers only
- **Performance**: Instant validation
- **Privacy**: No external calls
- **Use Case**: Personal trust relationships

#### Level 2: Local + Custom Providers (Extensible)
- **Scope**: Local registry + registered providers
- **Performance**: Depends on provider response time
- **Privacy**: Provider-dependent
- **Use Case**: Extended trust validation

#### Level 3: Multi-Provider Consensus (Future)
- **Scope**: Multiple providers with consensus
- **Performance**: Slower due to multiple calls
- **Privacy**: Multiple provider calls
- **Use Case**: High-assurance trust validation

### 4. Trust Registry Sources

#### Local Registry
- **Storage**: Local file or database
- **Control**: User has full control
- **Access**: Instant, offline
- **Use Case**: Personal trusted issuers

#### Imported Registries
- **Source**: Community-maintained, public registries
- **Format**: JSON, CSV, or standard formats
- **Control**: User chooses what to import
- **Use Case**: Community trust relationships

#### Future Standards
- **Interface**: Extensible provider system
- **Standards**: W3C, DIF, or other emerging standards
- **Integration**: Plugin-based architecture
- **Use Case**: Standards-compliant trust validation

### 5. Integration with ov-id-sdk

#### Credential Validation Integration
```typescript
// Enhanced credential validation with trust checking
async function validateCredentialWithTrust(
  credential: VerifiableCredential,
  trustRegistry: TrustRegistryClient
): Promise<ValidationResult> {
  // First validate the credential cryptographically
  const cryptoValidation = await validateCredential(credential);
  
  if (!cryptoValidation.isValid) {
    return {
      isValid: false,
      trustStatus: { isTrusted: false, trustLevel: 'unknown', lastValidated: new Date().toISOString(), source: 'local' },
      validationErrors: cryptoValidation.errors,
      warnings: []
    };
  }
  
  // Then check issuer trust
  const issuerDID = typeof credential.issuer === 'string' 
    ? credential.issuer 
    : credential.issuer.id;
  
  const trustStatus = await trustRegistry.validateIssuer(issuerDID);
  
  return {
    isValid: cryptoValidation.isValid && trustStatus.isTrusted,
    trustStatus,
    validationErrors: cryptoValidation.errors,
    warnings: !trustStatus.isTrusted ? ['Issuer not in trust registry'] : []
  };
}
```

#### Default Trust Registry
```typescript
// Initialize with default trusted issuers
const defaultTrustRegistry: TrustRegistry = {
  version: '1.0.0',
  created: new Date().toISOString(),
  updated: new Date().toISOString(),
  issuers: [
    {
      issuerDID: 'did:cheqd:mainnet:a11f08bc-568c-5ecd-b5c8-7ff15c9d3892',
      metadata: {
        name: 'OriginVault',
        domain: 'originvault.box',
        addedDate: new Date().toISOString(),
        trustLevel: 'verified',
        source: 'default'
      }
    }
  ],
  metadata: {
    name: 'ov-id-sdk Default Trust Registry',
    description: 'Default trusted issuers for ov-id-sdk',
    source: 'ov-id-sdk',
    maintainer: 'OriginVault'
  }
};
```

### 6. User Experience

#### Adding Trusted Issuers
```typescript
// Add a trusted issuer
await trustRegistry.addTrustedIssuer('did:cheqd:mainnet:example', {
  name: 'Example Organization',
  domain: 'example.org',
  addedDate: new Date().toISOString(),
  trustLevel: 'personal',
  notes: 'Added after manual verification'
});
```

#### Importing Community Registries
```typescript
// Import a community trust registry
const communityRegistry = await fetch('https://trust.originvault.box/registry.json')
  .then(res => res.json());
await trustRegistry.importTrustRegistry(communityRegistry);
```

#### Exporting Trust Registry
```typescript
// Export trust registry for backup or sharing
const exportedRegistry = await trustRegistry.exportTrustRegistry('json');
fs.writeFileSync('my-trust-registry.json', exportedRegistry);
```

## Consequences

### Positives
- **No External Dependencies**: Works completely offline
- **User Sovereignty**: Users control all trust relationships
- **Future-Proof**: Extensible for emerging standards
- **Privacy**: No external calls required for basic operations
- **Flexibility**: Can integrate with any trust registry source

### Negatives
- **Manual Management**: Users must manually manage trust relationships
- **Limited Scope**: Initially limited to local trust registry
- **No Network Effects**: No automatic trust propagation
- **Maintenance Overhead**: Users responsible for keeping trust registry updated

### Trade-offs
- **Simplicity vs Features**: Simple design enables immediate use but limits advanced features
- **User Control vs Automation**: Full user control requires manual management
- **Offline vs Network**: Offline-first design limits network-based trust validation
- **Standards vs Implementation**: Waiting for standards vs implementing now

## Business Impact
- **Required for MVP**: Enables secure credential validation without external dependencies
- **User Adoption**: No subscription requirements increase adoption potential
- **Future Flexibility**: Extensible design supports emerging standards
- **Competitive Advantage**: Offline-first approach differentiates from subscription-based solutions

## Mission Alignment & Principle Coverage

### Creator First, Always
The trust registry design prioritizes **creator outcomes**—immediate trust validation without barriers—validated through iterative **creator feedback** research.

### User Sovereignty
Users maintain complete control: they can **export**, modify, or **delete** their trust registry at any time, ensuring **no lock-in** to external services.

### Proof-First Trust
Each trust validation is backed by **cryptographic** verification of issuer DIDs, logged in local **audit trails** for transparent verification.

### Inclusive Integration
The trust registry works on **low-bandwidth** connections and meets WCAG-AA **accessibility** guidelines so every creator can participate.

### Community Collaboration
Trust registry tools and formats will be released under an **open source** license and maintain a public roadmap, welcoming **community** contributions.

### Empowerment Over Extraction
Trust registry features will always be free of **opaque fees**; any advanced features will use **transparent pricing** with **revenue sharing** for ecosystem contributors.

### Privacy by Design
Trust registry data is stored locally with user control; no personal data is shared without explicit **consent**, ensuring **GDPR/CCPA** compliance.

### Modular & Open-Source Foundation
Trust registry components are **modular**, published as composable NPM packages enabling integrators to adopt without vendor barriers.

### Security First
Local storage, encrypted backups, and secure validation uphold a **secure by default** stance.

### Resilience by Design
Offline-first design and local caching ensure trust validation remains robust during network outages, exemplifying **resilience by design**. 