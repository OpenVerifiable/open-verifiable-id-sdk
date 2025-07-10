/**
 * Device-Specific DID Management Types
 * 
 * Defines types for creating and managing DIDs based on device identifiers
 * such as Bluetooth MAC addresses, hardware IDs, and platform-specific identifiers.
 */

import { RuntimePlatform } from '../../types';
import { KeyAlgorithm } from '../key-management/types';

/**
 * Device identifier types
 */
export interface DeviceIdentifier {
  /** Bluetooth MAC address (format: AA:BB:CC:DD:EE:FF) */
  bluetoothId?: string;
  
  /** Platform-specific device ID */
  deviceId?: string;
  
  /** Hardware-specific identifier */
  hardwareId?: string;
  
  /** Platform identifier */
  platformId?: string;
  
  /** When the identifier was collected */
  timestamp: string;
  
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Device capabilities
 */
export interface DeviceCapabilities {
  /** Bluetooth support */
  bluetooth: boolean;
  
  /** NFC support */
  nfc: boolean;
  
  /** Hardware security module */
  hsm: boolean;
  
  /** Biometric authentication */
  biometric: boolean;
  
  /** Secure storage */
  secureStorage: boolean;
  
  /** Network connectivity */
  network: boolean;
}

/**
 * Device metadata
 */
export interface DeviceMetadata {
  /** Device manufacturer */
  manufacturer?: string;
  
  /** Device model */
  model?: string;
  
  /** Operating system */
  os?: string;
  
  /** OS version */
  osVersion?: string;
  
  /** SDK version */
  sdkVersion?: string;
  
  /** Device name */
  name?: string;
}

/**
 * Complete device information
 */
export interface DeviceInfo {
  /** Runtime platform */
  platform: RuntimePlatform;
  
  /** Device identifiers */
  identifiers: DeviceIdentifier;
  
  /** Device capabilities */
  capabilities: DeviceCapabilities;
  
  /** Device metadata */
  metadata: DeviceMetadata;
  
  /** Device-specific DID */
  did?: string;
}

/**
 * Device DID creation options
 */
export interface DeviceDIDOptions {
  /** DID method to use */
  method: 'device' | 'bluetooth' | 'hardware' | 'composite';
  
  /** Device information */
  deviceInfo: DeviceInfo;
  
  /** Key algorithm for the DID */
  keyAlgorithm?: KeyAlgorithm;
  
  /** Include device metadata in DID document */
  includeDeviceMetadata?: boolean;
  
  /** Encryption key for sensitive data */
  encryptionKey?: string;
  
  /** Custom DID namespace */
  namespace?: string;
}

/**
 * Device DID creation result
 */
export interface DeviceDIDResult {
  /** The created DID */
  did: string;
  
  /** DID document */
  document: any;
  
  /** Associated key ID */
  keyId: string;
  
  /** Device information used */
  deviceInfo: DeviceInfo;
  
  /** Creation timestamp */
  createdAt: string;
}

/**
 * Device discovery options
 */
export interface DeviceDiscoveryOptions {
  /** Scan timeout in milliseconds */
  scanTimeout: number;
  
  /** Specific device DIDs to look for */
  filterDevices?: string[];
  
  /** Require authentication during discovery */
  requireAuthentication?: boolean;
  
  /** Discovery mode */
  mode: 'active' | 'passive' | 'both';
  
  /** Maximum number of devices to discover */
  maxDevices?: number;
}

/**
 * Discovered device information
 */
export interface DiscoveredDevice {
  /** Device DID */
  did: string;
  
  /** Device information */
  deviceInfo: DeviceInfo;
  
  /** Signal strength (if applicable) */
  signalStrength?: number;
  
  /** Discovery timestamp */
  discoveredAt: string;
  
  /** Authentication status */
  authenticated: boolean;
}

/**
 * Device pairing options
 */
export interface DevicePairingOptions {
  /** Local device DID */
  localDeviceDID: string;
  
  /** Remote device DID */
  remoteDeviceDID: string;
  
  /** Pairing method */
  method: 'bluetooth' | 'nfc' | 'qr' | 'manual';
  
  /** Authentication required */
  requireAuth: boolean;
  
  /** Pairing timeout */
  timeout: number;
}

/**
 * Device pairing result
 */
export interface DevicePairingResult {
  /** Local device information */
  localDevice: DeviceInfo;
  
  /** Remote device information */
  remoteDevice: DeviceInfo;
  
  /** Shared secret for encryption */
  sharedSecret: Uint8Array;
  
  /** Pairing token */
  pairingToken: string;
  
  /** When the pairing expires */
  expiresAt: string;
  
  /** Pairing status */
  status: 'paired' | 'pending' | 'failed';
}

/**
 * Device communication message
 */
export interface DeviceMessage {
  /** Message ID */
  id: string;
  
  /** Sender device DID */
  from: string;
  
  /** Recipient device DID */
  to: string;
  
  /** Message type */
  type: 'key-exchange' | 'credential-share' | 'sync-request' | 'sync-response' | 'custom';
  
  /** Message payload */
  payload: any;
  
  /** Message timestamp */
  timestamp: string;
  
  /** Message signature */
  signature?: string;
  
  /** Encryption metadata */
  encryption?: {
    algorithm: string;
    keyId: string;
    iv?: string;
  };
}

/**
 * Device communication channel
 */
export interface DeviceCommunicationChannel {
  /** Local device DID */
  localDID: string;
  
  /** Remote device DID */
  remoteDID: string;
  
  /** Encryption key for the channel */
  encryptionKey: Uint8Array;
  
  /** Session ID */
  sessionId: string;
  
  /** Channel status */
  status: 'open' | 'closed' | 'error';
  
  /** Send a message */
  sendMessage(message: DeviceMessage): Promise<void>;
  
  /** Receive a message */
  receiveMessage(): Promise<DeviceMessage>;
  
  /** Close the channel */
  close(): Promise<void>;
}

/**
 * Device key mapping
 */
export interface DeviceKeyMapping {
  /** Device DID */
  deviceDID: string;
  
  /** Key ID */
  keyId: string;
  
  /** Key type */
  keyType: 'master' | 'session' | 'backup' | 'recovery';
  
  /** Key permissions */
  permissions: {
    sign: boolean;
    encrypt: boolean;
    decrypt: boolean;
    export: boolean;
    rotate: boolean;
  };
  
  /** When the mapping was created */
  createdAt: string;
  
  /** When the key was last used */
  lastUsed: string;
  
  /** Key metadata */
  metadata?: Record<string, any>;
}

/**
 * Cross-device key synchronization options
 */
export interface KeySyncOptions {
  /** Source device DID */
  sourceDevice: string;
  
  /** Target device DID */
  targetDevice: string;
  
  /** Key IDs to synchronize */
  keyIds: string[];
  
  /** Encryption method */
  encryptionMethod: 'shared-secret' | 'public-key' | 'derived';
  
  /** Synchronization mode */
  syncMode: 'full' | 'incremental' | 'selective';
  
  /** Sync timeout */
  timeout: number;
  
  /** Verify keys after sync */
  verifyAfterSync: boolean;
}

/**
 * Key synchronization result
 */
export interface KeySyncResult {
  /** Synchronized key IDs */
  synchronizedKeys: string[];
  
  /** Failed key IDs */
  failedKeys: string[];
  
  /** Sync timestamp */
  syncedAt: string;
  
  /** Sync status */
  status: 'success' | 'partial' | 'failed';
  
  /** Error details */
  errors?: string[];
}

/**
 * Device registry entry
 */
export interface DeviceRegistryEntry {
  /** Device DID */
  did: string;
  
  /** Device information */
  deviceInfo: DeviceInfo;
  
  /** Registration timestamp */
  registeredAt: string;
  
  /** Last seen timestamp */
  lastSeen: string;
  
  /** Device status */
  status: 'active' | 'inactive' | 'blocked';
  
  /** Associated keys */
  associatedKeys: string[];
  
  /** Trust level */
  trustLevel: 'trusted' | 'verified' | 'unknown' | 'blocked';
} 