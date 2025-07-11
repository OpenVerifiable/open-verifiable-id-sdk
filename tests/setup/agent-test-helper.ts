/**
 * Test Helper for Real Agent Initialization
 * 
 * This helper provides utilities to initialize real agents in test environments
 * without using mocks, allowing us to test the actual implementation.
 */

import { BaseAgent } from '../../src/core/agents/base';
import { UserAgent } from '../../src/core/agents/user-agent';
import { PackageAgent } from '../../src/core/agents/package-agent';
import { ParentAgent } from '../../src/core/agents/parent-agent';
import { ServiceAgent } from '../../src/core/agents/service-agent';
import { AgentType, AgentPlugin, PluginInfo } from '../../src/types';

/**
 * Test configuration for agent initialization
 */
export interface TestAgentConfig {
  // Environment variables to set for testing
  env?: Record<string, string>;
  // Whether to enable network operations (default: false for unit tests)
  enableNetwork?: boolean;
  // Whether to use real storage (default: false, uses in-memory)
  useRealStorage?: boolean;
  // Test-specific encryption key
  encryptionKey?: string;
}

/**
 * Initialize a test environment for agents
 */
export function setupTestEnvironment(config: TestAgentConfig = {}): void {
  // Set environment variables for testing
  if (config.env) {
    Object.entries(config.env).forEach(([key, value]) => {
      process.env[key] = value;
    });
  }

  // Set default test environment variables
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'test';
  }

  // Disable network operations by default for unit tests
  if (!config.enableNetwork) {
    process.env.DISABLE_NETWORK = 'true';
  }
}

/**
 * Create a test user agent with real initialization
 */
export async function createTestUserAgent(
  userId: string = 'test-user',
  config: TestAgentConfig = {}
): Promise<UserAgent> {
  setupTestEnvironment(config);
  
  const userAgent = new UserAgent({
    userId,
    encryptionKey: config.encryptionKey || 'test-encryption-key',
    biometricEnabled: false,
    storageType: 'local'
  });

  await userAgent.initialize();
  return userAgent;
}

/**
 * Create a test package agent with real initialization
 */
export async function createTestPackageAgent(
  packageName: string = 'test-package',
  packageVersion: string = '1.0.0',
  config: TestAgentConfig = {}
): Promise<PackageAgent> {
  setupTestEnvironment(config);
  
  const packageAgent = new PackageAgent({
    packageName,
    packageVersion,
    signingKeyType: 'Ed25519'
  });

  await packageAgent.initialize();
  return packageAgent;
}

/**
 * Create a test parent agent with real initialization
 */
export async function createTestParentAgent(
  organizationId: string = 'test-org',
  config: TestAgentConfig = {}
): Promise<ParentAgent> {
  setupTestEnvironment(config);
  
  const parentAgent = new ParentAgent({
    organizationId
  });

  await parentAgent.initialize();
  return parentAgent;
}

/**
 * Create a test service agent with real initialization
 */
export async function createTestServiceAgent(
  serviceName: string = 'test-service',
  serviceConfig: any = {},
  config: TestAgentConfig = {}
): Promise<ServiceAgent> {
  setupTestEnvironment(config);
  
  const serviceAgent = new ServiceAgent({
    serviceId: serviceName,
    serviceEndpoint: serviceConfig.endpoint || 'http://localhost',
    ...serviceConfig
  });

  await serviceAgent.initialize();
  return serviceAgent;
}

/**
 * Create a test base agent with real initialization
 */
export async function createTestBaseAgent(
  agentId: string = 'test-agent',
  agentType: AgentType = AgentType.USER,
  config: TestAgentConfig = {}
): Promise<BaseAgent> {
  setupTestEnvironment(config);
  
  // Create a concrete implementation for testing
  class TestBaseAgent extends BaseAgent {
    constructor(id: string, type: AgentType) {
      super(id, type, config.encryptionKey);
    }

    getType(): string {
      return 'test-base-agent';
    }
  }

  const baseAgent = new TestBaseAgent(agentId, agentType);
  await baseAgent.initialize();
  return baseAgent;
}

/**
 * Clean up test agents
 */
export async function cleanupTestAgent(agent: BaseAgent): Promise<void> {
  try {
    await agent.cleanup();
  } catch (error) {
    console.warn('Error during agent cleanup:', error);
  }
}

/**
 * Clean up multiple test agents
 */
export async function cleanupTestAgents(agents: BaseAgent[]): Promise<void> {
  await Promise.all(agents.map(cleanupTestAgent));
}

/**
 * Mock plugin for testing
 */
export class MockPlugin implements AgentPlugin {
  name: string;
  version = '1.0.0';
  type = 'utility' as const;
  methods = {} as any;

  constructor(name: string = 'mock-plugin') {
    this.name = name;
  }

  register(agent: any): void {
    // Mock registration
  }

  unregister?(agent: any): void {
    // Mock unregistration
  }
  
  getInfo(): PluginInfo {
    return {
      name: this.name,
      version: this.version,
      description: 'Mock plugin for testing',
      author: 'Test Author',
      type: this.type,
      capabilities: ['test']
    };
  }
}

/**
 * Test utilities for common operations
 */
export const TestUtils = {
  /**
   * Wait for a condition to be true
   */
  async waitFor(condition: () => boolean, timeout: number = 5000): Promise<void> {
    const start = Date.now();
    while (!condition()) {
      if (Date.now() - start > timeout) {
        throw new Error('Timeout waiting for condition');
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  },

  /**
   * Generate a unique test ID
   */
  generateTestId(): string {
    return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Create a test credential template
   */
  createTestCredentialTemplate(overrides: any = {}): any {
    return {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type: ['VerifiableCredential', 'TestCredential'],
      issuer: overrides.issuer || { id: 'did:test:issuer' },
      credentialSubject: {
        id: 'did:test:subject',
        test: 'value',
        ...overrides.credentialSubject
      },
      ...overrides
    };
  },

  /**
   * Create a test DID creation options object
   */
  createTestDIDOptions(overrides: any = {}): any {
    return {
      alias: 'test-did',
      provider: 'did:key',
      ...overrides
    };
  }
}; 