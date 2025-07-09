# Agent Configuration System

The Agent Configuration System provides comprehensive management of agent configurations, including validation, storage, and lifecycle management. This system implements ADR-0007: Agent Architecture and Extensibility.

## Overview

The agent configuration system consists of several key components:

- **AgentConfigurationManager**: Core configuration management with validation and storage
- **AgentConfigurationClient**: High-level client interface for easy configuration management
- **Configuration Types**: TypeScript interfaces for all configuration objects
- **Templates**: Pre-built configuration templates for common use cases

## Quick Start

### Basic Usage

```typescript
import { createQuickUserAgent, createSecureUserAgent } from '@/core/agents';

// Create a basic user agent
const userAgent = await createQuickUserAgent('john-doe');

// Create a secure user agent with biometric authentication
const secureAgent = await createSecureUserAgent('jane-smith');
```

### Advanced Configuration

```typescript
import { AgentConfigurationClient, AgentType } from '@/core/agents';

const configClient = new AgentConfigurationClient({
  autoInitialize: true,
  validateOnCreate: true
});

// Create a custom agent with specific configuration
const customAgent = await configClient.createAgent(
  'custom-user',
  AgentType.USER,
  {
    security: {
      encryptionLevel: 'high',
      requireBiometric: true,
      keyStorageType: 'keychain',
      sandboxMode: true
    },
    features: {
      trustRegistry: true,
      schemaRegistry: true,
      carbonAwareness: true,
      biometricAuth: true,
      offlineCache: true
    },
    endpoints: {
      schemaRegistry: 'https://schema.openverifiable.org',
      trustRegistry: 'https://trust.openverifiable.org'
    }
  }
);
```

## Configuration Schema

The agent configuration follows a strict schema defined in `agent-configuration.schema.json`:

### Required Fields

- `agentId`: Unique identifier for the agent instance
- `agentType`: Type of agent (user, package, parent, service)

### Security Configuration

```typescript
interface AgentSecurityConfig {
  encryptionLevel?: 'standard' | 'high';
  requireBiometric?: boolean;
  keyStorageType?: 'file' | 'keychain' | 'hardware';
  sandboxMode?: boolean;
}
```

### Feature Configuration

```typescript
interface AgentFeaturesConfig {
  trustRegistry?: boolean;
  schemaRegistry?: boolean;
  carbonAwareness?: boolean;
  biometricAuth?: boolean;
  offlineCache?: boolean;
}
```

### Plugin Configuration

```typescript
interface AgentPluginConfig {
  name: string;
  version: string;
  type: 'did-method' | 'credential-type' | 'crypto-suite' | 'utility';
  config?: Record<string, any>;
  enabled?: boolean;
}
```

## Available Templates

### Basic User Template

```typescript
{
  name: 'basic-user',
  description: 'Basic user agent with essential features',
  config: {
    agentType: AgentType.USER,
    security: {
      encryptionLevel: 'standard',
      requireBiometric: false,
      keyStorageType: 'file',
      sandboxMode: false
    },
    features: {
      trustRegistry: true,
      schemaRegistry: true,
      carbonAwareness: false,
      biometricAuth: false,
      offlineCache: true
    }
  }
}
```

### Secure User Template

```typescript
{
  name: 'secure-user',
  description: 'High-security user agent with biometric authentication',
  config: {
    agentType: AgentType.USER,
    security: {
      encryptionLevel: 'high',
      requireBiometric: true,
      keyStorageType: 'keychain',
      sandboxMode: true
    },
    features: {
      trustRegistry: true,
      schemaRegistry: true,
      carbonAwareness: true,
      biometricAuth: true,
      offlineCache: true
    }
  }
}
```

### Service Agent Template

```typescript
{
  name: 'service-agent',
  description: 'Service agent for credential issuance',
  config: {
    agentType: AgentType.SERVICE,
    security: {
      encryptionLevel: 'high',
      requireBiometric: false,
      keyStorageType: 'hardware',
      sandboxMode: true
    },
    features: {
      trustRegistry: true,
      schemaRegistry: true,
      carbonAwareness: true,
      biometricAuth: false,
      offlineCache: false
    }
  }
}
```

## Configuration Management

### Creating Configurations

```typescript
// Create from template
const config = await configManager.createFromTemplate(
  'secure-user',
  'my-user'
);

// Create with custom configuration
const config = await configManager.createConfiguration(
  'custom-user',
  AgentType.USER,
  {
    security: { encryptionLevel: 'high' },
    features: { carbonAwareness: true }
  }
);
```

### Validation

```typescript
const result = await configManager.validateConfiguration(config);
if (result.isValid) {
  console.log('Configuration is valid');
} else {
  console.log('Validation errors:', result.errors);
  console.log('Warnings:', result.warnings);
  console.log('Suggestions:', result.suggestions);
}
```

### Import/Export

```typescript
// Export configurations
const exportData = await configManager.exportConfigurations();

// Import configurations
const result = await configManager.importConfigurations(exportData);
console.log(`Migrated: ${result.migrated}, Failed: ${result.failed}`);
```

### Statistics

```typescript
const stats = configManager.getStatistics();
console.log(`Total: ${stats.total}`);
console.log(`User agents: ${stats.byType[AgentType.USER]}`);
console.log(`High security: ${stats.bySecurityLevel.high}`);
```

## Configuration Client

The `AgentConfigurationClient` provides a high-level interface for managing agent configurations:

### Quick Agent Creation

```typescript
// Quick user agent
const userAgent = await configClient.createQuickUserAgent('user-id');

// Secure user agent
const secureAgent = await configClient.createSecureUserAgent('user-id');

// Service agent
const serviceAgent = await configClient.createServiceAgent('service-id');
```

### Configuration Recommendations

```typescript
// Get recommendations for personal use
const personalRecs = configClient.getConfigurationRecommendations('personal');

// Get recommendations for service use
const serviceRecs = configClient.getConfigurationRecommendations('service');
```

### Configuration Cloning

```typescript
const clonedConfig = await configClient.cloneAgentConfiguration(
  'source-agent',
  'new-agent',
  {
    security: { encryptionLevel: 'high' }
  }
);
```

## Validation Rules

The configuration system validates:

1. **Schema Compliance**: All configurations must conform to the JSON schema
2. **Plugin Validation**: Plugin versions must follow semver format
3. **Duplicate Detection**: No duplicate plugin names allowed
4. **Feature Dependencies**: Warns about missing endpoints for enabled features
5. **Security Consistency**: Validates security configuration consistency

## Storage Options

The configuration manager supports multiple storage backends:

- **Memory**: In-memory storage (default for testing)
- **File**: JSON file storage in `.agent-configs/` directory
- **Database**: External database storage (future)

## Error Handling

The system provides comprehensive error handling:

```typescript
try {
  const agent = await configClient.createAgent('test', AgentType.USER);
} catch (error) {
  if (error.message.includes('Invalid agent configuration')) {
    // Handle validation errors
  } else if (error.message.includes('Configuration not found')) {
    // Handle missing configuration
  }
}
```

## Testing

Run the configuration tests:

```bash
npm test -- --testPathPattern=configuration.test.ts
```

## Examples

See the comprehensive examples in `examples/configuration-examples.ts`:

```typescript
import { runAllExamples } from '@/core/agents/examples/configuration-examples';

// Run all examples
await runAllExamples();

// Or run individual examples
import { basicUserAgentExample } from '@/core/agents/examples/configuration-examples';
await basicUserAgentExample();
```

## API Reference

### AgentConfigurationManager

- `createConfiguration(agentId, agentType, config?)`: Create new configuration
- `getConfiguration(agentId)`: Get configuration by ID
- `updateConfiguration(agentId, updates)`: Update existing configuration
- `deleteConfiguration(agentId)`: Delete configuration
- `listConfigurations()`: List all configurations
- `validateConfiguration(config)`: Validate configuration
- `createFromTemplate(templateName, agentId, overrides?)`: Create from template
- `exportConfigurations(agentIds?)`: Export configurations
- `importConfigurations(exportData)`: Import configurations
- `getStatistics()`: Get configuration statistics

### AgentConfigurationClient

- `createAgent(agentId, agentType, config?)`: Create agent with configuration
- `createAgentFromTemplate(templateName, agentId, overrides?)`: Create from template
- `createQuickUserAgent(userId)`: Create basic user agent
- `createSecureUserAgent(userId)`: Create secure user agent
- `createServiceAgent(serviceId)`: Create service agent
- `getConfigurationRecommendations(useCase)`: Get recommendations
- `cloneAgentConfiguration(sourceId, newId, overrides?)`: Clone configuration

## Migration Guide

### From Legacy Agent Creation

**Before:**
```typescript
const agent = new UserAgent({ userId: 'john' });
```

**After:**
```typescript
const agent = await createQuickUserAgent('john');
```

### From Manual Configuration

**Before:**
```typescript
const config = {
  userId: 'john',
  encryptionKey: 'secret',
  biometricEnabled: true
};
const agent = new UserAgent(config);
```

**After:**
```typescript
const agent = await configClient.createAgent('john', AgentType.USER, {
  security: {
    encryptionLevel: 'high',
    requireBiometric: true
  }
});
```

## Contributing

When adding new configuration options:

1. Update the JSON schema in `architecture/schemas/agent-configuration.schema.json`
2. Update the TypeScript interfaces in `types.ts`
3. Add validation rules in `configuration-manager.ts`
4. Update templates if needed
5. Add tests in `__tests__/configuration.test.ts`
6. Update this documentation

## Related ADRs

- ADR-0007: Agent Architecture and Extensibility
- ADR-0008: Biometric Authentication Integration
- ADR-0006: Secure Local Storage for Keys and Credentials
- ADR-0004: Carbon Awareness Integration 