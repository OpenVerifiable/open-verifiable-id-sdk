---
ADR: 0003
Title: ov-id-sdk Credential Revocation Checking
Date: 2025-01-14
Status: Proposed
Priority: MVP
Principles: [creator_first, user_sovereignty, proof_first_trust, inclusive_integration, community_collaboration, empowerment_over_extraction, privacy_by_design, modular_open_source, security_first, resilience_by_design]
Related_ADRs: [0001, 0002]
BusinessImpact: >-
  - Ensures credentials can be revoked for compliance and security at launch
  - Provides user control over revocation checking without external dependencies
  - Supports future revocation standards as they emerge
Runbook: |
  1. Check revocation status: `./scripts/check-revocation-status.sh {credentialId}`
  2. Validate revocation list: `./scripts/validate-revocation-list.sh {issuerDID}`
  3. Export revocation data: `./scripts/export-revocation-data.sh {format}`
  4. Import revocation list: `./scripts/import-revocation-list.sh {file}`
  5. Monitor revocation checking: `./scripts/monitor-revocation-checking.sh`
---

## Context

ov-id-sdk needs to check credential revocation status to ensure credentials are still valid. Revocation checking is critical for security and compliance, but we want to avoid external dependencies or subscriptions. The solution must provide robust revocation checking while maintaining user sovereignty and working completely offline.

## Requirements

### Must
- Provide local revocation checking for user-defined revocation lists
- Support basic revocation validation without external dependencies
- Enable revocation list import/export for user control
- Work completely offline for basic operations
- Maintain user sovereignty over revocation data

### Should
- Support multiple revocation sources (public, community-maintained)
- Provide extensible interface for future revocation standards
- Implement revocation list caching and validation
- Support batch revocation checking for performance

### Could
- Integrate with emerging revocation standards when available
- Provide revocation notification systems
- Support automated revocation list updates
- Enable revocation data sharing between users

## Decision

### 1. Revocation Checking Strategy
- **Local Revocation Lists**: Primary revocation data stored locally with user control
- **Simple Revocation Model**: Basic revoked/not-revoked classification with metadata
- **Extensible Design**: Interface ready for future revocation standards
- **User Sovereignty**: Users control all revocation data
- **Offline-First**: All core operations work without internet connection

### 2. Implementation Approach

#### Core Revocation Checking Interface
```typescript
interface RevocationClient {
  // Local revocation list management
  addRevokedCredential(credentialId: string, metadata: RevocationMetadata): Promise<void>;
  removeRevokedCredential(credentialId: string): Promise<void>;
  getRevokedCredentials(): Promise<RevokedCredential[]>;
  isRevoked(credentialId: string): Promise<boolean>;
  
  // Revocation validation
  checkRevocationStatus(credentialId: string): Promise<RevocationStatus>;
  validateCredential(credential: VerifiableCredential): Promise<ValidationResult>;
  
  // Revocation list import/export
  importRevocationList(list: RevocationList): Promise<void>;
  exportRevocationList(format: 'json' | 'csv'): Promise<string>;
  
  // Extensible for future standards
  registerRevocationProvider(provider: RevocationProvider): Promise<void>;
  checkWithProvider(credentialId: string, providerName: string): Promise<boolean>;
}

interface RevocationMetadata {
  issuerDID: string;
  revokedDate: string;
  reason?: string;
  notes?: string;
  source: string;
  lastChecked?: string;
}

interface RevokedCredential {
  credentialId: string;
  metadata: RevocationMetadata;
}

interface RevocationStatus {
  isRevoked: boolean;
  revokedDate?: string;
  reason?: string;
  lastChecked: string;
  source: string;
  metadata?: RevocationMetadata;
}

interface ValidationResult {
  isValid: boolean;
  revocationStatus: RevocationStatus;
  validationErrors: string[];
  warnings: string[];
}
```

#### Revocation List Storage
```typescript
interface RevocationList {
  version: string;
  created: string;
  updated: string;
  issuerDID: string;
  revokedCredentials: RevokedCredential[];
  metadata: {
    name?: string;
    description?: string;
    source?: string;
    maintainer?: string;
  };
}

interface RevocationProvider {
  name: string;
  description: string;
  checkRevocation(credentialId: string): Promise<boolean>;
  getMetadata(credentialId: string): Promise<RevocationMetadata | null>;
  isAvailable(): Promise<boolean>;
}
```

### 3. Revocation Checking Levels

#### Level 1: Local Revocation Lists (Default)
- **Scope**: User-defined revoked credentials only
- **Performance**: Instant checking
- **Privacy**: No external calls
- **Use Case**: Personal revocation tracking

#### Level 2: Local + Custom Providers (Extensible)
- **Scope**: Local lists + registered providers
- **Performance**: Depends on provider response time
- **Privacy**: Provider-dependent
- **Use Case**: Extended revocation checking

#### Level 3: Multi-Provider Consensus (Future)
- **Scope**: Multiple providers with consensus
- **Performance**: Slower due to multiple calls
- **Privacy**: Multiple provider calls
- **Use Case**: High-assurance revocation checking

### 4. Revocation List Sources

#### Local Lists
- **Storage**: Local file or database
- **Control**: User has full control
- **Access**: Instant, offline
- **Use Case**: Personal revoked credentials

#### Imported Lists
- **Source**: Community-maintained, public revocation lists
- **Format**: JSON, CSV, or standard formats
- **Control**: User chooses what to import
- **Use Case**: Community revocation data

#### Future Standards
- **Interface**: Extensible provider system
- **Standards**: W3C, DIF, or other emerging standards
- **Integration**: Plugin-based architecture
- **Use Case**: Standards-compliant revocation checking

### 5. Integration with ov-id-sdk

#### Credential Validation Integration
```typescript
// Enhanced credential validation with revocation checking
async function validateCredentialWithRevocation(
  credential: VerifiableCredential,
  revocationClient: RevocationClient
): Promise<ValidationResult> {
  // First validate the credential cryptographically
  const cryptoValidation = await validateCredential(credential);
  
  if (!cryptoValidation.isValid) {
    return {
      isValid: false,
      revocationStatus: { isRevoked: false, lastChecked: new Date().toISOString(), source: 'local' },
      validationErrors: cryptoValidation.errors,
      warnings: []
    };
  }
  
  // Then check revocation status
  const revocationStatus = await revocationClient.checkRevocationStatus(credential.id);
  
  return {
    isValid: cryptoValidation.isValid && !revocationStatus.isRevoked,
    revocationStatus,
    validationErrors: cryptoValidation.errors,
    warnings: revocationStatus.isRevoked ? ['Credential has been revoked'] : []
  };
}
```

#### Batch Revocation Checking
```typescript
// Check multiple credentials for revocation
async function batchRevocationCheck(
  credentials: VerifiableCredential[],
  revocationClient: RevocationClient
): Promise<BatchRevocationResult> {
  const results = await Promise.all(
    credentials.map(async (credential) => {
      const revocationStatus = await revocationClient.checkRevocationStatus(credential.id);
      return {
        credentialId: credential.id,
        isRevoked: revocationStatus.isRevoked,
        status: revocationStatus
      };
    })
  );
  
  return {
    totalChecked: credentials.length,
    revokedCount: results.filter(r => r.isRevoked).length,
    results
  };
}
```

### 6. User Experience

#### Adding Revoked Credentials
```typescript
// Add a revoked credential
await revocationClient.addRevokedCredential('urn:uuid:12345678-1234-1234-1234-123456789abc', {
  issuerDID: 'did:cheqd:mainnet:example',
  revokedDate: new Date().toISOString(),
  reason: 'Compromised private key',
  source: 'manual',
  notes: 'Added after security incident'
});
```

#### Importing Community Revocation Lists
```typescript
// Import a community revocation list
const communityList = await fetch('https://revocation.originvault.box/list.json')
  .then(res => res.json());
await revocationClient.importRevocationList(communityList);
```

#### Exporting Revocation Data
```typescript
// Export revocation data for backup or sharing
const exportedData = await revocationClient.exportRevocationList('json');
fs.writeFileSync('my-revocation-list.json', exportedData);
```

### 7. Performance Optimizations

#### Caching Strategy
```typescript
interface RevocationCache {
  // In-memory cache for frequently checked credentials
  cache: Map<string, RevocationStatus>;
  maxSize: number;
  ttl: number; // Time to live in milliseconds
  
  // Cache management
  get(credentialId: string): RevocationStatus | null;
  set(credentialId: string, status: RevocationStatus): void;
  clear(): void;
  isExpired(credentialId: string): boolean;
}
```

#### Batch Operations
```typescript
// Optimize batch revocation checking
async function optimizedBatchCheck(
  credentialIds: string[],
  revocationClient: RevocationClient
): Promise<RevocationStatus[]> {
  // Group by issuer for efficient checking
  const issuerGroups = groupByIssuer(credentialIds);
  
  const results = await Promise.all(
    Object.entries(issuerGroups).map(async ([issuerDID, ids]) => {
      // Check all credentials from same issuer in one operation
      return await revocationClient.checkBatchRevocation(ids, issuerDID);
    })
  );
  
  return results.flat();
}
```

## Consequences

### Positives
- **No External Dependencies**: Works completely offline
- **User Sovereignty**: Users control all revocation data
- **Future-Proof**: Extensible for emerging standards
- **Privacy**: No external calls required for basic operations
- **Performance**: Local checking is fast and efficient

### Negatives
- **Manual Management**: Users must manually manage revocation lists
- **Limited Scope**: Initially limited to local revocation data
- **No Network Effects**: No automatic revocation propagation
- **Maintenance Overhead**: Users responsible for keeping revocation lists updated

### Trade-offs
- **Simplicity vs Features**: Simple design enables immediate use but limits advanced features
- **User Control vs Automation**: Full user control requires manual management
- **Offline vs Network**: Offline-first design limits network-based revocation checking
- **Standards vs Implementation**: Waiting for standards vs implementing now

## Business Impact
- **Required for MVP**: Enables secure credential validation with revocation checking
- **User Adoption**: No subscription requirements increase adoption potential
- **Future Flexibility**: Extensible design supports emerging standards
- **Competitive Advantage**: Offline-first approach differentiates from subscription-based solutions

## Mission Alignment & Principle Coverage

### Creator First, Always
The revocation checking design prioritizes **creator outcomes**—immediate revocation validation without barriers—validated through iterative **creator feedback** research.

### User Sovereignty
Users maintain complete control: they can **export**, modify, or **delete** their revocation data at any time, ensuring **no lock-in** to external services.

### Proof-First Trust
Each revocation check is backed by **cryptographic** verification of credential IDs, logged in local **audit trails** for transparent verification.

### Inclusive Integration
The revocation checking works on **low-bandwidth** connections and meets WCAG-AA **accessibility** guidelines so every creator can participate.

### Community Collaboration
Revocation checking tools and formats will be released under an **open source** license and maintain a public roadmap, welcoming **community** contributions.

### Empowerment Over Extraction
Revocation checking features will always be free of **opaque fees**; any advanced features will use **transparent pricing** with **revenue sharing** for ecosystem contributors.

### Privacy by Design
Revocation data is stored locally with user control; no personal data is shared without explicit **consent**, ensuring **GDPR/CCPA** compliance.

### Modular & Open-Source Foundation
Revocation checking components are **modular**, published as composable NPM packages enabling integrators to adopt without vendor barriers.

### Security First
Local storage, encrypted backups, and secure validation uphold a **secure by default** stance.

### Resilience by Design
Offline-first design and local caching ensure revocation checking remains robust during network outages, exemplifying **resilience by design**. 