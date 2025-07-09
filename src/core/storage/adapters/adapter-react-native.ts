/**
 * React Native-specific storage implementation using react-native-keychain
 * Provides secure storage using the platform's keychain/keystore
 */

import * as Keychain from 'react-native-keychain';
import { CryptoUtils, EncryptedData, StorageRecord } from '../utils/crypto';

const SERVICE_NAME = 'open-verifiable-id-sdk';

interface StorageMetadata {
  version: string;
  created: string;
  lastModified: string;
}

/**
 * React Native storage implementation using Keychain/Keystore
 */
export class ReactNativeStorage {
  private serviceName: string;

  constructor(agentId?: string) {
    this.serviceName = agentId ? `${SERVICE_NAME}-${agentId}` : SERVICE_NAME;
  }

  /**
   * Stores encrypted data in the keychain
   */
  async store(key: string, encryptedData: EncryptedData): Promise<void> {
    const record: StorageRecord = {
      key: key,
      data: encryptedData.data,
      iv: encryptedData.iv,
      salt: encryptedData.salt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        version: '1.0.0',
        created: new Date().toISOString(),
        lastModified: new Date().toISOString()
      }
    };

    await Keychain.setGenericPassword(
      key,
      JSON.stringify(record),
      {
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
        service: this.serviceName
      }
    );
  }

  /**
   * Retrieves encrypted data from the keychain
   */
  async retrieve(key: string): Promise<EncryptedData | null> {
    try {
      const result = await Keychain.getGenericPassword({
        service: this.serviceName
      });

      if (!result) {
        return null;
      }

      const record = JSON.parse(result.password) as StorageRecord;
      return {
        encrypted: true,
        algorithm: 'AES-256-GCM',
        keySize: 256,
        iterations: 100000,
        data: record.data,
        iv: record.iv,
        salt: record.salt
      };
    } catch (error) {
      console.error('Failed to retrieve from keychain:', error);
      return null;
    }
  }

  /**
   * Deletes data from the keychain
   */
  async delete(key: string): Promise<void> {
    await Keychain.resetGenericPassword({
      service: `${this.serviceName}-${key}`
    });
  }

  /**
   * Lists all stored keys
   * Note: react-native-keychain doesn't provide a direct way to list keys
   * This is a limitation of the underlying keychain/keystore APIs
   */
  async listKeys(): Promise<string[]> {
    // Unfortunately, we can't list keys from the keychain
    // We'll need to maintain a separate list of keys in AsyncStorage
    // This is a limitation of the platform
    return [];
  }

  /**
   * Clears all stored data
   */
  async clear(): Promise<void> {
    await Keychain.resetGenericPassword({
      service: this.serviceName
    });
  }

  /**
   * Checks if biometric authentication is available
   */
  async isBiometricAvailable(): Promise<boolean> {
    try {
      const result = await Keychain.getSupportedBiometryType();
      return result !== null;
    } catch (error) {
      console.error('Failed to check biometric availability:', error);
      return false;
    }
  }

  /**
   * Stores data with biometric protection
   */
  async storeWithBiometric(key: string, encryptedData: EncryptedData): Promise<void> {
    const record: StorageRecord = {
      key: key,
      data: encryptedData.data,
      iv: encryptedData.iv,
      salt: encryptedData.salt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        version: '1.0.0',
        created: new Date().toISOString(),
        lastModified: new Date().toISOString()
      }
    };

    await Keychain.setGenericPassword(
      key,
      JSON.stringify(record),
      {
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
        service: `${this.serviceName}-biometric`
      }
    );
  }

  /**
   * Retrieves data with biometric authentication
   */
  async retrieveWithBiometric(key: string): Promise<EncryptedData | null> {
    try {
      const result = await Keychain.getGenericPassword({
        service: `${this.serviceName}-biometric`,
        authenticationPrompt: {
          title: 'Authentication Required',
          subtitle: 'Please authenticate to access your data',
          description: 'The app needs to verify your identity',
          cancel: 'Cancel'
        }
      });

      if (!result) {
        return null;
      }

      const record = JSON.parse(result.password) as StorageRecord;
      return {
        encrypted: true,
        algorithm: 'AES-256-GCM',
        keySize: 256,
        iterations: 100000,
        data: record.data,
        iv: record.iv,
        salt: record.salt
      };
    } catch (error) {
      console.error('Failed to retrieve with biometric:', error);
      return null;
    }
  }
} 