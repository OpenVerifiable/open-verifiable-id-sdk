/**
 * Storage utility types
 */

export enum StorageErrorCode {
  ENCRYPTION_FAILED = 'ENCRYPTION_FAILED',
  DECRYPTION_FAILED = 'DECRYPTION_FAILED',
  KEY_DERIVATION_FAILED = 'KEY_DERIVATION_FAILED',
  INVALID_PASSPHRASE = 'INVALID_PASSPHRASE',
  STORAGE_ACCESS_DENIED = 'STORAGE_ACCESS_DENIED',
  STORAGE_QUOTA_EXCEEDED = 'STORAGE_QUOTA_EXCEEDED',
  STORAGE_NOT_AVAILABLE = 'STORAGE_NOT_AVAILABLE',
  INVALID_DATA_FORMAT = 'INVALID_DATA_FORMAT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export type StorageOperation = 'read' | 'write' | 'delete' | 'list' | 'clear';

export class StorageError extends Error {
  constructor(
    message: string,
    public code: StorageErrorCode,
    public operation: StorageOperation,
    public cause?: Error
  ) {
    super(message);
    this.name = 'StorageError';
  }
} 