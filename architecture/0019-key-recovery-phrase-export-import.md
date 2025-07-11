---
ADR: 0019
Title: Key and Recovery Phrase Export/Import for All Agent Types
Date: 2025-01-14
Status: Proposed
Priority: MVP
Principles: [creator_first, user_sovereignty, privacy_by_design, modular_open_source, security_first, resilience_by_design]
Related_ADRs: [0015, 0016, 0017, 0018]
BusinessImpact: >-
  - Enables secure backup and recovery workflows for all agent types
  - Provides flexibility in key management and migration scenarios
  - Supports diverse export/import formats for different use cases
  - Ensures data portability and user control over identity assets
Runbook: |
  1. Export private key: `./scripts/export-key.sh {agentId} {keyId} {format}`
  2. Import private key: `./scripts/import-key.sh {agentId} {keyId} {format} {key}`
  3. Export recovery phrase: `./scripts/export-recovery-phrase.sh {agentId} {keyId} {format}`
  4. Import recovery phrase: `./scripts/import-recovery-phrase.sh {agentId} {keyId} {format} {phrase}`
  5. List exportable keys: `./scripts/list-exportable-keys.sh {agentId}`
  6. Validate import format: `./scripts/validate-import-format.sh {format} {data}`
---

## Context

The Open Verifiable ID SDK must provide comprehensive key and recovery phrase management capabilities across all agent types (User, Package, Parent, Service). Users need the ability to export and import private keys and recovery phrases in multiple formats (base64 and hex) for backup, migration, and recovery scenarios. This functionality must be available for all DIDs, not just those created with mnemonics, and must maintain security and privacy standards.

## Requirements

### Must
- Support export/import of private keys in base64 and hex formats
- Support export/import of recovery phrases in base64 and hex formats
- Provide functionality for all agent types (User, Package, Parent, Service)
- Support all DID types (did:key, did:cheqd, did:web, etc.)
- Maintain encryption and security standards during export/import
- Provide audit logging for all export/import operations

### Should
- Support batch export/import operations
- Provide format validation and error handling
- Enable selective export/import of specific keys or phrases
- Support migration between different agent types

### Could
- Support additional export formats (PEM, JWK, etc.)
- Provide compression for large exports
- Enable cloud-based backup and recovery
- Support hardware security module (HSM) integration

## Decision

### 1. Universal Export/Import Interface

The SDK implements a universal export/import interface that works across all agent types and DID methods:

#### SecureStorage Interface Extension
```typescript
export interface SecureStorage {
  // Existing methods...
  
  // Export/Import operations
  exportKey(keyId: string, format: 'base64' | 'hex'): Promise<string>;
  importKey(keyId: string, key: string, format: 'base64' | 'hex'): Promise<void>;
  exportRecoveryPhrase(keyId: string, format: 'base64' | 'hex'): Promise<string>;
  importRecoveryPhrase(keyId: string, phrase: string, format: 'base64' | 'hex'): Promise<void>;
}
```

#### Implementation in SecureStorageImpl
```typescript
export class SecureStorageImpl implements SecureStorage {
  async exportKey(keyId: string, format: 'base64' | 'hex'): Promise<string> {
    try {
      const privateKey = await this.retrieveKey(keyId);
      if (!privateKey) {
        throw new Error(`Key not found: ${keyId}`);
      }

      if (format === 'base64') {
        return btoa(String.fromCharCode(...privateKey));
      } else if (format === 'hex') {
        return Array.from(privateKey)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
      } else {
        throw new Error(`Unsupported format: ${format}`);
      }
    } catch (error) {
      this.logAccess('export', keyId, false, error.message);
      throw error;
    }
  }

  async importKey(keyId: string, key: string, format: 'base64' | 'hex'): Promise<void> {
    try {
      let privateKey: Uint8Array;

      if (format === 'base64') {
        privateKey = new Uint8Array(atob(key).split('').map(c => c.charCodeAt(0)));
      } else if (format === 'hex') {
        privateKey = new Uint8Array(
          key.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
        );
      } else {
        throw new Error(`Unsupported format: ${format}`);
      }

      await this.storeKey(keyId, privateKey);
      this.logAccess('import', keyId, true);
    } catch (error) {
      this.logAccess('import', keyId, false, error.message);
      throw error;
    }
  }
}
```

### 2. Agent-Type Agnostic Implementation

#### Base Agent Integration
All agent types inherit export/import capabilities through the BaseAgent class:

```typescript
export abstract class BaseAgent implements OpenVerifiableAgent {
  // Export/Import methods available to all agent types
  async exportAgentKey(keyId: string, format: 'base64' | 'hex'): Promise<string> {
    return await this.secureStorage.exportKey(keyId, format);
  }

  async importAgentKey(keyId: string, key: string, format: 'base64' | 'hex'): Promise<void> {
    return await this.secureStorage.importKey(keyId, key, format);
  }

  async exportAgentRecoveryPhrase(keyId: string, format: 'base64' | 'hex'): Promise<string> {
    return await this.secureStorage.exportRecoveryPhrase(keyId, format);
  }

  async importAgentRecoveryPhrase(keyId: string, phrase: string, format: 'base64' | 'hex'): Promise<void> {
    return await this.secureStorage.importRecoveryPhrase(keyId, phrase, format);
  }
}
```

#### Agent-Specific Enhancements
Each agent type can provide specialized export/import functionality:

```typescript
export class UserAgent extends BaseAgent {
  // User-specific export/import methods
  async exportUserWallet(passphrase: string, format: 'base64' | 'hex'): Promise<string> {
    // Export all user keys and credentials
    const walletData = {
      userId: this.agentId,
      keys: await this.exportAllUserKeys(format),
      credentials: await this.exportAllUserCredentials(),
      timestamp: new Date().toISOString()
    };
    
    return this.encryptWalletData(walletData, passphrase);
  }

  async importUserWallet(walletData: string, passphrase: string, format: 'base64' | 'hex'): Promise<void> {
    // Import all user keys and credentials
    const decrypted = this.decryptWalletData(walletData, passphrase);
    await this.importAllUserKeys(decrypted.keys, format);
    await this.importAllUserCredentials(decrypted.credentials);
  }
}

export class PackageAgent extends BaseAgent {
  // Package-specific export/import methods
  async exportPackageSigningKeys(format: 'base64' | 'hex'): Promise<string> {
    // Export package signing keys for backup
    const signingKeys = await this.exportAllPackageKeys(format);
    return JSON.stringify({
      packageName: this.packageInfo.name,
      packageVersion: this.packageInfo.version,
      signingKeys,
      timestamp: new Date().toISOString()
    });
  }
}
```

### 3. DID Method Support

#### Universal DID Support
Export/import functionality works with all DID methods:

```typescript
// Support for different DID methods
const supportedDIDMethods = [
  'did:key',           // Local key-based DIDs
  'did:cheqd:mainnet', // Cheqd mainnet DIDs
  'did:cheqd:testnet', // Cheqd testnet DIDs
];

// Export/import works regardless of DID method
async function exportDIDKey(did: string, format: 'base64' | 'hex'): Promise<string> {
  const keyId = `${did}#key-1`;
  return await this.secureStorage.exportKey(keyId, format);
}
```

#### Recovery Phrase Generation
For DIDs that don't use mnemonics, generate recovery phrases from private keys:

```typescript
private generateRecoveryPhraseFromKey(privateKey: Uint8Array): string {
  // Use BIP39 or similar standard for recovery phrase generation
  // This ensures compatibility with existing wallet software
  const entropy = this.deriveEntropyFromKey(privateKey);
  return this.entropyToMnemonic(entropy);
}

private generateKeyFromRecoveryPhrase(recoveryPhrase: string): Uint8Array {
  // Convert recovery phrase back to private key
  const entropy = this.mnemonicToEntropy(recoveryPhrase);
  return this.deriveKeyFromEntropy(entropy);
}
```

### 4. Security and Privacy Considerations

#### Encryption and Access Control
- All exports are encrypted with agent-specific encryption keys
- Import operations require proper authentication
- Access logging tracks all export/import operations
- Support for hardware-backed key storage when available

#### Audit and Compliance
```typescript
interface ExportImportLogEntry {
  timestamp: string;
  operation: 'export' | 'import';
  keyId: string;
  format: 'base64' | 'hex';
  agentId: string;
  agentType: AgentType;
  success: boolean;
  details?: string;
}
```

#### Format Validation
```typescript
function validateExportFormat(format: string): format is 'base64' | 'hex' {
  return format === 'base64' || format === 'hex';
}

function validateBase64Data(data: string): boolean {
  try {
    atob(data);
    return true;
  } catch {
    return false;
  }
}

function validateHexData(data: string): boolean {
  return /^[0-9a-fA-F]+$/.test(data);
}
```

### 5. Error Handling and Recovery

#### Comprehensive Error Handling
```typescript
class ExportImportError extends Error {
  constructor(
    message: string,
    public operation: 'export' | 'import',
    public keyId: string,
    public format: string,
    public recoverable: boolean = true
  ) {
    super(message);
    this.name = 'ExportImportError';
  }
}

// Error recovery strategies
async function handleExportError(error: ExportImportError): Promise<void> {
  if (error.recoverable) {
    // Attempt recovery (e.g., retry with different format)
    console.warn(`Recoverable export error: ${error.message}`);
  } else {
    // Log and rethrow
    console.error(`Non-recoverable export error: ${error.message}`);
    throw error;
  }
}
```

## Consequences

### Positives
- **Universal Support**: Export/import functionality available for all agent types and DID methods
- **Format Flexibility**: Support for base64 and hex formats meets diverse use case requirements
- **Security**: Maintains encryption and access control standards
- **Auditability**: Comprehensive logging enables compliance and debugging
- **Recovery**: Enables backup and migration scenarios for all identity assets

### Negatives
- **Complexity**: Additional interface methods increase implementation complexity
- **Security Risk**: Export functionality creates potential attack vectors
- **Storage Overhead**: Audit logging and format validation add storage requirements
- **Performance**: Format conversion and validation may impact performance

### Trade-offs
- **Flexibility vs Security**: Export functionality provides flexibility but requires careful security controls
- **Simplicity vs Completeness**: Universal support increases complexity but provides comprehensive functionality
- **Performance vs Features**: Format validation improves reliability but adds overhead

## Business Impact
- **User Empowerment**: Users have full control over their identity assets
- **Migration Support**: Enables seamless migration between different platforms and agents
- **Backup and Recovery**: Comprehensive backup capabilities improve user confidence
- **Compliance**: Audit logging supports regulatory and compliance requirements
- **Interoperability**: Standard formats enable integration with external systems

## Mission Alignment & Principle Coverage
- **Creator First, Always**: Enables creators to fully control and backup their identity assets
- **User Sovereignty**: Users have complete control over export/import of their keys and recovery phrases
- **Privacy by Design**: Export/import operations respect privacy and security standards
- **Modular & Open-Source Foundation**: Universal interface supports modular agent architecture
- **Security First**: Strong encryption and access controls protect exported data
- **Resilience by Design**: Backup and recovery capabilities improve system resilience 