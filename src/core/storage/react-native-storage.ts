import { EncryptedData } from './crypto.js';

// Interface for AsyncStorage to maintain type safety
interface AsyncStorageInterface {
  setItem(key: string, value: string): Promise<void>;
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<string[]>;
  multiRemove(keys: string[]): Promise<void>;
}

// Dynamic import for React Native AsyncStorage with environment detection
let AsyncStorage: AsyncStorageInterface | null = null;

async function getAsyncStorage(): Promise<AsyncStorageInterface> {
  if (!AsyncStorage) {
    // Check if we're in React Native environment
    if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
      try {
        // Use string-based import to avoid TypeScript module resolution
        const moduleName = '@react-native-async-storage/async-storage';
        const module = await import(/* webpackIgnore: true */ moduleName);
        const loadedModule = module.default || module;
        AsyncStorage = loadedModule as AsyncStorageInterface;
      } catch (error) {
        throw new Error('AsyncStorage not available in React Native environment');
      }
    } else {
      throw new Error('ReactNativeStorage can only be used in React Native environment');
    }
  }
  return AsyncStorage;
}

export class ReactNativeStorage {
  private agentId: string;

  constructor(agentId: string) {
    this.agentId = agentId;
  }

  private getKey(key: string): string {
    return `ov-id-storage-${this.agentId}-${key}`;
  }

  async store(key: string, data: EncryptedData): Promise<void> {
    try {
      const AsyncStorageModule = await getAsyncStorage();
      const fullKey = this.getKey(key);
      await AsyncStorageModule.setItem(fullKey, JSON.stringify(data));
    } catch (error) {
      throw new Error(`Failed to store data: ${error}`);
    }
  }

  async retrieve(key: string): Promise<EncryptedData | null> {
    try {
      const AsyncStorageModule = await getAsyncStorage();
      const fullKey = this.getKey(key);
      const data = await AsyncStorageModule.getItem(fullKey);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      throw new Error(`Failed to retrieve data: ${error}`);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const AsyncStorageModule = await getAsyncStorage();
      const fullKey = this.getKey(key);
      await AsyncStorageModule.removeItem(fullKey);
    } catch (error) {
      throw new Error(`Failed to delete data: ${error}`);
    }
  }

  async listKeys(): Promise<string[]> {
    try {
      const AsyncStorageModule = await getAsyncStorage();
      const allKeys = await AsyncStorageModule.getAllKeys();
      const prefix = `ov-id-storage-${this.agentId}-`;
      
      return allKeys
        .filter((key: string) => key.startsWith(prefix))
        .map((key: string) => key.substring(prefix.length));
    } catch (error) {
      throw new Error(`Failed to list keys: ${error}`);
    }
  }

  async clear(): Promise<void> {
    try {
      const AsyncStorageModule = await getAsyncStorage();
      const allKeys = await AsyncStorageModule.getAllKeys();
      const prefix = `ov-id-storage-${this.agentId}-`;
      const keysToDelete = allKeys.filter((key: string) => key.startsWith(prefix));
      
      await AsyncStorageModule.multiRemove(keysToDelete);
    } catch (error) {
      throw new Error(`Failed to clear storage: ${error}`);
    }
  }
} 