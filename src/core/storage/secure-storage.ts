import { SecureStorage, VerifiableCredential_2_0, AccessLogEntry } from '../../types';
import crypto from 'crypto';

function toBase64(u8: Uint8Array): string {
  return Buffer.from(u8).toString('base64');
}
function fromBase64(str: string): Uint8Array {
  return new Uint8Array(Buffer.from(str, 'base64'));
}

export class SecureStorageImpl implements SecureStorage {
  private encryptionKey: Buffer;
  private credentials: Map<string, string>; // encrypted base64
  private keys: Map<string, string>; // encrypted base64
  private accessLog: AccessLogEntry[] = [];

  constructor(passphrase: string) {
    // derive a 32-byte key deterministically from passphrase for demo
    this.encryptionKey = crypto.createHash('sha256').update(passphrase).digest();
    this.credentials = new Map();
    this.keys = new Map();
  }

  private log(operation: AccessLogEntry['operation'], id: string) {
    this.accessLog.push({
      timestamp: new Date().toISOString(),
      operation,
      keyOrCredentialId: id,
      user: 'local',
      method: 'password',
      success: true,
    });
  }

  private encrypt(data: Uint8Array): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(Buffer.from(data)), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString('base64');
  }
  private decrypt(b64: string): Uint8Array {
    const buf = Buffer.from(b64, 'base64');
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const data = buf.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return new Uint8Array(decrypted);
  }

  async storeKey(keyId: string, key: Uint8Array): Promise<void> {
    this.keys.set(keyId, this.encrypt(key));
    this.log('store', keyId);
  }
  async retrieveKey(keyId: string): Promise<Uint8Array | null> {
    const enc = this.keys.get(keyId);
    this.log('retrieve', keyId);
    return enc ? this.decrypt(enc) : null;
  }
  async deleteKey(keyId: string): Promise<void> {
    this.keys.delete(keyId);
    this.log('delete', keyId);
  }
  async listKeys(): Promise<string[]> {
    return Array.from(this.keys.keys());
  }

  async storeCredential(credentialId: string, credential: VerifiableCredential_2_0): Promise<void> {
    const json = JSON.stringify(credential);
    this.credentials.set(credentialId, this.encrypt(new TextEncoder().encode(json)));
    this.log('store', credentialId);
  }
  async retrieveCredential(credentialId: string): Promise<VerifiableCredential_2_0 | null> {
    const enc = this.credentials.get(credentialId);
    this.log('retrieve', credentialId);
    if (!enc) return null;
    const json = new TextDecoder().decode(this.decrypt(enc));
    return JSON.parse(json);
  }
  async deleteCredential(credentialId: string): Promise<void> {
    this.credentials.delete(credentialId);
    this.log('delete', credentialId);
  }
  async listCredentials(): Promise<VerifiableCredential_2_0[]> {
    const res: VerifiableCredential_2_0[] = [];
    for (const enc of this.credentials.values()) {
      const json = new TextDecoder().decode(this.decrypt(enc));
      res.push(JSON.parse(json));
    }
    return res;
  }

  async exportKey(keyId: string, format: 'base64' | 'hex'): Promise<string> {
    const key = await this.retrieveKey(keyId);
    if (!key) throw new Error('Key not found');
    return format === 'hex' ? Buffer.from(key).toString('hex') : toBase64(key);
  }
  async importKey(keyId: string, key: string, format: 'base64' | 'hex'): Promise<void> {
    const u8 = format === 'hex' ? new Uint8Array(Buffer.from(key, 'hex')) : fromBase64(key);
    await this.storeKey(keyId, u8);
  }
  async exportRecoveryPhrase(_keyId: string, _format: 'base64' | 'hex'): Promise<string> {
    // For demo purposes, return dummy phrase
    return 'dummy recovery phrase';
  }
  async importRecoveryPhrase(_keyId: string, _phrase: string, _format: 'base64' | 'hex'): Promise<void> {
    // no-op for demo
  }

  async exportBackup(passphrase: string): Promise<string> {
    const snapshot = {
      keys: Array.from(this.keys.entries()),
      credentials: Array.from(this.credentials.entries()),
    };
    const json = Buffer.from(JSON.stringify(snapshot));
    // simple xor with passphrase bytes
    const pass = Buffer.from(passphrase);
    const enc = json.map((b, i) => b ^ pass[i % pass.length]);
    return toBase64(new Uint8Array(enc));
  }
  async importBackup(data: string, passphrase: string): Promise<void> {
    const buf = fromBase64(data);
    const pass = Buffer.from(passphrase);
    const dec = buf.map((b, i) => b ^ pass[i % pass.length]);
    const snapshot = JSON.parse(Buffer.from(dec).toString());
    this.keys = new Map(snapshot.keys);
    this.credentials = new Map(snapshot.credentials);
  }
  async rotateEncryptionKey(_oldPass: string, newPass: string): Promise<void> {
    this.encryptionKey = crypto.createHash('sha256').update(newPass).digest();
  }

  async getAccessLog(): Promise<AccessLogEntry[]> {
    return this.accessLog;
  }
  async clear(): Promise<void> {
    this.keys.clear();
    this.credentials.clear();
    this.log('delete', 'all');
  }
} 