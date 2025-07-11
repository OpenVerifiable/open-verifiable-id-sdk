---
ADR: 0006
Title: open-verifiable-id-sdk Secure Local Storage for Keys and Credentials
Date: 2025-01-14
Status: Proposed
Priority: MVP
Principles: [creator_first, user_sovereignty, proof_first_trust, privacy_by_design, modular_open_source, security_first, resilience_by_design]
Related_ADRs: [0001, 0002, 0003, 0004, 0005]
BusinessImpact: >-
  - Ensures private keys and credentials are protected at rest and in use
  - Enables compliance with security and privacy best practices
  - Builds user trust and supports regulatory requirements
Runbook: |
  1. Check storage encryption status: `./scripts/check-storage-encryption.sh`
  2. Rotate encryption keys: `./scripts/rotate-encryption-keys.sh`
  3. Export encrypted backup: `./scripts/export-encrypted-backup.sh {file}`
  4. Restore from backup: `./scripts/restore-encrypted-backup.sh {file}`
  5. Monitor access logs: `./scripts/monitor-storage-access.sh`
---

## Context

Private keys and verifiable credentials are highly sensitive assets. open-verifiable-id-sdk must provide robust, user-friendly, and secure local storage for these assets, ensuring they are protected from unauthorized access, loss, or compromise. This is foundational for user sovereignty, privacy, and trust.

## Requirements

### Must
- Encrypt all private keys and credentials at rest
- Use strong, industry-standard encryption algorithms (e.g., AES-256-GCM)
- Require authentication to unlock and access keys/credentials
- Support secure backup and restore workflows
- Allow users to rotate encryption keys

### Should
- Support hardware-backed key storage (e.g., TPM, Secure Enclave) if available
- Provide audit logs for key/credential access
- Enable secure deletion and wiping of keys/credentials
- Allow user-configurable encryption passphrases

### Could
- Integrate with biometric authentication for unlocking storage
- Support multi-factor authentication for sensitive operations
- Enable remote wipe in case of device loss
- Provide secure enclave abstraction for browser/desktop

## Decision

### 1. Encryption and Storage Strategy
- **Default Encryption**: All keys and credentials are encrypted at rest using AES-256-GCM
- **User Authentication**: Access requires user authentication (password, passphrase, or biometric)
- **Key Derivation**: Use PBKDF2 or Argon2 for deriving encryption keys from user passphrases
- **Hardware Support**: Use hardware-backed storage if available, fallback to software encryption
- **Backup/Restore**: Encrypted export/import for backup and migration
- **Key Rotation**: Allow users to rotate encryption keys without data loss

### 2. Implementation Approach

#### Core Storage Interface
```typescript
interface SecureStorage {
  storeKey(keyId: string, privateKey: Uint8Array, options?: StoreOptions): Promise<void>;
  retrieveKey(keyId: string, options?: AccessOptions): Promise<Uint8Array | null>;
  storeCredential(credentialId: string, credential: VerifiableCredential, options?: StoreOptions): Promise<void>;
  retrieveCredential(credentialId: string, options?: AccessOptions): Promise<VerifiableCredential | null>;
  deleteKey(keyId: string): Promise<void>;
  deleteCredential(credentialId: string): Promise<void>;
  exportBackup(passphrase: string): Promise<string>; // Encrypted backup
  importBackup(data: string, passphrase: string): Promise<void>;
  rotateEncryptionKey(oldPassphrase: string, newPassphrase: string): Promise<void>;
  getAccessLog(): Promise<AccessLogEntry[]>;
}

interface StoreOptions {
  hardwareBacked?: boolean;
  requireBiometric?: boolean;
}

interface AccessOptions {
  requireBiometric?: boolean;
  mfaToken?: string;
}

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

#### Encryption and Authentication
- Use AES-256-GCM for all at-rest encryption
- Derive encryption keys from user passphrase using PBKDF2/Argon2
- Support biometric unlock if available
- Use OS/hardware secure storage APIs when possible

#### Backup, Restore, and Key Rotation
- Allow users to export encrypted backups for migration or recovery
- Support secure import/restore with passphrase
- Enable seamless key rotation with re-encryption of all data

#### Audit Logging and Secure Deletion
- Log all access to keys/credentials for auditability
- Provide secure wipe (overwrite and delete) for sensitive data

### 3. User Experience

#### Secure Access
- Prompt for passphrase or biometric on unlock
- Show access logs and recent activity
- Warn on failed access attempts

#### Backup and Recovery
- Simple encrypted backup/export workflow
- Easy restore on new device
- Key rotation UI/CLI for advanced users

#### Security and Privacy
- All sensitive data encrypted by default
- No plaintext keys/credentials ever written to disk
- User can wipe all data instantly if needed

## Consequences

### Positives
- **Security**: Strong encryption and authentication protect sensitive assets
- **User Trust**: Transparent, user-controlled security builds trust
- **Compliance**: Meets best practices and regulatory requirements
- **Resilience**: Secure backup and restore prevent data loss

### Negatives
- **Complexity**: Encryption, backup, and key rotation add development overhead
- **Usability**: Security prompts may add friction for some users
- **Hardware Support**: Not all devices support hardware-backed storage

### Trade-offs
- **Security vs Usability**: Strong security may require more user interaction
- **Hardware vs Software**: Hardware-backed storage is ideal but not always available

## Business Impact
- **Required for MVP**: Secure storage is foundational for any identity SDK
- **User Adoption**: Security and privacy are key drivers for adoption
- **Competitive Advantage**: Transparent, user-controlled security differentiates open-verifiable-id-sdk

## Mission Alignment & Principle Coverage
- **Creator First, Always**: Protects creators' assets and privacy
- **User Sovereignty**: Users control their keys and credentials
- **Proof-First Trust**: Secure storage underpins verifiable trust
- **Privacy by Design**: Encryption and audit logs by default
- **Modular & Open-Source Foundation**: Pluggable storage backends
- **Security First**: No compromise on cryptographic best practices
- **Resilience by Design**: Backup, restore, and key rotation for real-world needs 