export interface EncryptedData {
  data: string;
  iv: string;
  salt: string;
}

export class BrowserStorage {
  private dbName: string;
  private db: IDBDatabase | null = null;

  constructor(agentId: string) {
    this.dbName = `ov-id-storage-${agentId}`;
  }

  private async openDatabase(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(new Error('Failed to open database'));
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('storage')) {
          db.createObjectStore('storage', { keyPath: 'key' });
        }
      };
    });
  }

  async store(key: string, data: EncryptedData): Promise<void> {
    const db = await this.openDatabase();
    const transaction = db.transaction(['storage'], 'readwrite');
    const store = transaction.objectStore('storage');
    
    return new Promise((resolve, reject) => {
      const request = store.put({ key, ...data });
      request.onerror = () => reject(new Error('Failed to store data'));
      request.onsuccess = () => resolve();
    });
  }

  async retrieve(key: string): Promise<EncryptedData | null> {
    const db = await this.openDatabase();
    const transaction = db.transaction(['storage'], 'readonly');
    const store = transaction.objectStore('storage');
    
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onerror = () => reject(new Error('Failed to retrieve data'));
      request.onsuccess = () => {
        if (request.result) {
          const { key: _, ...data } = request.result;
          resolve(data as EncryptedData);
        } else {
          resolve(null);
        }
      };
    });
  }

  async delete(key: string): Promise<void> {
    const db = await this.openDatabase();
    const transaction = db.transaction(['storage'], 'readwrite');
    const store = transaction.objectStore('storage');
    
    return new Promise((resolve, reject) => {
      const request = store.delete(key);
      request.onerror = () => reject(new Error('Failed to delete data'));
      request.onsuccess = () => resolve();
    });
  }

  async listKeys(): Promise<string[]> {
    const db = await this.openDatabase();
    const transaction = db.transaction(['storage'], 'readonly');
    const store = transaction.objectStore('storage');
    
    return new Promise((resolve, reject) => {
      const request = store.getAllKeys();
      request.onerror = () => reject(new Error('Failed to list keys'));
      request.onsuccess = () => resolve(request.result as string[]);
    });
  }

  async clear(): Promise<void> {
    const db = await this.openDatabase();
    const transaction = db.transaction(['storage'], 'readwrite');
    const store = transaction.objectStore('storage');
    
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onerror = () => reject(new Error('Failed to clear storage'));
      request.onsuccess = () => resolve();
    });
  }

  async deleteDatabase(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(this.dbName);
      request.onerror = () => reject(new Error('Failed to delete database'));
      request.onsuccess = () => resolve();
    });
  }
} 