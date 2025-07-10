/**
 * Simple Plugin Communication Tests
 * 
 * Basic tests for the communication layer components
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PluginStorageImpl } from '../../../src/core/plugins/communication/plugin-storage.js';
import { PluginPermissionsImpl } from '../../../src/core/plugins/communication/plugin-permissions.js';
import { PluginEventsImpl } from '../../../src/core/plugins/communication/plugin-events.js';

describe('Plugin Communication Components', () => {
  describe('PluginStorageImpl', () => {
    let storage: PluginStorageImpl;

    beforeEach(() => {
      storage = new PluginStorageImpl('test-prefix');
    });

    it('should store and retrieve data', async () => {
      await storage.store('test-key', 'test-value');
      const value = await storage.get('test-key');
      expect(value).toBe('test-value');
    });

    it('should handle missing keys', async () => {
      const value = await storage.get('missing-key');
      expect(value).toBeNull();
    });

    it('should delete data', async () => {
      await storage.store('test-key', 'test-value');
      await storage.delete('test-key');
      const value = await storage.get('test-key');
      expect(value).toBeNull();
    });

    it('should list keys', async () => {
      await storage.store('key1', 'value1');
      await storage.store('key2', 'value2');
      
      const keys = await storage.listKeys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
    });

    it('should clear all data', async () => {
      await storage.store('key1', 'value1');
      await storage.store('key2', 'value2');
      await storage.clear();
      
      const keys = await storage.listKeys();
      expect(keys).toHaveLength(0);
    });
  });

  describe('PluginPermissionsImpl', () => {
    let permissions: PluginPermissionsImpl;

    beforeEach(() => {
      permissions = new PluginPermissionsImpl();
    });

    it('should grant default permissions', () => {
      expect(permissions.has('read')).toBe(true);
      expect(permissions.has('write')).toBe(true);
      expect(permissions.has('sign')).toBe(true);
      expect(permissions.has('verify')).toBe(true);
    });

    it('should request permissions', async () => {
      const result = await permissions.request('network');
      expect(result).toBe(true);
      expect(permissions.has('network')).toBe(true);
    });

    it('should deny sensitive permissions', async () => {
      const result = await permissions.request('admin');
      expect(result).toBe(false);
      expect(permissions.has('admin')).toBe(false);
    });

    it('should list granted permissions', () => {
      const granted = permissions.list();
      expect(granted).toContain('read');
      expect(granted).toContain('write');
    });
  });

  describe('PluginEventsImpl', () => {
    let events: PluginEventsImpl;

    beforeEach(() => {
      events = new PluginEventsImpl();
    });

    it('should subscribe and publish events', () => {
      let receivedData: any = null;
      events.subscribe('test-event', (data) => {
        receivedData = data;
      });
      
      events.publish('test-event', { message: 'hello' });
      expect(receivedData).toEqual({ message: 'hello' });
    });

    it('should handle multiple subscribers', () => {
      const received: any[] = [];
      
      events.subscribe('test-event', (data) => received.push(data));
      events.subscribe('test-event', (data) => received.push(data));
      
      events.publish('test-event', { message: 'hello' });
      expect(received).toHaveLength(2);
    });

    it('should unsubscribe from events', () => {
      let callCount = 0;
      const handler = () => callCount++;
      
      events.subscribe('test-event', handler);
      events.publish('test-event', {});
      events.unsubscribe('test-event', handler);
      events.publish('test-event', {});
      
      expect(callCount).toBe(1);
    });

    it('should get event statistics', () => {
      events.subscribe('event1', () => {});
      events.subscribe('event2', () => {});
      events.publish('event1', {});
      
      const stats = events.getEventStats();
      expect(stats.totalEvents).toBeGreaterThan(0);
      expect(stats.totalHandlers).toBe(2);
    });
  });
}); 