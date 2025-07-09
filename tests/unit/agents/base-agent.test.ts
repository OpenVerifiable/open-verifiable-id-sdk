import { describe, it, expect, beforeEach } from 'vitest';
import { BaseAgent } from '../../../src/core/agents/base';
import { 
  AgentPlugin, 
  PluginInfo, 
  OvIdAgent, 
  CreateDIDOptions, 
  ValidationResult,
  IIdentifier,
  CredentialTemplate,
  AgentType
} from '../../../src/types';
import { DIDDocument } from 'did-resolver';
import { VerifiableCredential } from '@veramo/core-types';

// Create a concrete implementation of BaseAgent for testing
class TestAgent extends BaseAgent {
  constructor(id: string = 'test-agent') {
    super(id, AgentType.USER);
  }

  getType(): string {
    return 'test-agent';
  }
}

class MockPlugin implements AgentPlugin {
  name: string;
  version = '1.0.0';
  type = 'did-method' as const;
  methods = {} as any;

  constructor(name: string = 'mock-plugin') {
    this.name = name;
  }

  register(agent: any): void {}
  unregister?(agent: any): void {}
  
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

describe('BaseAgent', () => {
  let agent: TestAgent;
  let plugin: MockPlugin;

  beforeEach(() => {
    agent = new TestAgent();
    // Clear any existing plugins to ensure test isolation
    agent.clearPlugins();
  });

  describe('Plugin Management', () => {
    it('should register a plugin', () => {
      const testPlugin = new MockPlugin(`test-plugin-${Date.now()}`);
      agent.registerPlugin(testPlugin);
      expect(agent.getPlugin(testPlugin.name)).toBeDefined();
    });

    it('should list registered plugins', () => {
      const testPlugin = new MockPlugin(`test-plugin-${Date.now()}`);
      agent.registerPlugin(testPlugin);
      const plugins = agent.listPlugins();
      console.log('Registered plugins:', plugins.map(p => p.name));
      expect(plugins).toHaveLength(1);
      expect(plugins[0].name).toBe(testPlugin.name);
    });

    it('should throw when registering duplicate plugin', () => {
      const testPlugin = new MockPlugin(`duplicate-test-${Date.now()}`);
      agent.registerPlugin(testPlugin);
      expect(() => agent.registerPlugin(testPlugin)).toThrow();
    });
  });

  describe('DID Operations', () => {
    it('should throw when no DID plugin is registered', async () => {
      await expect(agent.createDID('test', { alias: 'test' })).rejects.toThrow();
      await expect(agent.resolveDID('did:test:123')).rejects.toThrow();
    });
  });

  describe('Credential Operations', () => {
    it('should throw when no credential plugin is registered', async () => {
      const template: CredentialTemplate = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiableCredential'],
        issuer: { id: 'did:test:issuer' },
        credentialSubject: {
          id: 'did:test:subject',
          test: 'value'
        }
      };
      await expect(agent.issueCredential(template)).rejects.toThrow();
      await expect(agent.verifyCredential({} as any)).rejects.toThrow();
    });
  });

  describe('Crypto Operations', () => {
    it('should throw when no crypto plugin is registered', async () => {
      await expect(agent.sign({}, {})).rejects.toThrow();
    });
  });
}); 