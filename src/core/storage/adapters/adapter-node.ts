/**
 * Node.js-specific storage implementation using node-keytar
 * Provides secure storage using the system keychain
 */

// @ts-ignore
const keytar = require('keytar');
import { mkdir, writeFile, readFile, unlink, access } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { CryptoUtils, EncryptedData, StorageRecord } from '../utils/crypto';

const APP_NAME = 'open-verifiable-id-sdk';
const STORAGE_DIR = join(homedir(), '.open-verifiable-id');

interface StorageMetadata {
  version: string;
  created: string;
  lastModified: string;
}

/**
 * Ensures the storage directory exists
 */
async function ensureStorageDir(): Promise<void> {
  try {
    await access(STORAGE_DIR);
  } catch {
    await mkdir(STORAGE_DIR, { recursive: true });
  }
}

/**
 * Gets the file path for a storage key
 */
function getFilePath(key: string): string {
  // Sanitize the key to be a valid filename
  const sanitizedKey = key.replace(/[^a-zA-Z0-9-_]/g, '_');
  return join(STORAGE_DIR, `${sanitizedKey}.enc`);
}

/**
 * Node.js storage implementation
 */
export class NodeStorage {
  private servicePrefix: string;

  constructor(agentId?: string) {
    this.servicePrefix = agentId ? `${APP_NAME}-${agentId}` : APP_NAME;
  }

  /**
   * Stores encrypted data using keytar and file system
   */
  async store(key: string, encryptedData: EncryptedData): Promise<void> {
    await ensureStorageDir();

    // Store the encryption key in the system keychain
    await keytar.setPassword(this.servicePrefix, key, encryptedData.salt);

    // Store the encrypted data and IV in a file
    const fileData = {
      data: encryptedData.data,
      iv: encryptedData.iv,
      metadata: {
        version: '1.0.0',
        created: new Date().toISOString(),
        lastModified: new Date().toISOString()
      }
    };

    await writeFile(
      getFilePath(key),
      JSON.stringify(fileData),
      'utf8'
    );
  }

  /**
   * Retrieves encrypted data using keytar and file system
   */
  async retrieve(key: string): Promise<EncryptedData | null> {
    try {
      // Get the salt from the system keychain
      const salt = await keytar.getPassword(this.servicePrefix, key);
      if (!salt) {
        return null;
      }

      // Read the encrypted data and IV from the file
      const fileContent = await readFile(getFilePath(key), 'utf8');
      const fileData = JSON.parse(fileContent);

      return {
        encrypted: true,
        algorithm: 'AES-256-GCM',
        keySize: 256,
        iterations: 100000,
        data: fileData.data,
        iv: fileData.iv,
        salt
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Deletes stored data from keytar and file system
   */
  async delete(key: string): Promise<void> {
    try {
      // Remove from system keychain
      await keytar.deletePassword(this.servicePrefix, key);

      // Remove the file
      await unlink(getFilePath(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Lists all stored keys
   */
  async listKeys(): Promise<string[]> {
    try {
      // Get all credentials for our service
      const credentials = await keytar.findCredentials(this.servicePrefix);
      return credentials.map((cred: { account: string }) => cred.account);
    } catch (error) {
      console.error('Failed to list keys:', error);
      return [];
    }
  }

  /**
   * Clears all stored data for this agent
   */
  async clear(): Promise<void> {
    const keys = await this.listKeys();
    await Promise.all(keys.map(key => this.delete(key)));
  }
} 