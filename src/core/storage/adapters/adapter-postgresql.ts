/**
 * PostgreSQL External Database Storage Implementation
 * Provides secure storage using PostgreSQL database
 */

import {
  SecureStorage,
  ExternalDatabaseStorage,
  ExternalDatabaseConfig,
  DatabaseTransaction,
  DatabaseHealthStatus,
  DatabaseStatistics
} from '../../../types';

export class PostgreSQLStorage implements ExternalDatabaseStorage {
  private config: ExternalDatabaseConfig;
  private client: any; // pg.Client
  private pool: any; // pg.Pool
  private isInitialized = false;

  constructor(config: ExternalDatabaseConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    try {
      // Dynamic import to avoid bundling issues
      // const { Pool } = await import('pg');
      
      // this.pool = new Pool({
      //   host: this.config.host || 'localhost',
      //   port: this.config.port || 5432,
      //   database: this.config.database,
      //   user: this.config.username,
      //   password: this.config.password,
      //   ssl: this.config.ssl ? { rejectUnauthorized: false } : false,
      //   max: this.config.connectionPool?.max || 20,
      //   min: this.config.connectionPool?.min || 2,
      //   idleTimeoutMillis: this.config.connectionPool?.idleTimeout || 30000,
      //   ...this.config.customConfig
      // });

      // Test connection and create tables
      // await this.initializeTables();
      // this.isInitialized = true;
      throw new Error('PostgreSQL adapter requires pg package to be installed');
    } catch (error) {
      throw new Error(`Failed to connect to PostgreSQL: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.isInitialized = false;
    }
  }

  async isConnected(): Promise<boolean> {
    if (!this.isInitialized || !this.pool) {
      return false;
    }

    try {
      const client = await this.pool.connect();
      client.release();
      return true;
    } catch {
      return false;
    }
  }

  async storeKey(keyId: string, encryptedKey: string, metadata?: any): Promise<void> {
    await this.ensureConnected();
    
    const query = `
      INSERT INTO ov_keys (key_id, encrypted_data, metadata, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      ON CONFLICT (key_id) 
      DO UPDATE SET 
        encrypted_data = $2,
        metadata = $3,
        updated_at = NOW()
    `;

    await this.pool.query(query, [keyId, encryptedKey, JSON.stringify(metadata || {})]);
  }

  async retrieveKey(keyId: string): Promise<string | null> {
    await this.ensureConnected();
    
    const query = 'SELECT encrypted_data FROM ov_keys WHERE key_id = $1';
    const result = await this.pool.query(query, [keyId]);
    
    return result.rows.length > 0 ? result.rows[0].encrypted_data : null;
  }

  async deleteKey(keyId: string): Promise<void> {
    await this.ensureConnected();
    
    const query = 'DELETE FROM ov_keys WHERE key_id = $1';
    await this.pool.query(query, [keyId]);
  }

  async listKeys(filter?: any): Promise<string[]> {
    await this.ensureConnected();
    
    let query = 'SELECT key_id FROM ov_keys';
    const params: any[] = [];
    
    if (filter) {
      // Add filter conditions based on metadata
      query += ' WHERE metadata @> $1';
      params.push(JSON.stringify(filter));
    }
    
    const result = await this.pool.query(query, params);
    return result.rows.map((row: any) => row.key_id);
  }

  async storeCredential(credentialId: string, encryptedCredential: string, metadata?: any): Promise<void> {
    await this.ensureConnected();
    
    const query = `
      INSERT INTO ov_credentials (credential_id, encrypted_data, metadata, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      ON CONFLICT (credential_id) 
      DO UPDATE SET 
        encrypted_data = $2,
        metadata = $3,
        updated_at = NOW()
    `;

    await this.pool.query(query, [credentialId, encryptedCredential, JSON.stringify(metadata || {})]);
  }

  async retrieveCredential(credentialId: string): Promise<string | null> {
    await this.ensureConnected();
    
    const query = 'SELECT encrypted_data FROM ov_credentials WHERE credential_id = $1';
    const result = await this.pool.query(query, [credentialId]);
    
    return result.rows.length > 0 ? result.rows[0].encrypted_data : null;
  }

  async deleteCredential(credentialId: string): Promise<void> {
    await this.ensureConnected();
    
    const query = 'DELETE FROM ov_credentials WHERE credential_id = $1';
    await this.pool.query(query, [credentialId]);
  }

  async listCredentials(filter?: any): Promise<string[]> {
    await this.ensureConnected();
    
    let query = 'SELECT credential_id FROM ov_credentials';
    const params: any[] = [];
    
    if (filter) {
      query += ' WHERE metadata @> $1';
      params.push(JSON.stringify(filter));
    }
    
    const result = await this.pool.query(query, params);
    return result.rows.map((row: any) => row.credential_id);
  }

  async storeBackup(backupId: string, encryptedBackup: string, metadata?: any): Promise<void> {
    await this.ensureConnected();
    
    const query = `
      INSERT INTO ov_backups (backup_id, encrypted_data, metadata, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      ON CONFLICT (backup_id) 
      DO UPDATE SET 
        encrypted_data = $2,
        metadata = $3,
        updated_at = NOW()
    `;

    await this.pool.query(query, [backupId, encryptedBackup, JSON.stringify(metadata || {})]);
  }

  async retrieveBackup(backupId: string): Promise<string | null> {
    await this.ensureConnected();
    
    const query = 'SELECT encrypted_data FROM ov_backups WHERE backup_id = $1';
    const result = await this.pool.query(query, [backupId]);
    
    return result.rows.length > 0 ? result.rows[0].encrypted_data : null;
  }

  async deleteBackup(backupId: string): Promise<void> {
    await this.ensureConnected();
    
    const query = 'DELETE FROM ov_backups WHERE backup_id = $1';
    await this.pool.query(query, [backupId]);
  }

  async listBackups(filter?: any): Promise<string[]> {
    await this.ensureConnected();
    
    let query = 'SELECT backup_id FROM ov_backups';
    const params: any[] = [];
    
    if (filter) {
      query += ' WHERE metadata @> $1';
      params.push(JSON.stringify(filter));
    }
    
    const result = await this.pool.query(query, params);
    return result.rows.map((row: any) => row.backup_id);
  }

  async beginTransaction(): Promise<DatabaseTransaction> {
    await this.ensureConnected();
    
    const client = await this.pool.connect();
    await client.query('BEGIN');
    
    const transaction: DatabaseTransaction = {
      id: this.generateTransactionId(),
      status: 'active',
      operations: []
    };

    // Store transaction context in client
    (client as any).transaction = transaction;
    
    return transaction;
  }

  async commitTransaction(transaction: DatabaseTransaction): Promise<void> {
    await this.ensureConnected();
    
    const client = await this.pool.connect();
    try {
      await client.query('COMMIT');
      transaction.status = 'committed';
    } finally {
      client.release();
    }
  }

  async rollbackTransaction(transaction: DatabaseTransaction): Promise<void> {
    await this.ensureConnected();
    
    const client = await this.pool.connect();
    try {
      await client.query('ROLLBACK');
      transaction.status = 'rolled-back';
    } finally {
      client.release();
    }
  }

  async healthCheck(): Promise<DatabaseHealthStatus> {
    const startTime = Date.now();
    
    try {
      const isConnected = await this.isConnected();
      const responseTime = Date.now() - startTime;
      
      return {
        isHealthy: isConnected,
        connectionStatus: isConnected ? 'connected' : 'disconnected',
        lastCheck: new Date().toISOString(),
        responseTime
      };
    } catch (error) {
      return {
        isHealthy: false,
        connectionStatus: 'error',
        lastCheck: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  async getStatistics(): Promise<DatabaseStatistics> {
    await this.ensureConnected();
    
    const queries = [
      'SELECT COUNT(*) as count FROM ov_keys',
      'SELECT COUNT(*) as count FROM ov_credentials',
      'SELECT COUNT(*) as count FROM ov_backups',
      'SELECT pg_database_size($1) as size',
      'SELECT MAX(created_at) as last_backup FROM ov_backups'
    ];

    const results = await Promise.all([
      this.pool.query(queries[0]),
      this.pool.query(queries[1]),
      this.pool.query(queries[2]),
      this.pool.query(queries[3], [this.config.database]),
      this.pool.query(queries[4])
    ]);

    return {
      totalKeys: parseInt(results[0].rows[0].count),
      totalCredentials: parseInt(results[1].rows[0].count),
      totalBackups: parseInt(results[2].rows[0].count),
      storageSize: parseInt(results[3].rows[0].size),
      lastBackup: results[4].rows[0].last_backup || 'Never',
      uptime: Date.now() // Simplified - would track actual uptime
    };
  }

  private async ensureConnected(): Promise<void> {
    if (!this.isInitialized) {
      await this.connect();
    }
  }

  private async initializeTables(): Promise<void> {
    const createTablesQuery = `
      -- Create keys table
      CREATE TABLE IF NOT EXISTS ov_keys (
        key_id VARCHAR(255) PRIMARY KEY,
        encrypted_data TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create credentials table
      CREATE TABLE IF NOT EXISTS ov_credentials (
        credential_id VARCHAR(255) PRIMARY KEY,
        encrypted_data TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create backups table
      CREATE TABLE IF NOT EXISTS ov_backups (
        backup_id VARCHAR(255) PRIMARY KEY,
        encrypted_data TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_ov_keys_metadata ON ov_keys USING GIN (metadata);
      CREATE INDEX IF NOT EXISTS idx_ov_credentials_metadata ON ov_credentials USING GIN (metadata);
      CREATE INDEX IF NOT EXISTS idx_ov_backups_metadata ON ov_backups USING GIN (metadata);
      CREATE INDEX IF NOT EXISTS idx_ov_keys_created_at ON ov_keys (created_at);
      CREATE INDEX IF NOT EXISTS idx_ov_credentials_created_at ON ov_credentials (created_at);
      CREATE INDEX IF NOT EXISTS idx_ov_backups_created_at ON ov_backups (created_at);
    `;

    await this.pool.query(createTablesQuery);
  }

  private generateTransactionId(): string {
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async getPool(): Promise<any> {
    if (!this.pool) {
      // const { Pool } = await import('pg');
      // this.pool = new Pool(this.config);
      throw new Error('PostgreSQL adapter requires pg package to be installed');
    }
    return this.pool;
  }
}

/**
 * Factory function to create PostgreSQL storage instance
 */
export function createPostgreSQLStorage(config: ExternalDatabaseConfig): ExternalDatabaseStorage {
  return new PostgreSQLStorage(config);
} 