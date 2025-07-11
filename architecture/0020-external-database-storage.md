---
ADR: 0020
Title: External Database Storage Interface and PostgreSQL Implementation
Date: 2025-01-14
Status: Proposed
Priority: MVP
Principles: [creator_first, modular_open_source, security_first, resilience_by_design, inclusive_integration]
Related_ADRs: [0018, 0019]
BusinessImpact: >-
  - Enables enterprise-grade storage solutions for production deployments
  - Provides scalability and performance for high-volume identity operations
  - Supports compliance requirements for data storage and audit trails
  - Enables integration with existing enterprise database infrastructure
Runbook: |
  1. Configure external database: `./scripts/configure-external-db.sh {type} {config}`
  2. Test database connection: `./scripts/test-db-connection.sh {config}`
  3. Migrate from local storage: `./scripts/migrate-to-external-db.sh {agentId} {config}`
  4. Monitor database health: `./scripts/monitor-db-health.sh {config}`
  5. Backup external database: `./scripts/backup-external-db.sh {config}`
  6. Restore from backup: `./scripts/restore-external-db.sh {config} {backup}`
---

## Context

The Open Verifiable ID SDK must support external database storage to meet enterprise requirements for scalability, performance, compliance, and integration with existing infrastructure. While local storage provides simplicity and privacy, external databases enable centralized management, backup, audit trails, and multi-user scenarios. The architecture must provide a generic interface that supports multiple database types, with PostgreSQL as the initial implementation.

## Requirements

### Must
- Provide generic external database storage interface
- Support PostgreSQL as initial database implementation
- Maintain encryption and security standards
- Support transaction management and rollback
- Provide health monitoring and statistics
- Enable migration from local to external storage

### Should
- Support connection pooling and performance optimization
- Provide backup and restore capabilities
- Enable database-specific optimizations
- Support multiple database types (MongoDB, MySQL, etc.)
- Provide database schema management

### Could
- Support distributed database deployments
- Enable database federation and replication
- Provide database-specific analytics
- Support cloud database services

## Decision

### 1. Generic External Database Interface

The SDK implements a generic interface that abstracts database-specific implementations:

#### ExternalDatabaseStorage Interface
```typescript
export interface ExternalDatabaseStorage {
  // Connection management
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): Promise<boolean>;
  
  // Key operations
  storeKey(keyId: string, encryptedKey: string, metadata?: any): Promise<void>;
  retrieveKey(keyId: string): Promise<string | null>;
  deleteKey(keyId: string): Promise<void>;
  listKeys(filter?: any): Promise<string[]>;
  
  // Credential operations
  storeCredential(credentialId: string, encryptedCredential: string, metadata?: any): Promise<void>;
  retrieveCredential(credentialId: string): Promise<string | null>;
  deleteCredential(credentialId: string): Promise<void>;
  listCredentials(filter?: any): Promise<string[]>;
  
  // Backup operations
  storeBackup(backupId: string, encryptedBackup: string, metadata?: any): Promise<void>;
  retrieveBackup(backupId: string): Promise<string | null>;
  deleteBackup(backupId: string): Promise<void>;
  listBackups(filter?: any): Promise<string[]>;
  
  // Transaction support
  beginTransaction(): Promise<DatabaseTransaction>;
  commitTransaction(transaction: DatabaseTransaction): Promise<void>;
  rollbackTransaction(transaction: DatabaseTransaction): Promise<void>;
  
  // Health and monitoring
  healthCheck(): Promise<DatabaseHealthStatus>;
  getStatistics(): Promise<DatabaseStatistics>;
}
```

#### Database Configuration Interface
```typescript
export interface ExternalDatabaseConfig {
  type: 'postgresql' | 'mongodb' | 'mysql' | 'sqlite' | 'custom';
  host?: string;
  port?: number;
  database: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  connectionPool?: {
    min: number;
    max: number;
    idleTimeout: number;
  };
  customConfig?: Record<string, any>;
}
```

### 2. PostgreSQL Implementation

#### PostgreSQL Storage Class
```typescript
export class PostgreSQLStorage implements ExternalDatabaseStorage {
  private config: ExternalDatabaseConfig;
  private pool: any; // pg.Pool
  private isInitialized = false;

  constructor(config: ExternalDatabaseConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    try {
      // Dynamic import to avoid bundling issues
      const { Pool } = await import('pg');
      
      this.pool = new Pool({
        host: this.config.host || 'localhost',
        port: this.config.port || 5432,
        database: this.config.database,
        user: this.config.username,
        password: this.config.password,
        ssl: this.config.ssl ? { rejectUnauthorized: false } : false,
        max: this.config.connectionPool?.max || 20,
        min: this.config.connectionPool?.min || 2,
        idleTimeoutMillis: this.config.connectionPool?.idleTimeout || 30000,
        ...this.config.customConfig
      });

      // Initialize database schema
      await this.initializeTables();
      this.isInitialized = true;
    } catch (error) {
      throw new Error(`Failed to connect to PostgreSQL: ${error.message}`);
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
}
```

#### Database Operations Implementation
```typescript
// Key operations
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

// Transaction support
async beginTransaction(): Promise<DatabaseTransaction> {
  await this.ensureConnected();
  
  const client = await this.pool.connect();
  await client.query('BEGIN');
  
  const transaction: DatabaseTransaction = {
    id: this.generateTransactionId(),
    status: 'active',
    operations: []
  };

  (client as any).transaction = transaction;
  return transaction;
}
```

### 3. Factory Pattern for Database Creation

#### Database Factory
```typescript
export function createExternalDatabaseStorage(config: ExternalDatabaseConfig): ExternalDatabaseStorage {
  switch (config.type) {
    case 'postgresql':
      return new PostgreSQLStorage(config);
    case 'mongodb':
      throw new Error('MongoDB storage not yet implemented');
    case 'mysql':
      throw new Error('MySQL storage not yet implemented');
    case 'sqlite':
      throw new Error('SQLite storage not yet implemented');
    case 'custom':
      throw new Error('Custom storage not yet implemented');
    default:
      throw new Error(`Unsupported database type: ${config.type}`);
  }
}

// Convenience function for PostgreSQL
export function createPostgreSQLStorage(config: ExternalDatabaseConfig): ExternalDatabaseStorage {
  return new PostgreSQLStorage(config);
}
```

### 4. Integration with Secure Storage

#### Hybrid Storage Implementation
```typescript
export class HybridSecureStorage implements SecureStorage {
  private localStorage: SecureStorage;
  private externalStorage?: ExternalDatabaseStorage;
  private useExternal: boolean = false;

  constructor(
    encryptionKey?: string,
    agent?: OpenVerifiableAgent,
    externalConfig?: ExternalDatabaseConfig
  ) {
    this.localStorage = createSecureStorage(encryptionKey, agent);
    
    if (externalConfig) {
      this.externalStorage = createExternalDatabaseStorage(externalConfig);
      this.useExternal = true;
    }
  }

  async storeKey(keyId: string, privateKey: Uint8Array, options?: StoreOptions): Promise<void> {
    const encryptedKey = await this.encrypt(privateKey);
    
    if (this.useExternal && this.externalStorage) {
      await this.externalStorage.storeKey(keyId, encryptedKey, {
        agentId: this.agent?.agentId,
        agentType: this.agent?.agentType,
        ...options
      });
    } else {
      await this.localStorage.storeKey(keyId, privateKey, options);
    }
  }

  async retrieveKey(keyId: string, options?: AccessOptions): Promise<Uint8Array | null> {
    if (this.useExternal && this.externalStorage) {
      const encryptedKey = await this.externalStorage.retrieveKey(keyId);
      if (!encryptedKey) return null;
      return await this.decrypt(encryptedKey);
    } else {
      return await this.localStorage.retrieveKey(keyId, options);
    }
  }
}
```

### 5. Health Monitoring and Statistics

#### Health Check Implementation
```typescript
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
      errors: [error.message]
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
    uptime: Date.now()
  };
}
```

### 6. Migration and Backup Support

#### Migration Utilities
```typescript
export class StorageMigration {
  static async migrateToExternal(
    localStorage: SecureStorage,
    externalStorage: ExternalDatabaseStorage,
    agentId?: string
  ): Promise<void> {
    // Export all data from local storage
    const backup = await localStorage.exportBackup('migration-passphrase');
    
    // Import to external storage
    await externalStorage.storeBackup(
      `migration-${Date.now()}`,
      backup,
      { agentId, migrationType: 'local-to-external' }
    );
  }

  static async migrateFromExternal(
    externalStorage: ExternalDatabaseStorage,
    localStorage: SecureStorage,
    backupId: string
  ): Promise<void> {
    // Retrieve backup from external storage
    const backup = await externalStorage.retrieveBackup(backupId);
    if (!backup) {
      throw new Error(`Backup not found: ${backupId}`);
    }
    
    // Import to local storage
    await localStorage.importBackup(backup, 'migration-passphrase');
  }
}
```

## Consequences

### Positives
- **Scalability**: External databases support high-volume operations and growth
- **Enterprise Integration**: Enables integration with existing database infrastructure
- **Compliance**: Centralized storage supports audit and compliance requirements
- **Performance**: Connection pooling and database optimization improve performance
- **Backup and Recovery**: Database-level backup and recovery capabilities

### Negatives
- **Complexity**: External database setup and management increases complexity
- **Dependencies**: Creates dependencies on external database systems
- **Security**: Network-based storage introduces additional security considerations
- **Cost**: External databases may incur additional infrastructure costs

### Trade-offs
- **Simplicity vs Scalability**: External databases provide scalability but increase complexity
- **Privacy vs Centralization**: Centralized storage enables management but may impact privacy
- **Performance vs Reliability**: Network-based storage may impact performance but provides reliability

## Business Impact
- **Enterprise Adoption**: External database support enables enterprise deployment
- **Scalability**: Supports high-volume identity operations and growth
- **Compliance**: Meets regulatory and compliance requirements for data storage
- **Integration**: Enables integration with existing enterprise infrastructure
- **Operational Efficiency**: Centralized management improves operational efficiency

## Mission Alignment & Principle Coverage
- **Creator First, Always**: External storage enables creators to scale their identity operations
- **Modular & Open-Source Foundation**: Generic interface supports modular database implementations
- **Security First**: Maintains encryption and security standards in external storage
- **Resilience by Design**: Database-level backup and recovery improve system resilience
- **Inclusive Integration**: Supports diverse database technologies and enterprise environments 