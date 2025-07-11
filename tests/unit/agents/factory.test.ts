import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { AgentFactory } from '../../../src/core/agents/factory'
import { AgentType } from '../../../src/types'
import { 
  createTestUserAgent, 
  createTestPackageAgent, 
  createTestParentAgent, 
  createTestServiceAgent,
  cleanupTestAgent 
} from '../../setup/agent-test-helper'

describe('AgentFactory', () => {
  let factory: AgentFactory

  beforeEach(() => {
    factory = AgentFactory.getInstance()
  })

  afterEach(async () => {
    // Clean up any created agents
    const agents = factory.listAgents()
    for (const agentId of agents) {
      await factory.removeAgent(agentId)
    }
  })

  describe('createUserAgent', () => {
    it('should create a user agent successfully', async () => {
      const userId = 'test-user-123'
      const encryptionKey = 'test-encryption-key'

      const agent = await factory.createUserAgent({
        userId,
        encryptionKey
      })

      expect(agent).toBeDefined()
      expect((agent as any).agentId).toBe(`user-${userId}`)
      expect((agent as any).agentType).toBe(AgentType.USER)

      await cleanupTestAgent(agent)
    })

    it('should create a user agent without encryption key', async () => {
      const userId = 'test-user-no-key'

      const agent = await factory.createUserAgent({
        userId
      })

      expect(agent).toBeDefined()
      expect((agent as any).agentId).toBe(`user-${userId}`)
      expect((agent as any).agentType).toBe(AgentType.USER)

      await cleanupTestAgent(agent)
    })

    it('should handle user IDs with special characters', async () => {
      const specialUserId = 'user@domain.com'

      const agent = await factory.createUserAgent({
        userId: specialUserId
      })

      expect(agent).toBeDefined()
      expect((agent as any).agentId).toBe(`user-${specialUserId}`)

      await cleanupTestAgent(agent)
    })
  })

  describe('createPackageAgent', () => {
    it('should create a package agent successfully', async () => {
      const packageName = 'test-package'
      const packageVersion = '1.0.0'
      const encryptionKey = 'test-encryption-key'

      const agent = await factory.createPackageAgent({
        packageName,
        packageVersion
      })

      expect(agent).toBeDefined()
      expect((agent as any).agentId).toBe(`package-${packageName}`)
      expect((agent as any).agentType).toBe(AgentType.PACKAGE)
      expect((agent as any).version).toBe(packageVersion)

      await cleanupTestAgent(agent)
    })

    it('should create a package agent without encryption key', async () => {
      const packageName = 'test-package-no-key'
      const packageVersion = '2.0.0'

      const agent = await factory.createPackageAgent({
        packageName,
        packageVersion
      })

      expect(agent).toBeDefined()
      expect((agent as any).agentId).toBe(`package-${packageName}`)
      expect((agent as any).agentType).toBe(AgentType.PACKAGE)
      expect((agent as any).version).toBe(packageVersion)

      await cleanupTestAgent(agent)
    })

    it('should handle package names with special characters', async () => {
      const specialPackageName = '@scope/package-name'
      const packageVersion = '1.0.0'

      const agent = await factory.createPackageAgent({
        packageName: specialPackageName,
        packageVersion
      })

      expect(agent).toBeDefined()
      expect((agent as any).agentId).toBe(`package-${specialPackageName}`)

      await cleanupTestAgent(agent)
    })
  })

  describe('createParentAgent', () => {
    it('should create a parent agent successfully', async () => {
      const organizationId = 'test-organization-123'
      const encryptionKey = 'test-encryption-key'

      const agent = await factory.createParentAgent({
        organizationId
      })

      expect(agent).toBeDefined()
      expect((agent as any).agentId).toBe(`parent-${organizationId}`)
      expect((agent as any).agentType).toBe(AgentType.PARENT)

      await cleanupTestAgent(agent)
    })

    it('should create a parent agent without encryption key', async () => {
      const organizationId = 'test-org-no-key'

      const agent = await factory.createParentAgent({
        organizationId
      })

      expect(agent).toBeDefined()
      expect((agent as any).agentId).toBe(`parent-${organizationId}`)
      expect((agent as any).agentType).toBe(AgentType.PARENT)

      await cleanupTestAgent(agent)
    })

    it('should handle organization IDs with special characters', async () => {
      const specialOrgId = 'org-name-with-dashes_123'

      const agent = await factory.createParentAgent({
        organizationId: specialOrgId
      })

      expect(agent).toBeDefined()
      expect((agent as any).agentId).toBe(`parent-${specialOrgId}`)

      await cleanupTestAgent(agent)
    })
  })

  describe('createServiceAgent', () => {
    it('should create a service agent successfully', async () => {
      const serviceName = 'test-service'
      const serviceConfig = {
        endpoint: 'https://api.example.com',
        apiKey: 'test-api-key'
      }
      const encryptionKey = 'test-encryption-key'

      const agent = await factory.createServiceAgent({
        serviceId: serviceName,
        serviceEndpoint: serviceConfig.endpoint
      })

      expect(agent).toBeDefined()
      expect((agent as any).agentId).toBe(`service-${serviceName}`)
      expect((agent as any).agentType).toBe(AgentType.SERVICE)
      expect((agent as any).serviceConfig).toBeDefined()

      await cleanupTestAgent(agent)
    })

    it('should create a service agent without encryption key', async () => {
      const serviceName = 'test-service-no-key'
      const serviceConfig = {
        endpoint: 'https://api.example.com'
      }

      const agent = await factory.createServiceAgent({
        serviceId: serviceName,
        serviceEndpoint: serviceConfig.endpoint
      })

      expect(agent).toBeDefined()
      expect((agent as any).agentId).toBe(`service-${serviceName}`)
      expect((agent as any).agentType).toBe(AgentType.SERVICE)
      expect((agent as any).serviceConfig).toBeDefined()

      await cleanupTestAgent(agent)
    })

    it('should handle service names with special characters', async () => {
      const specialServiceName = 'api-service-v2'
      const serviceConfig = {
        endpoint: 'https://api.example.com'
      }

      const agent = await factory.createServiceAgent({
        serviceId: specialServiceName,
        serviceEndpoint: serviceConfig.endpoint
      })

      expect(agent).toBeDefined()
      expect((agent as any).agentId).toBe(`service-${specialServiceName}`)

      await cleanupTestAgent(agent)
    })
  })

  describe('Agent Management', () => {
    it('should track created agents', async () => {
      const userAgent = await factory.createUserAgent({ userId: 'user1' })
      const packageAgent = await factory.createPackageAgent({ packageName: 'package1', packageVersion: '1.0.0' })
      const parentAgent = await factory.createParentAgent({ organizationId: 'org1' })
      const serviceAgent = await factory.createServiceAgent({ serviceId: 'service1', serviceEndpoint: 'http://localhost' })

      const agents = factory.listAgents()
      expect(agents).toHaveLength(4)
      expect(agents).toContain('user-user1')
      expect(agents).toContain('package-package1')
      expect(agents).toContain('parent-org1')
      expect(agents).toContain('service-service1')

      await cleanupTestAgent(userAgent)
      await cleanupTestAgent(packageAgent)
      await cleanupTestAgent(parentAgent)
      await cleanupTestAgent(serviceAgent)
    })

    it('should cleanup all agents', async () => {
      const userAgent = await factory.createUserAgent({ userId: 'user1' })
      const packageAgent = await factory.createPackageAgent({ packageName: 'package1', packageVersion: '1.0.0' })

      const agents = factory.listAgents()
      for (const agentId of agents) {
        await factory.removeAgent(agentId)
      }

      const remainingAgents = factory.listAgents()
      expect(remainingAgents).toHaveLength(0)
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid user ID', async () => {
      await expect(factory.createUserAgent({ userId: '' })).rejects.toThrow()
    })

    it('should handle invalid package name', async () => {
      await expect(factory.createPackageAgent({ packageName: '', packageVersion: '1.0.0' })).rejects.toThrow()
    })

    it('should handle invalid organization ID', async () => {
      await expect(factory.createParentAgent({ organizationId: '' })).rejects.toThrow()
    })

    it('should handle invalid service name', async () => {
      await expect(factory.createServiceAgent({ serviceId: '', serviceEndpoint: 'http://localhost' })).rejects.toThrow()
    })
  })
}) 