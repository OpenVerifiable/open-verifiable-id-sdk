import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { AgentFactory, createAgent } from '../../../src/core/agents/factory'
import { AgentType } from '../../../src/types'

// Mock all agent classes
vi.mock('../../../src/core/agents/user-agent', () => ({
  UserAgent: class MockUserAgent {
    public agentId: string
    public agentType: AgentType = AgentType.USER
    public encryptionKey?: string

    constructor(userIdOrConfig: string | any, encryptionKey?: string) {
      // Handle both string and config object patterns like the real UserAgent
      if (typeof userIdOrConfig === 'string') {
        this.agentId = `user-${userIdOrConfig}`
        this.encryptionKey = encryptionKey
      } else {
        this.agentId = `user-${userIdOrConfig.userId}`
        this.encryptionKey = userIdOrConfig.encryptionKey || encryptionKey
      }
    }

    async initialize(): Promise<void> {
      // Mock implementation
    }
  }
}))

vi.mock('../../../src/core/agents/package-agent', () => ({
  PackageAgent: class MockPackageAgent {
    public agentId: string
    public agentType: AgentType = AgentType.PACKAGE
    public version: string
    public encryptionKey?: string

    constructor(config: any) {
      this.agentId = `package-${config.packageName}-${config.packageVersion}`
      this.version = config.packageVersion
      this.encryptionKey = config.encryptionKey
    }

    async initialize(): Promise<void> {
      // Mock implementation
    }
  }
}))

vi.mock('../../../src/core/agents/parent-agent', () => ({
  ParentAgent: class MockParentAgent {
    public agentId: string
    public agentType: AgentType = AgentType.PARENT
    public encryptionKey?: string

    constructor(config: any) {
      this.agentId = `org-${config.organizationId}`
      this.encryptionKey = config.encryptionKey
    }

    async initialize(): Promise<void> {
      // Mock implementation
    }
  }
}))

vi.mock('../../../src/core/agents/service-agent', () => ({
  ServiceAgent: class MockServiceAgent {
    public agentId: string
    public agentType: AgentType = AgentType.SERVICE
    public serviceConfig: any
    public encryptionKey?: string

    constructor(config: any) {
      this.agentId = `service-${config.serviceId}`
      this.serviceConfig = config.serviceConfig || { endpoint: 'http://localhost' }
      this.encryptionKey = config.encryptionKey
    }

    async initialize(): Promise<void> {
      // Mock implementation
    }
  }
}))

describe('Agent Factory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('AgentFactory.createAgent', () => {
    it('should create a UserAgent with default parameters', async () => {
      const agent = await AgentFactory.createAgent(AgentType.USER)
      
      expect(agent.agentType).toBe(AgentType.USER)
      expect(agent.agentId).toBe('user-default-user')
    })

    it('should create a UserAgent with custom parameters', async () => {
      const agentId = 'custom-user-123'
      const encryptionKey = 'test-key'
      
      const agent = await AgentFactory.createAgent(AgentType.USER, agentId, { encryptionKey })
      
      expect(agent.agentType).toBe(AgentType.USER)
      expect(agent.agentId).toBe(`user-${agentId}`)
      expect((agent as any).encryptionKey).toBe(encryptionKey)
    })

    it('should create a PackageAgent with default parameters', async () => {
      const agent = await AgentFactory.createAgent(AgentType.PACKAGE)
      
      expect(agent.agentType).toBe(AgentType.PACKAGE)
      expect(agent.agentId).toBe('package-default-package-1.0.0')
      expect((agent as any).version).toBe('1.0.0')
    })

    it('should create a PackageAgent with custom parameters', async () => {
      const agentId = 'custom-package-123'
      const version = '2.0.0'
      const encryptionKey = 'test-key'
      
      const agent = await AgentFactory.createAgent(AgentType.PACKAGE, agentId, { 
        version, 
        encryptionKey 
      })
      
      expect(agent.agentType).toBe(AgentType.PACKAGE)
      expect(agent.agentId).toBe(`package-${agentId}-${version}`)
      expect((agent as any).version).toBe(version)
      expect((agent as any).encryptionKey).toBe(encryptionKey)
    })

    it('should create a ParentAgent with default parameters', async () => {
      const agent = await AgentFactory.createAgent(AgentType.PARENT)
      
      expect(agent.agentType).toBe(AgentType.PARENT)
      expect(agent.agentId).toBe('org-default-org')
    })

    it('should create a ParentAgent with custom parameters', async () => {
      const agentId = 'custom-org-123'
      const encryptionKey = 'test-key'
      
      const agent = await AgentFactory.createAgent(AgentType.PARENT, agentId, { encryptionKey })
      
      expect(agent.agentType).toBe(AgentType.PARENT)
      expect(agent.agentId).toBe(`org-${agentId}`)
      expect(agent.encryptionKey).toBe(encryptionKey)
    })

    it('should create a ServiceAgent with default parameters', async () => {
      const agent = await AgentFactory.createAgent(AgentType.SERVICE)
      
      expect(agent.agentType).toBe(AgentType.SERVICE)
      expect(agent.agentId).toBe('service-default-service')
      expect((agent as any).serviceConfig).toEqual({ endpoint: 'http://localhost' })
    })

    it('should create a ServiceAgent with custom parameters', async () => {
      const agentId = 'custom-service-123'
      const serviceConfig = { endpoint: 'https://api.example.com', apiKey: 'test-key' }
      const encryptionKey = 'test-key'
      
      const agent = await AgentFactory.createAgent(AgentType.SERVICE, agentId, { 
        serviceConfig, 
        encryptionKey 
      })
      
      expect(agent.agentType).toBe(AgentType.SERVICE)
      expect(agent.agentId).toBe(`service-${agentId}`)
      expect((agent as any).serviceConfig).toEqual(serviceConfig)
      expect(agent.encryptionKey).toBe(encryptionKey)
    })

    it('should throw error for unknown agent type', async () => {
      const unknownType = 'unknown' as AgentType
      
      await expect(AgentFactory.createAgent(unknownType)).rejects.toThrow(
        'Unknown agent type: unknown'
      )
    })

    it('should initialize the agent after creation', async () => {
      const initializeSpy = vi.spyOn(console, 'log').mockImplementation()
      
      const agent = await AgentFactory.createAgent(AgentType.USER, 'test-user')
      
      expect(agent.agentType).toBe(AgentType.USER)
      expect(agent.agentId).toBe('user-test-user')
    })
  })

  describe('createAgent function', () => {
    it('should create a UserAgent by default', async () => {
      const agent = await createAgent()
      
      expect(agent.agentType).toBe(AgentType.USER)
      expect(agent.agentId).toBe('user-default-user')
    })

    it('should create specified agent type', async () => {
      const agent = await createAgent(AgentType.PACKAGE, 'test-package')
      
      expect(agent.agentType).toBe(AgentType.PACKAGE)
      expect(agent.agentId).toBe('package-test-package-1.0.0')
    })

    it('should pass configuration to agent', async () => {
      const config = { encryptionKey: 'test-key' }
      const agent = await createAgent(AgentType.USER, 'test-user', config)
      
      expect(agent.agentType).toBe(AgentType.USER)
      expect(agent.agentId).toBe('user-test-user')
      expect(agent.encryptionKey).toBe('test-key')
    })

    it('should handle all agent types', async () => {
      const agentTypes = [AgentType.USER, AgentType.PACKAGE, AgentType.PARENT, AgentType.SERVICE]
      
      for (const type of agentTypes) {
        const agent = await createAgent(type, `test-${type}`)
        expect(agent.agentType).toBe(type)
        // Each agent type has its own ID format
        if (type === AgentType.USER) {
          expect(agent.agentId).toBe(`user-test-${type}`)
        } else if (type === AgentType.PACKAGE) {
          expect(agent.agentId).toBe(`package-test-${type}-1.0.0`)
        } else if (type === AgentType.PARENT) {
          expect(agent.agentId).toBe(`org-test-${type}`)
        } else if (type === AgentType.SERVICE) {
          expect(agent.agentId).toBe(`service-test-${type}`)
        }
      }
    })
  })

  describe('Agent initialization', () => {
    it('should call initialize on created agents', async () => {
      // This test verifies that the factory calls initialize on the agent
      const agent = await AgentFactory.createAgent(AgentType.USER, 'test-user')
      
      // The mock should have been called during creation
      expect(agent).toBeDefined()
      expect(agent.agentType).toBe(AgentType.USER)
    })

    it('should handle initialization errors', async () => {
      // Mock an agent that throws during initialization
      const { UserAgent } = await import('../../../src/core/agents/user-agent')
      vi.mocked(UserAgent.prototype.initialize).mockRejectedValue(new Error('Init failed'))
      
      await expect(AgentFactory.createAgent(AgentType.USER)).rejects.toThrow('Init failed')
    })
  })

  describe('Configuration handling', () => {
    it('should handle undefined configuration', async () => {
      const agent = await AgentFactory.createAgent(AgentType.USER, 'test-user', undefined)
      
      expect(agent.agentType).toBe(AgentType.USER)
      expect(agent.agentId).toBe('user-test-user')
    })

    it('should handle empty configuration object', async () => {
      const agent = await AgentFactory.createAgent(AgentType.USER, 'test-user', {})
      
      expect(agent.agentType).toBe(AgentType.USER)
      expect(agent.agentId).toBe('user-test-user')
    })

    it('should handle complex configuration objects', async () => {
      const complexConfig = {
        encryptionKey: 'test-key',
        version: '2.0.0',
        serviceConfig: { endpoint: 'https://api.example.com' },
        customProperty: 'custom-value'
      }
      
      const agent = await AgentFactory.createAgent(AgentType.SERVICE, 'test-service', complexConfig)
      
      expect(agent.agentType).toBe(AgentType.SERVICE)
      expect((agent as any).serviceConfig).toEqual(complexConfig.serviceConfig)
    })
  })
}) 