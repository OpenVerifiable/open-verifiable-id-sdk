/**
 * Core storage types and interfaces
 * Provides type definitions for secure storage functionality
 */

import { VerifiableCredential_2_0 } from '../../types';

/**
 * Base interface for secure storage operations
 */
export interface ISecureStorage {
  // Credential operations
  getCredential(id: string): Promise<VerifiableCredential_2_0 | null>;
  storeCredential(credential: VerifiableCredential_2_0): Promise<void>;
  deleteCredential(id: string): Promise<void>;
  listCredentials(): Promise<VerifiableCredential_2_0[]>;
  
  // Key operations
  storeKey(id: string, key: Uint8Array): Promise<void>;
  getKey(id: string): Promise<Uint8Array | null>;
  deleteKey(id: string): Promise<void>;
  listKeys(): Promise<string[]>;
  
  // Backup operations
  exportBackup(passphrase: string): Promise<string>;
  importBackup(data: string, passphrase: string): Promise<void>;
  rotateEncryptionKey(oldPassphrase: string, newPassphrase: string): Promise<void>;
  
  // General operations
  clear(): Promise<void>;
  getAccessLog(): Promise<StorageAccessLog[]>;
}

/**
 * Storage access log entry
 */
export interface StorageAccessLog {
  timestamp: string;
  operation: StorageOperation;
  itemType: 'credential' | 'key' | 'backup';
  itemId: string;
  success: boolean;
  error?: string;
}

/**
 * Storage operation types
 */
export type StorageOperation = 
  | 'read'
  | 'write'
  | 'delete'
  | 'list'
  | 'clear'
  | 'backup'
  | 'restore'
  | 'rotate';

/**
 * Storage encryption configuration
 */
export interface StorageEncryptionConfig {
  algorithm: string;
  keySize: number;
  iterations: number;
  saltLength: number;
}

/**
 * Storage platform capabilities
 */
export interface StorageCapabilities {
  biometricAvailable: boolean;
  secureEnclaveAvailable: boolean;
  persistentStorage: boolean;
  encryptionSupport: boolean;
  backupSupport: boolean;
}

/**
 * Storage initialization options
 */
export interface SecureStorageOptions {
  encryptionKey?: string;
  platform?: string;
  namespace?: string;
  encryptionConfig?: Partial<StorageEncryptionConfig>;
  capabilities?: Partial<StorageCapabilities>;
}

/**
 * Storage error types
 */
export class StorageError extends Error {
  constructor(
    message: string,
    public code: StorageErrorCode,
    public operation: StorageOperation
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

/**
 * Storage error codes
 */
export enum StorageErrorCode {
  ENCRYPTION_FAILED = 'ENCRYPTION_FAILED',
  DECRYPTION_FAILED = 'DECRYPTION_FAILED',
  ITEM_NOT_FOUND = 'ITEM_NOT_FOUND',
  INVALID_DATA = 'INVALID_DATA',
  INVALID_FORMAT = 'INVALID_FORMAT',
  STORAGE_FULL = 'STORAGE_FULL',
  BACKUP_FAILED = 'BACKUP_FAILED',
  RESTORE_FAILED = 'RESTORE_FAILED',
  PLATFORM_ERROR = 'PLATFORM_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED'
} 