---
ADR: 0018
Title: Storage Core Architecture and Purpose
Date: 2025-01-14
Status: Proposed
Priority: MVP
Principles: [creator_first, user_sovereignty, proof_first_trust, privacy_by_design, modular_open_source, security_first, resilience_by_design]
Related_ADRs: [0006, 0015, 0016, 0017, 0020]
BusinessImpact: >-
  - Provides secure, platform-agnostic storage for sensitive identity data
  - Enables agent-specific storage with isolation and security
  - Supports backup, recovery, and migration workflows
  - Ensures data privacy and protection across all platforms
Runbook: |
  1. Check storage status: `./scripts/check-storage-status.sh {agentId}`
  2. Export agent backup: `./scripts/export-agent-backup.sh {agentId} {passphrase}`
  3. Import agent backup: `./scripts/import-agent-backup.sh {agentId} {file} {passphrase}`
  4. Rotate encryption keys: `./scripts/rotate-encryption-keys.sh {agentId} {old} {new}`
  5. Monitor storage access: `./scripts/monitor-storage-access.sh {agentId}`
  6. Clear agent storage: `./scripts/clear-agent-storage.sh {agentId}`
---

## Context

The storage core is responsible for securely storing and managing sensitive identity data including private keys, verifiable credentials, and agent-specific information. It must provide platform-agnostic storage capabilities while ensuring data security, privacy, and resilience. The architecture must support both standalone and agent-integrated storage with appropriate isolation and access controls.

## Requirements

### Must
- Encrypt all sensitive data at rest using strong cryptography
- Support multiple platforms (Node.js, Browser, React Native)
- Provide agent-specific storage isolation
- Enable secure backup and recovery workflows
- Support encryption key rotation and management

### Should
- Use hardware-backed storage when available
- Provide audit logging for all storage operations
- Support secure deletion and data wiping
- Enable storage performance optimization

### Could
- Support distributed and cloud storage options
- Enable storage compression and deduplication
- Provide storage analytics and monitoring
- Support storage federation and synchronization
- Support external database storage (PostgreSQL, MongoDB, etc.)

## Decision

### 1. Dual-Mode Storage Architecture

The storage core implements a dual-mode architecture that supports both standalone and agent-integrated storage:

#### Storage Interface
```typescript
export interface SecureStorage {
  // Key storage
  storeKey(keyId: string, privateKey: Uint8Array, options?: StoreOptions): Promise<void>;
  retrieveKey(keyId: string, options?: AccessOptions): Promise<Uint8Array | null>;
  
  // Credential storage
  storeCredential(credentialId: string, credential: VerifiableCredential_2_0): Promise<void>;
  retrieveCredential(credentialId: string): Promise<VerifiableCredential_2_0 | null>;
  
  // Management operations
  deleteKey(keyId: string): Promise<void>;
  deleteCredential(credentialId: string): Promise<void>;
  
  // Backup and migration
  exportBackup(passphrase: string): Promise<string>;
  importBackup(data: string, passphrase: string): Promise<void>;
  rotateEncryptionKey(oldPassphrase: string, newPassphrase: string): Promise<void>;
  
  // Audit and monitoring
  getAccessLog(): Promise<AccessLogEntry[]>;
}
```

#### Storage Implementation
```typescript
export class SecureStorageImpl implements SecureStorage {
  private platform: Platform;
  private encryptionKey: string;
  private accessLog: AccessLogEntry[] = [];
  private agent?: OVAgent; // Optional agent reference
  private agentId?: string; // Agent-specific storage prefix

  constructor(encryptionKey?: string, agent?: OVAgent) {
    this.platform = PlatformDetector.detectPlatform();
    this.encryptionKey = encryptionKey || this.generateEncryptionKey();
    this.agent = agent;
    this.agentId = agent?.agentId;
  }
}
```

### 2. Agent-Integrated Storage Features

#### Agent-Specific Isolation
- Each agent gets its own storage namespace with prefix `agent:{agentId}:`
- Prevents data leakage between different agents
- Enables agent-specific backup and recovery
- Supports agent migration and cloning

#### Enhanced Backup and Recovery
```typescript
private async exportAgentBackup(passphrase: string): Promise<string> {
  const backupData = {
    agentId: this.agent.agentId,
    agentType: this.agent.agentType,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    data: {
      keys: await this.exportAllKeys(),
      credentials: await this.exportAllCredentials()
    }
  };

  const serialized = JSON.stringify(backupData);
  const encrypted = await this.encryptWithPassphrase(serialized, passphrase);
  
  return encrypted;
}
```

#### Agent-Specific Key Rotation
- Rotate encryption keys for specific agents
- Maintain data isolation during key rotation
- Support agent-specific security policies
- Enable agent migration with new encryption keys

### 3. Platform-Specific Storage Backends

#### Node.js Storage
```typescript
private async nodeStore(key: string, data: string): Promise<void> {
  const fs = await import('fs/promises');
  const path = await import('path');
  const os = await import('os');
  
  const storageDir = path.join(os.homedir(), '.open-verifiable-id-sdk');
  await fs.mkdir(storageDir, { recursive: true });
  await fs.writeFile(path.join(storageDir, `${key}.dat`), data);
}
```

#### Browser Storage
```typescript
private async browserStore(key: string, data: string): Promise<void> {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(`ov-id-sdk:${key}`, data);
  } else {
    throw new Error('Browser storage not available');
  }
}
```

#### React Native Storage
```typescript
private async reactNativeStore(key: string, data: string): Promise<void> {
  // In a real implementation, this would use AsyncStorage
  throw new Error('React Native storage not yet implemented');
}
```

#### Memory Storage (Fallback)
```typescript
private memoryStorage = new Map<string, string>();

private async memoryStore(key: string, data: string): Promise<void> {
  this.memoryStorage.set(key, data);
}
```

### 4. Security and Privacy Features

#### Encryption and Authentication
- AES-256-GCM encryption for all data at rest
- PBKDF2/Argon2 key derivation from user passphrases
- Hardware-backed storage when available (TPM, Secure Enclave)
- Biometric authentication support

#### Access Control and Audit
```typescript
interface AccessLogEntry {
  timestamp: string;
  operation: 'store' | 'retrieve' | 'delete' | 'export' | 'import' | 'rotate';
  keyOrCredentialId: string;
  user: string;
  method: 'password' | 'biometric' | 'hardware' | 'mfa';
  success: boolean;
  details?: string;
}
```

#### Secure Deletion
- Overwrite data before deletion
- Support secure wiping of entire agent storage
- Enable emergency data destruction
- Provide deletion confirmation and logging

### 5. Backup and Recovery Workflows

#### Agent-Specific Backup
- Export all agent data with encryption
- Include agent metadata and configuration
- Support incremental and full backups
- Enable backup verification and integrity checking

#### Migration and Recovery
- Import agent data to new instances
- Support cross-platform migration
- Enable selective data recovery
- Provide migration validation and rollback

#### Key Rotation
- Rotate encryption keys without data loss
- Support key escrow and recovery
- Enable key backup and restoration
- Provide key rotation monitoring

### 6. Performance and Optimization

#### Caching and Compression
- Cache frequently accessed data
- Compress stored data to reduce storage requirements
- Optimize storage operations for performance
- Support storage tiering and archiving

#### Monitoring and Analytics
- Monitor storage usage and performance
- Track access patterns and security events
- Provide storage health and diagnostics
- Enable storage optimization recommendations

## Consequences

### Positives
- **Security**: Strong encryption and access controls protect sensitive data
- **Platform Support**: Works across Node.js, Browser, and React Native
- **Agent Isolation**: Prevents data leakage between agents
- **Backup and Recovery**: Comprehensive backup and recovery capabilities
- **Privacy**: Minimal data collection and secure data handling

### Negatives
- **Complexity**: Dual-mode architecture adds implementation complexity
- **Performance**: Encryption and isolation may impact performance
- **Platform Dependencies**: Platform-specific storage backends create dependencies

### Trade-offs
- **Security vs Performance**: Strong security measures may impact performance
- **Isolation vs Simplicity**: Agent isolation provides security but increases complexity
- **Platform Support vs Consistency**: Platform-specific backends provide optimization but reduce consistency

## Business Impact
- **Security Compliance**: Meets security and privacy requirements for identity management
- **Cross-Platform Support**: Enables SDK adoption across different platforms
- **Data Protection**: Protects sensitive identity data and builds user trust
- **Operational Resilience**: Backup and recovery capabilities improve operational reliability

## Mission Alignment & Principle Coverage
- **Creator First, Always**: Protects creators' sensitive identity data
- **User Sovereignty**: Users control their data and encryption keys
- **Proof-First Trust**: Secure storage underpins verifiable trust
- **Privacy by Design**: Encryption and minimal data collection by default
- **Modular & Open-Source Foundation**: Pluggable storage backends
- **Security First**: No compromise on cryptographic security
- **Resilience by Design**: Backup, recovery, and migration capabilities 