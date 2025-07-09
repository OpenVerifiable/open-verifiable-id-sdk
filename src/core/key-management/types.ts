/**
 * Key Management Types
 * 
 * Comprehensive type definitions for key management operations
 * Based on ADR-0007: Agent Architecture and Extensibility
 */

import { RuntimePlatform } from '../../types';

/**
 * Supported key algorithms
 */
export enum KeyAlgorithm {
  ED25519 = 'Ed25519',
  SECP256K1 = 'secp256k1',
  RSA_2048 = 'RSA-2048',
  RSA_4096 = 'RSA-4096',
  AES_256 = 'AES-256',
  HMAC_SHA256 = 'HMAC-SHA256'
}

/**
 * Supported key formats
 */
export enum KeyFormat {
  JWK = 'jwk',
  PEM = 'pem',
  RAW = 'raw',
  BASE64 = 'base64',
  HEX = 'hex'
}

/**
 * Key usage types
 */
export enum KeyUsage {
  SIGN = 'sign',
  VERIFY = 'verify',
  ENCRYPT = 'encrypt',
  DECRYPT = 'decrypt',
  DERIVE_KEY = 'deriveKey',
  WRAP_KEY = 'wrapKey',
  UNWRAP_KEY = 'unwrapKey'
}

/**
 * Key metadata for storage and management
 */
export interface KeyMetadata {
  keyId: string;
  algorithm: KeyAlgorithm;
  created: string;
  lastUsed?: string;
  usage: KeyUsage[];
  isExtractable: boolean;
  isHardwareBacked?: boolean;
  tags?: string[];
  description?: string;
  expiresAt?: string;
}

/**
 * Key generation options
 */
export interface KeyGenerationOptions {
  algorithm: KeyAlgorithm;
  extractable?: boolean;
  usage?: KeyUsage[];
  hardwareBacked?: boolean;
  keySize?: number;
  curve?: string;
  tags?: string[];
  description?: string;
  expiresAt?: string;
}

/**
 * Key import options
 */
export interface KeyImportOptions {
  keyId?: string;
  algorithm: KeyAlgorithm;
  extractable?: boolean;
  usage?: KeyUsage[];
  tags?: string[];
  description?: string;
  expiresAt?: string;
}

/**
 * Key export options
 */
export interface KeyExportOptions {
  format: KeyFormat;
  includePrivateKey?: boolean;
  password?: string;
}

/**
 * Key signing options
 */
export interface KeySignOptions {
  algorithm?: string;
  encoding?: 'utf8' | 'base64' | 'hex';
  detached?: boolean;
}

/**
 * Key verification options
 */
export interface KeyVerifyOptions {
  algorithm?: string;
  encoding?: 'utf8' | 'base64' | 'hex';
}

/**
 * Key manager options
 */
export interface KeyManagerOptions {
  platform?: RuntimePlatform;
  storage?: any;
  defaultAlgorithm?: KeyAlgorithm;
  hardwareBacked?: boolean;
  requireBiometric?: boolean;
  keyRotationPolicy?: {
    enabled: boolean;
    maxAge?: number; // in days
    autoRotate?: boolean;
  };
  encryption?: {
    enabled: boolean;
    algorithm?: string;
    keyDerivation?: 'pbkdf2' | 'scrypt' | 'argon2';
  };
}

/**
 * Key pair result
 */
export interface KeyPair {
  publicKey: string;
  privateKey: string;
  keyId: string;
  algorithm: KeyAlgorithm;
  metadata: KeyMetadata;
}

/**
 * Key generation result
 */
export interface KeyGenerationResult {
  keyId: string;
  publicKey?: string;
  algorithm: KeyAlgorithm;
  metadata: KeyMetadata;
}

/**
 * Key import result
 */
export interface KeyImportResult {
  keyId: string;
  algorithm: KeyAlgorithm;
  metadata: KeyMetadata;
  imported: boolean;
}

/**
 * Key export result
 */
export interface KeyExportResult {
  keyId: string;
  format: KeyFormat;
  data: string;
  metadata?: KeyMetadata;
}

/**
 * Signing result
 */
export interface SigningResult {
  keyId: string;
  signature: Uint8Array;
  algorithm: string;
  timestamp: string;
}

/**
 * Verification result
 */
export interface VerificationResult {
  keyId: string;
  isValid: boolean;
  algorithm: string;
  timestamp: string;
  error?: string;
}

/**
 * Key statistics
 */
export interface KeyStatistics {
  totalKeys: number;
  byAlgorithm: Record<KeyAlgorithm, number>;
  byUsage: Record<KeyUsage, number>;
  hardwareBacked: number;
  expired: number;
  lastRotation?: string;
}

/**
 * Key rotation result
 */
export interface KeyRotationResult {
  oldKeyId: string;
  newKeyId: string;
  rotated: boolean;
  timestamp: string;
  error?: string;
}

/**
 * Key backup data
 */
export interface KeyBackupData {
  version: string;
  timestamp: string;
  keys: {
    keyId: string;
    algorithm: KeyAlgorithm;
    encryptedData: string;
    metadata: KeyMetadata;
  }[];
  metadata: {
    totalKeys: number;
    backupId: string;
    checksum: string;
  };
}

/**
 * Platform-specific key manager interface
 */
export interface PlatformKeyManager {
  platform: RuntimePlatform;
  isSupported(): boolean;
  generateKey(options: KeyGenerationOptions): Promise<KeyGenerationResult>;
  importKey(keyData: string, options: KeyImportOptions): Promise<KeyImportResult>;
  exportKey(keyId: string, options: KeyExportOptions): Promise<KeyExportResult>;
  deleteKey(keyId: string): Promise<void>;
  sign(keyId: string, data: Uint8Array, options?: KeySignOptions): Promise<SigningResult>;
  verify(keyId: string, data: Uint8Array, signature: Uint8Array, options?: KeyVerifyOptions): Promise<VerificationResult>;
  listKeys(): Promise<KeyMetadata[]>;
  getKeyMetadata(keyId: string): Promise<KeyMetadata | null>;
  updateKeyMetadata(keyId: string, metadata: Partial<KeyMetadata>): Promise<void>;
} 