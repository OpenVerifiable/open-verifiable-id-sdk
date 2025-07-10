---
ADR: 0024
Title: Deterministic Device-Bound DIDs from Multiple Device Identifiers
Date: 2025-01-14
Status: Proposed
Priority: MVP
Principles: [creator_first, user_sovereignty, privacy_by_design, modular_open_source, security_first, resilience_by_design]
Related_ADRs: [0015, 0019, 0013]
BusinessImpact: >-
  - Enables device-specific identity management with multiple trust domains
  - Provides privacy through selective disclosure of device DIDs
  - Supports cross-device communication and secure pairing
  - Creates resilient identity system that survives identifier changes
Runbook: |
  1. Generate device DIDs: `./scripts/generate-device-dids.sh {deviceId} {salt}`
  2. List device DIDs: `./scripts/list-device-dids.sh {deviceId}`
  3. Export device DID: `./scripts/export-device-did.sh {deviceId} {identifierType}`
  4. Verify device DID: `./scripts/verify-device-did.sh {did} {deviceId}`
  5. Rotate device DID: `./scripts/rotate-device-did.sh {deviceId} {identifierType} {newSalt}`
---

## Context

Devices often have multiple unique identifiers (Bluetooth MAC address, hardware UUID, operating system device ID, etc.) that can be used to create deterministic, device-bound identities. For privacy, security, and compartmentalization, it is desirable to generate a unique DID (e.g., `did:key`) from each identifier. This enables selective disclosure, multiple roots of trust, and resilience to identifier changes.

Currently, the SDK supports creating DIDs through various methods (did:key, did:cheqd, etc.) but lacks a systematic approach for device-derived DIDs that are deterministically generated from hardware identifiers.

## Requirements

### Must
- Generate deterministic DIDs from device identifiers (Bluetooth MAC, hardware UUID, OS device ID)
- Support multiple DIDs per device (one per identifier)
- Never expose raw device identifiers externally
- Use cryptographic hashing to derive private keys from identifiers
- Support salt/passphrase for enhanced entropy
- Maintain mapping between identifiers and generated DIDs
- Support Ed25519 and X25519 key types for did:key generation

### Should
- Support custom identifier types beyond the standard ones
- Provide verification that a DID was generated from a specific device identifier
- Enable rotation of device DIDs when identifiers change
- Support backup and recovery of device DID mappings
- Provide audit logging for device DID operations

### Could
- Support additional key types beyond Ed25519/X25519
- Enable cross-device DID verification and trust establishment
- Provide device DID discovery and pairing protocols
- Support device DID revocation and replacement

## Decision

### 1. Device Identifier Collection and Processing

The SDK implements a systematic approach to collect, process, and derive DIDs from device identifiers:

#### Device Identifier Types
```typescript
interface DeviceIdentifier {
  type: 'bluetooth' | 'hardware' | 'os' | 'custom';
  value: string;
  salt?: string;  // Optional salt for enhanced entropy
  metadata?: {
    description?: string;
    stability?: 'high' | 'medium' | 'low';
    privacy?: 'high' | 'medium' | 'low';
  };
}
```

#### Identifier Collection Strategy
```typescript
class DeviceIdentifierCollector {
  async collectIdentifiers(): Promise<DeviceIdentifier[]> {
    const identifiers: DeviceIdentifier[] = [];
    
    // Collect Bluetooth MAC address
    const bluetoothId = await this.getBluetoothIdentifier();
    if (bluetoothId) {
      identifiers.push({
        type: 'bluetooth',
        value: bluetoothId,
        metadata: {
          description: 'Bluetooth MAC address',
          stability: 'medium',
          privacy: 'low'
        }
      });
    }
    
    // Collect hardware UUID
    const hardwareId = await this.getHardwareIdentifier();
    if (hardwareId) {
      identifiers.push({
        type: 'hardware',
        value: hardwareId,
        metadata: {
          description: 'Hardware UUID',
          stability: 'high',
          privacy: 'medium'
        }
      });
    }
    
    // Collect OS device ID
    const osId = await this.getOSIdentifier();
    if (osId) {
      identifiers.push({
        type: 'os',
        value: osId,
        metadata: {
          description: 'Operating system device ID',
          stability: 'high',
          privacy: 'medium'
        }
      });
    }
    
    return identifiers;
  }
}
```

### 2. Deterministic Key Derivation

#### Key Derivation Process
```typescript
class DeviceKeyDeriver {
  async deriveKeyFromIdentifier(
    identifier: DeviceIdentifier,
    options: {
      algorithm: 'SHA-256' | 'SHA-512';
      keyType: 'Ed25519' | 'X25519';
      iterations?: number;
    }
  ): Promise<{
    privateKey: Uint8Array;
    publicKey: Uint8Array;
    did: string;
  }> {
    // 1. Create input string: identifier.value + (salt || '')
    const input = identifier.value + (identifier.salt || '');
    
    // 2. Hash the input
    const hash = await this.hashInput(input, options.algorithm);
    
    // 3. Use hash as seed for key generation
    const keyPair = await this.generateKeyPair(hash, options.keyType);
    
    // 4. Create did:key from public key
    const did = this.createDidKey(keyPair.publicKey, options.keyType);
    
    return {
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
      did
    };
  }
  
  private async hashInput(input: string, algorithm: string): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest(algorithm, data);
    return new Uint8Array(hashBuffer);
  }
  
  private createDidKey(publicKey: Uint8Array, keyType: string): string {
    // Implementation depends on did:key specification
    const multibase = this.encodePublicKey(publicKey, keyType);
    return `did:key:${multibase}`;
  }
}
```

### 3. Device DID Management

#### Device DID Registry
```typescript
interface DeviceDIDEntry {
  identifier: DeviceIdentifier;
  privateKey: Uint8Array;
  publicKey: Uint8Array;
  did: string;
  createdAt: string;
  lastUsed: string;
  status: 'active' | 'rotated' | 'revoked';
}

class DeviceDIDManager {
  private deviceDIDs: Map<string, DeviceDIDEntry> = new Map();
  
  async generateDeviceDIDs(
    deviceId: string,
    salt?: string
  ): Promise<DeviceDIDEntry[]> {
    const collector = new DeviceIdentifierCollector();
    const deriver = new DeviceKeyDeriver();
    
    const identifiers = await collector.collectIdentifiers();
    const entries: DeviceDIDEntry[] = [];
    
    for (const identifier of identifiers) {
      // Apply global salt if provided
      if (salt) {
        identifier.salt = identifier.salt ? 
          `${identifier.salt}:${salt}` : salt;
      }
      
      const keyData = await deriver.deriveKeyFromIdentifier(identifier, {
        algorithm: 'SHA-256',
        keyType: 'Ed25519'
      });
      
      const entry: DeviceDIDEntry = {
        identifier,
        privateKey: keyData.privateKey,
        publicKey: keyData.publicKey,
        did: keyData.did,
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
        status: 'active'
      };
      
      this.deviceDIDs.set(keyData.did, entry);
      entries.push(entry);
    }
    
    return entries;
  }
  
  async getDeviceDID(identifierType: string): Promise<DeviceDIDEntry | null> {
    for (const entry of this.deviceDIDs.values()) {
      if (entry.identifier.type === identifierType && entry.status === 'active') {
        return entry;
      }
    }
    return null;
  }
  
  async listDeviceDIDs(): Promise<DeviceDIDEntry[]> {
    return Array.from(this.deviceDIDs.values())
      .filter(entry => entry.status === 'active');
  }
}
```

### 4. Security and Privacy Considerations

#### Privacy Protection
- **Never expose raw identifiers**: Only the DID and public key are shared externally
- **Selective disclosure**: Devices can choose which DID to use in different contexts
- **Identifier hashing**: Raw identifiers are hashed before key derivation
- **Salt support**: Optional salt enhances entropy and prevents rainbow table attacks

#### Security Measures
- **Cryptographic hashing**: Use SHA-256 or SHA-512 for deterministic key derivation
- **Key isolation**: Each identifier generates a separate keypair
- **Rotation support**: DIDs can be rotated when identifiers change
- **Audit logging**: All device DID operations are logged for security monitoring

#### Stability Considerations
```typescript
interface IdentifierStability {
  bluetooth: 'medium';    // MAC addresses can change
  hardware: 'high';       // Hardware UUIDs are stable
  os: 'high';            // OS device IDs are stable
  custom: 'variable';    // Depends on implementation
}
```

### 5. Cross-Device Communication

#### Device Pairing Protocol
```typescript
interface DevicePairing {
  localDeviceDID: string;
  remoteDeviceDID: string;
  sharedSecret: Uint8Array;
  pairingToken: string;
  expiresAt: string;
}

class DevicePairingManager {
  async establishPairing(
    localDID: string,
    remoteDID: string,
    method: 'bluetooth' | 'nfc' | 'qr'
  ): Promise<DevicePairing> {
    // 1. Verify both DIDs are device-derived
    const localEntry = await this.verifyDeviceDID(localDID);
    const remoteEntry = await this.verifyDeviceDID(remoteDID);
    
    // 2. Generate shared secret using ECDH
    const sharedSecret = await this.generateSharedSecret(
      localEntry.privateKey,
      remoteEntry.publicKey
    );
    
    // 3. Create pairing token
    const pairingToken = await this.createPairingToken(
      localDID,
      remoteDID,
      sharedSecret
    );
    
    return {
      localDeviceDID: localDID,
      remoteDeviceDID: remoteDID,
      sharedSecret,
      pairingToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    };
  }
}
```

## Consequences

### Positives
- **Privacy Enhancement**: Selective disclosure of device DIDs reduces correlation
- **Security Isolation**: Compartmentalization prevents single point of failure
- **Resilience**: Device identifier changes only affect corresponding DIDs
- **Flexibility**: Multiple DIDs support different use cases and trust domains
- **Deterministic**: Same device always generates the same DIDs from same identifiers

### Negatives
- **Complexity**: Multiple DIDs per device increases management complexity
- **Storage Overhead**: Need to store mappings between identifiers and DIDs
- **Identifier Dependency**: DIDs depend on availability and stability of device identifiers
- **Privacy Risks**: Some identifiers (e.g., MAC addresses) may be observable

### Trade-offs
- **Privacy vs Convenience**: More DIDs provide better privacy but increase complexity
- **Stability vs Flexibility**: Stable identifiers provide consistent DIDs but may be less private
- **Security vs Usability**: Salt/passphrase enhance security but require user input

## Business Impact
- **Device Identity**: Provides robust device identity for IoT and mobile applications
- **Cross-Device Communication**: Enables secure device-to-device communication
- **Privacy Compliance**: Supports privacy-by-design principles for device identity
- **User Experience**: Seamless device pairing and authentication
- **Security**: Multiple trust domains reduce attack surface

## Mission Alignment & Principle Coverage
- **Creator First, Always**: Enables creators to have full control over their device identities
- **User Sovereignty**: Users control which device DIDs to disclose and when
- **Privacy by Design**: Device identifiers are never exposed, only derived DIDs
- **Modular & Open-Source Foundation**: Device DID generation is modular and extensible
- **Security First**: Cryptographic derivation and salt support ensure security
- **Resilience by Design**: Multiple DIDs provide resilience to identifier changes 