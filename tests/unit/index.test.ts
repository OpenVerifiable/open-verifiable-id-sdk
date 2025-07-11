import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { 
  UserAgent, 
  PackageAgent, 
  ParentAgent, 
  ServiceAgent,
  AgentFactory 
} from '../../src/core/agents'
import { AgentType } from '../../src/types'
import { 
  createTestUserAgent, 
  createTestPackageAgent, 
  createTestParentAgent, 
  createTestServiceAgent,
  cleanupTestAgent 
} from '../setup/agent-test-helper'

describe('SDK Main Module', () => {
  describe('Agent Classes', () => {
    describe('UserAgent', () => {
      let userAgent: UserAgent

      beforeEach(async () => {
        userAgent = await createTestUserAgent('test-user')
      })

      afterEach(async () => {
        await cleanupTestAgent(userAgent)
      })

      it('should be exported and instantiable', () => {
        expect(UserAgent).toBeDefined()
        expect(typeof UserAgent).toBe('function')
      })

      it('should create a user agent with correct properties', () => {
        expect((userAgent as any).agentId).toBe('user-test-user')
        expect((userAgent as any).agentType).toBe(AgentType.USER)
      })

      it('should have user-specific capabilities', () => {
        const capabilities = userAgent.getCapabilities()
        expect(capabilities).toContain('create-did')
        expect(capabilities).toContain('issue-credential')
        expect(capabilities).toContain('verify-credential')
      })
    })

    describe('PackageAgent', () => {
      let packageAgent: PackageAgent

      beforeEach(async () => {
        packageAgent = await createTestPackageAgent('test-package', '1.0.0')
      })

      afterEach(async () => {
        await cleanupTestAgent(packageAgent)
      })

      it('should be exported and instantiable', () => {
        expect(PackageAgent).toBeDefined()
        expect(typeof PackageAgent).toBe('function')
      })

      it('should create a package agent with correct properties', () => {
        expect((packageAgent as any).agentId).toBe('package-test-package')
        expect((packageAgent as any).agentType).toBe(AgentType.PACKAGE)
        expect((packageAgent as any).version).toBe('1.0.0')
      })

      it('should have package-specific capabilities', () => {
        const capabilities = packageAgent.getCapabilities()
        expect(capabilities).toContain('create-package-did')
        expect(capabilities).toContain('issue-package-credentials')
        expect(capabilities).toContain('verify-package-integrity')
      })
    })

    describe('ParentAgent', () => {
      let parentAgent: ParentAgent

      beforeEach(async () => {
        parentAgent = await createTestParentAgent('test-organization')
      })

      afterEach(async () => {
        await cleanupTestAgent(parentAgent)
      })

      it('should be exported and instantiable', () => {
        expect(ParentAgent).toBeDefined()
        expect(typeof ParentAgent).toBe('function')
      })

      it('should create a parent agent with correct properties', () => {
        expect((parentAgent as any).agentId).toBe('parent-test-organization')
        expect((parentAgent as any).agentType).toBe(AgentType.PARENT)
      })

      it('should have organization-specific capabilities', () => {
        const capabilities = parentAgent.getCapabilities()
        expect(capabilities).toContain('create-organization-did')
        expect(capabilities).toContain('delegate-permissions')
        expect(capabilities).toContain('manage-child-agents')
      })
    })

    describe('ServiceAgent', () => {
      let serviceAgent: ServiceAgent

      beforeEach(async () => {
        serviceAgent = await createTestServiceAgent('test-service', {
          endpoint: 'https://api.example.com'
        })
      })

      afterEach(async () => {
        await cleanupTestAgent(serviceAgent)
      })

      it('should be exported and instantiable', () => {
        expect(ServiceAgent).toBeDefined()
        expect(typeof ServiceAgent).toBe('function')
      })

      it('should create a service agent with correct properties', () => {
        expect((serviceAgent as any).agentId).toBe('service-test-service')
        expect((serviceAgent as any).agentType).toBe(AgentType.SERVICE)
        expect((serviceAgent as any).serviceConfig).toBeDefined()
      })

      it('should have service-specific capabilities', () => {
        const capabilities = serviceAgent.getCapabilities()
        expect(capabilities).toContain('create-service-did')
        expect(capabilities).toContain('issue-service-credentials')
        expect(capabilities).toContain('verify-external-credentials')
      })
    })
  })

  describe('AgentFactory', () => {
    let factory: AgentFactory

    beforeEach(() => {
      factory = new AgentFactory()
    })

    afterEach(async () => {
      await factory.cleanup()
    })

    it('should be exported and instantiable', () => {
      expect(AgentFactory).toBeDefined()
      expect(typeof AgentFactory).toBe('function')
    })

    it('should create user agents', async () => {
      const agent = await factory.createUserAgent('test-user')
      expect(agent).toBeDefined()
      expect((agent as any).agentType).toBe(AgentType.USER)
      await cleanupTestAgent(agent)
    })

    it('should create package agents', async () => {
      const agent = await factory.createPackageAgent('test-package', '1.0.0')
      expect(agent).toBeDefined()
      expect((agent as any).agentType).toBe(AgentType.PACKAGE)
      await cleanupTestAgent(agent)
    })

    it('should create parent agents', async () => {
      const agent = await factory.createParentAgent('test-organization')
      expect(agent).toBeDefined()
      expect((agent as any).agentType).toBe(AgentType.PARENT)
      await cleanupTestAgent(agent)
    })

    it('should create service agents', async () => {
      const agent = await factory.createServiceAgent('test-service', {})
      expect(agent).toBeDefined()
      expect((agent as any).agentType).toBe(AgentType.SERVICE)
      await cleanupTestAgent(agent)
    })
  })

  describe('Type Exports', () => {
    it('should export AgentType enum', () => {
      expect(AgentType).toBeDefined()
      expect(AgentType.USER).toBe('user')
      expect(AgentType.PACKAGE).toBe('package')
      expect(AgentType.PARENT).toBe('parent')
      expect(AgentType.SERVICE).toBe('service')
    })
  })

  describe('Integration Tests', () => {
    it('should allow creating and using multiple agent types', async () => {
      // Create different types of agents
      const userAgent = await createTestUserAgent('user1')
      const packageAgent = await createTestPackageAgent('package1', '1.0.0')
      const parentAgent = await createTestParentAgent('org1')
      const serviceAgent = await createTestServiceAgent('service1', {})

      // Verify they all have the expected types
      expect((userAgent as any).agentType).toBe(AgentType.USER)
      expect((packageAgent as any).agentType).toBe(AgentType.PACKAGE)
      expect((parentAgent as any).agentType).toBe(AgentType.PARENT)
      expect((serviceAgent as any).agentType).toBe(AgentType.SERVICE)

      // Verify they all have capabilities
      expect(userAgent.getCapabilities().length).toBeGreaterThan(0)
      expect(packageAgent.getCapabilities().length).toBeGreaterThan(0)
      expect(parentAgent.getCapabilities().length).toBeGreaterThan(0)
      expect(serviceAgent.getCapabilities().length).toBeGreaterThan(0)

      // Clean up
      await cleanupTestAgent(userAgent)
      await cleanupTestAgent(packageAgent)
      await cleanupTestAgent(parentAgent)
      await cleanupTestAgent(serviceAgent)
    })

    it('should allow creating DIDs with different agents', async () => {
      const userAgent = await createTestUserAgent('user1')
      const packageAgent = await createTestPackageAgent('package1', '1.0.0')

      // Create DIDs with different agents
      const userDID = await userAgent.createDID('key')
      const packageDID = await packageAgent.createDID('key')

      expect(userDID.did).toMatch(/^did:key:/)
      expect(packageDID.did).toMatch(/^did:key:/)
      expect(userDID.did).not.toBe(packageDID.did)

      await cleanupTestAgent(userAgent)
      await cleanupTestAgent(packageAgent)
    })
  })
}) 