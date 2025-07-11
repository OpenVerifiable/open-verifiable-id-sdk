import { describe, it, expect } from 'vitest';
import { AgentConfigurationManager } from '../../../src/core/agents/configuration-manager';
import { AgentType, AgentConfiguration } from '../../../src/core/agents/types';

describe('AgentConfigurationManager plugin validation', () => {
  const manager = new AgentConfigurationManager();

  it('detects missing plugin dependencies', async () => {
    const config: AgentConfiguration = {
      agentId: 'a1',
      agentType: AgentType.USER,
      plugins: [
        { name: 'p1', version: '1.0.0', type: 'utility', config: { dependencies: [{ name: 'p2' }] } }
      ]
    };
    const result = await manager.validateConfiguration(config);
    expect(result.errors.join(' ')).toContain("requires missing dependency 'p2'");
  });

  it('detects invalid plugin permissions', async () => {
    const config: AgentConfiguration = {
      agentId: 'a2',
      agentType: AgentType.USER,
      plugins: [
        { name: 'p1', version: '1.0.0', type: 'utility', security: { permissions: ['read', 'hack'] } }
      ]
    };
    const result = await manager.validateConfiguration(config);
    expect(result.errors.join(' ')).toContain('requests invalid permissions: hack');
  });

  it('detects sandboxed plugin with agent sandboxMode false', async () => {
    const config: AgentConfiguration = {
      agentId: 'a3',
      agentType: AgentType.USER,
      security: { sandboxMode: false },
      plugins: [
        { name: 'p1', version: '1.0.0', type: 'utility', security: { sandboxed: true } }
      ]
    };
    const result = await manager.validateConfiguration(config);
    expect(result.errors.join(' ')).toContain('requires sandboxed execution but agent sandboxMode is false');
  });

  it('detects duplicate plugin names', async () => {
    const config: AgentConfiguration = {
      agentId: 'a4',
      agentType: AgentType.USER,
      plugins: [
        { name: 'p1', version: '1.0.0', type: 'utility' },
        { name: 'p1', version: '2.0.0', type: 'utility' }
      ]
    };
    const result = await manager.validateConfiguration(config);
    expect(result.errors.join(' ')).toContain('Duplicate plugin names');
  });

  it('detects version mismatches in dependencies', async () => {
    const config: AgentConfiguration = {
      agentId: 'a5',
      agentType: AgentType.USER,
      plugins: [
        { name: 'p1', version: '1.0.0', type: 'utility', config: { dependencies: [{ name: 'p2', version: '2.0.0' }] } },
        { name: 'p2', version: '1.0.0', type: 'utility' }
      ]
    };
    const result = await manager.validateConfiguration(config);
    expect(result.errors.join(' ')).toContain("requires 'p2' version '2.0.0', found '1.0.0'");
  });

  it('warns for both lazyLoad and autoEnable', async () => {
    const config: AgentConfiguration = {
      agentId: 'a6',
      agentType: AgentType.USER,
      plugins: [
        { name: 'p1', version: '1.0.0', type: 'utility', lifecycle: { lazyLoad: true, autoEnable: true } }
      ]
    };
    const result = await manager.validateConfiguration(config);
    expect(result.warnings.join(' ')).toContain('is set to both lazyLoad and autoEnable');
  });
}); 