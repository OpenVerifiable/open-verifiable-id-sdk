---
ADR: 0016
Title: Agent Factory Pattern for Agent Creation and Configuration
Date: 2025-01-14
Status: Proposed
Priority: MVP
Principles: [creator_first, modular_open_source, security_first, resilience_by_design, inclusive_integration, community_collaboration]
Related_ADRs: [0007, 0015, 0017, 0018]
BusinessImpact: >-
  - Simplifies agent creation and configuration for developers
  - Ensures consistent agent initialization and security setup
  - Enables platform-specific optimizations and feature detection
  - Supports rapid prototyping and production deployment
Runbook: |
  1. Create user agent: `./scripts/create-user-agent.sh {userId} {encryptionKey}`
  2. Create package agent: `./scripts/create-package-agent.sh {packageName} {version}`
  3. Create parent agent: `./scripts/create-parent-agent.sh {orgId}`
  4. Create service agent: `./scripts/create-service-agent.sh {serviceName} {config}`
  5. List agent types: `./scripts/list-agent-types.sh`
  6. Validate agent configuration: `./scripts/validate-agent-config.sh {type} {config}`
---

## Context

The Open Verifiable ID SDK supports multiple agent types (User, Package, Parent, Service) with different capabilities and configurations. A factory pattern is needed to simplify agent creation, ensure consistent initialization, and provide platform-specific optimizations. This pattern should abstract away the complexity of agent setup while maintaining flexibility for different use cases.

## Requirements

### Must
- Support creation of all agent types (User, Package, Parent, Service)
- Ensure consistent agent initialization and security setup
- Provide platform-specific configuration and optimization
- Support custom configuration options for each agent type
- Handle agent lifecycle management (create, initialize, destroy)

### Should
- Enable agent type discovery and capability reporting
- Support agent configuration validation
- Provide default configurations for common use cases
- Enable agent cloning and migration

### Could
- Support agent templates and presets
- Enable agent configuration inheritance
- Provide agent performance profiling
- Support agent hot-swapping and updates

## Decision

### 1. Factory Pattern Implementation

The agent factory implements a centralized creation pattern that handles agent instantiation, configuration, and initialization:

#### Factory Interface
```typescript
export class AgentFactory {
  static async createAgent(
    type: AgentType, 
    agentId?: string,
    config?: any
  ): Promise<OpenVerifiableAgent> {
    let agent: OpenVerifiableAgent;

    // Create agent instance based on type
    switch (type) {
      case AgentType.USER:
        agent = new UserAgent(agentId || 'default-user', config?.encryptionKey);
        break;
      case AgentType.PACKAGE:
        agent = new PackageAgent(agentId || 'default-package', config?.version || '1.0.0', config?.encryptionKey);
        break;
      case AgentType.PARENT:
        agent = new ParentAgent(agentId || 'default-org', config?.encryptionKey);
        break;
      case AgentType.SERVICE:
        agent = new ServiceAgent(agentId || 'default-service', config?.serviceConfig || { endpoint: 'http://localhost' }, config?.encryptionKey);
        break;
      default:
        throw new Error(`Unknown agent type: ${type}`);
    }

    // Initialize the agent
    await agent.initialize();

    return agent;
  }
}
```

#### Convenience Functions
```typescript
// High-level convenience functions for common use cases
export async function createUserAgent(userId: string, encryptionKey?: string): Promise<UserAgent> {
  const agent = new UserAgent(userId, encryptionKey);
  await agent.initialize();
  return agent;
}

export async function createPackageAgent(
  packageName: string, 
  packageVersion: string, 
  encryptionKey?: string
): Promise<PackageAgent> {
  const agent = new PackageAgent(packageName, packageVersion, encryptionKey);
  await agent.initialize();
  return agent;
}

export async function createParentAgent(organizationId: string, encryptionKey?: string): Promise<ParentAgent> {
  const agent = new ParentAgent(organizationId, encryptionKey);
  await agent.initialize();
  return agent;
}

export async function createServiceAgent(
  serviceName: string, 
  serviceConfig: { endpoint: string; apiKey?: string; }, 
  encryptionKey?: string
): Promise<ServiceAgent> {
  const agent = new ServiceAgent(serviceName, serviceConfig, encryptionKey);
  await agent.initialize();
  return agent;
}
```

### 2. Agent Type-Specific Configuration

#### User Agent Configuration
- **Purpose**: Individual user identity management
- **Capabilities**: DID creation, credential issuance/verification, wallet management
- **Configuration**: User ID, encryption key, biometric settings
- **Use Cases**: Personal identity, credential storage, authentication

#### Package Agent Configuration
- **Purpose**: Software package and release identity
- **Capabilities**: Package signing, release verification, metadata management
- **Configuration**: Package name, version, signing keys
- **Use Cases**: Software distribution, package verification, supply chain security

#### Parent Agent Configuration
- **Purpose**: Organizational and hierarchical identity management
- **Capabilities**: Authority delegation, child agent management, organization credentials
- **Configuration**: Organization ID, delegation policies, trust settings
- **Use Cases**: Enterprise identity, organizational governance, delegation workflows

#### Service Agent Configuration
- **Purpose**: API and service identity management
- **Capabilities**: Service authentication, external verification, trust registry queries
- **Configuration**: Service endpoint, API keys, verification settings
- **Use Cases**: API authentication, service verification, external integrations

### 3. Platform-Specific Optimizations

#### Platform Detection
- Automatically detect platform (Node.js, Browser, React Native)
- Configure storage, crypto, and networking based on platform capabilities
- Optimize performance for platform-specific features

#### Feature Detection
- Detect hardware security features (TPM, Secure Enclave)
- Enable biometric authentication when available
- Configure storage based on platform capabilities

#### Configuration Validation
- Validate agent configuration before creation
- Provide helpful error messages for invalid configurations
- Suggest optimal configurations based on platform and use case

### 4. Agent Lifecycle Management

#### Creation Phase
- Validate agent type and configuration
- Generate unique agent ID if not provided
- Set up platform-specific components

#### Initialization Phase
- Initialize Veramo agent with appropriate plugins
- Set up secure storage with encryption
- Configure DID and key management
- Register agent-specific plugins

#### Runtime Phase
- Provide agent capabilities and health monitoring
- Support agent configuration updates
- Enable agent backup and migration

#### Cleanup Phase
- Safely destroy agent resources
- Clean up storage and connections
- Log agent lifecycle events

## Consequences

### Positives
- **Simplicity**: Factory pattern simplifies agent creation for developers
- **Consistency**: Ensures all agents are properly initialized and configured
- **Flexibility**: Supports custom configurations while providing sensible defaults
- **Platform Optimization**: Automatically optimizes for different platforms
- **Maintainability**: Centralized creation logic reduces code duplication

### Negatives
- **Abstraction**: Factory pattern may hide important configuration details
- **Complexity**: Factory implementation adds complexity to the codebase
- **Dependencies**: Factory creates dependencies between agent types and creation logic

### Trade-offs
- **Simplicity vs Control**: Factory simplifies creation but may limit fine-grained control
- **Consistency vs Flexibility**: Standardized creation ensures consistency but may limit customization

## Business Impact
- **Developer Experience**: Simplified agent creation improves developer adoption
- **Time to Market**: Factory pattern reduces development time for common use cases
- **Quality Assurance**: Consistent initialization reduces configuration errors
- **Platform Support**: Automatic platform optimization improves cross-platform compatibility

## Mission Alignment & Principle Coverage
- **Creator First, Always**: Simplifies agent creation for creators and developers
- **Modular & Open-Source Foundation**: Factory pattern supports modular agent architecture
- **Security First**: Ensures consistent security setup across all agent types
- **Resilience by Design**: Platform-specific optimizations improve reliability
- **Inclusive Integration**: Supports diverse use cases and platforms
- **Community Collaboration**: Factory pattern enables community contributions and extensions 