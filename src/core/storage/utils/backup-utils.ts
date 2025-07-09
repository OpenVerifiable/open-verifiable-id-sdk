/**
 * Backup utilities for secure storage
 * Provides backup and restore functionality for agent data
 */

import { EncryptedData } from '../adapters/crypto';
import { NodeStorage } from './node-storage';
import { BrowserStorage } from '../adapters/adapter-browser';
import { ReactNativeStorage } from './react-native-storage';
import { RuntimePlatform } from '../../../types';
import { encrypt, decrypt } from '../adapters/crypto';

export interface BackupRecord {
  key: string;
  data: string;
  timestamp: string;
}

export interface BackupMetadata {
  version: string;
  created: string;
  totalRecords: number;
  checksum: string;
}

interface BackupData {
  metadata: BackupMetadata;
  records: BackupRecord[];
}

/**
 * Creates a backup of all stored data for an agent
 */
export async function createBackup(
  agentId: string,
  passphrase: string,
  platform: RuntimePlatform
): Promise<string> {
  let storage: NodeStorage | BrowserStorage | ReactNativeStorage;

  // Create appropriate storage instance based on platform
  switch (platform) {
    case RuntimePlatform.NODE:
      storage = new NodeStorage(agentId || 'default');
      break;
    case RuntimePlatform.BROWSER:
      storage = new BrowserStorage(agentId || 'default');
      break;
    case RuntimePlatform.REACT_NATIVE:
      storage = new ReactNativeStorage(agentId || 'default');
      break;
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }

  // Get all keys from storage
  const keys = await (storage as any).listKeys();

  // Export all data
  const records: BackupRecord[] = [];
  for (const key of keys) {
    const data = await (storage as any).retrieve(key);
    if (data) {
      records.push({
        key,
        data: JSON.stringify(data),
        timestamp: new Date().toISOString()
      });
    }
  }

  // Create backup metadata
  const metadata: BackupMetadata = {
    version: '1.0.0',
    created: new Date().toISOString(),
    totalRecords: records.length,
    checksum: generateChecksum(records)
  };

  const backupData: BackupData = {
    metadata,
    records
  };

  // Encrypt the backup
  const encryptedBackup = encrypt(JSON.stringify(backupData), passphrase);
  
  // Return base64 encoded backup
  return Buffer.from(JSON.stringify(encryptedBackup)).toString('base64');
}

/**
 * Restores data from a backup
 */
export async function restoreBackup(
  backupData: string,
  passphrase: string,
  targetAgentId: string,
  platform: RuntimePlatform
): Promise<void> {
  let storage: NodeStorage | BrowserStorage | ReactNativeStorage;

  // Create appropriate storage instance based on platform
  switch (platform) {
    case RuntimePlatform.NODE:
      storage = new NodeStorage(targetAgentId || 'default');
      break;
    case RuntimePlatform.BROWSER:
      storage = new BrowserStorage(targetAgentId || 'default');
      break;
    case RuntimePlatform.REACT_NATIVE:
      storage = new ReactNativeStorage(targetAgentId || 'default');
      break;
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }

  // Decode and decrypt backup
  const encryptedBackup = JSON.parse(Buffer.from(backupData, 'base64').toString());
  const decryptedBackup = decrypt(encryptedBackup, passphrase);
  const backup: BackupData = JSON.parse(decryptedBackup);

  // Validate backup
  if (!backup.metadata || !backup.records) {
    throw new Error('Invalid backup format');
  }

  if (generateChecksum(backup.records) !== backup.metadata.checksum) {
    throw new Error('Backup checksum validation failed');
  }

  // Clear existing data
  await storage.clear();

  // Restore all records
  for (const record of backup.records) {
    await (storage as any).set(record.key, JSON.parse(record.data));
  }
}

/**
 * Generates a checksum for backup validation
 */
function generateChecksum(records: BackupRecord[]): string {
  const data = records.map(r => `${r.key}:${r.data}`).join('|');
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  
  // Simple hash using crypto.subtle if available, otherwise use a simple algorithm
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    return crypto.subtle.digest('SHA-256', dataBuffer).then(hash => {
      return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }) as any;
  } else {
    // Fallback simple hash
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }
}

/**
 * Validates a backup without restoring it
 */
export async function validateBackup(
  backupData: string,
  passphrase: string
): Promise<{ isValid: boolean; metadata?: BackupMetadata; error?: string }> {
  try {
    // Decode and decrypt backup
    const encryptedBackup = JSON.parse(Buffer.from(backupData, 'base64').toString());
    const decryptedBackup = decrypt(encryptedBackup, passphrase);
    const backup: BackupData = JSON.parse(decryptedBackup);

    // Validate structure
    if (!backup.metadata || !backup.records) {
      return { isValid: false, error: 'Invalid backup format' };
    }

    // Validate checksum
    if (generateChecksum(backup.records) !== backup.metadata.checksum) {
      return { isValid: false, error: 'Backup checksum validation failed' };
    }

    return { isValid: true, metadata: backup.metadata };
  } catch (error) {
    return { isValid: false, error: (error as Error).message };
  }
} 