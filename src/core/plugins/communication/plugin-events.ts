/**
 * Plugin Events Implementation
 * 
 * Provides event-driven communication between plugins and agents
 */

import { PluginEvents } from '../interfaces.js';

export interface EventHandler {
  id: string;
  handler: (data: any) => void;
  timestamp: string;
}

export interface EventMessage {
  event: string;
  data: any;
  timestamp: string;
  source: string;
  target?: string;
}

export class PluginEventsImpl implements PluginEvents {
  private eventHandlers: Map<string, EventHandler[]> = new Map();
  private eventHistory: EventMessage[] = [];
  private maxHistorySize: number = 1000;

  constructor(maxHistorySize: number = 1000) {
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * Subscribe to an event
   */
  subscribe(event: string, handler: (data: any) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }

    const handlerId = this.generateHandlerId();
    const eventHandler: EventHandler = {
      id: handlerId,
      handler,
      timestamp: new Date().toISOString()
    };

    this.eventHandlers.get(event)!.push(eventHandler);
  }

  /**
   * Unsubscribe from an event
   */
  unsubscribe(event: string, handler: (data: any) => void): void {
    const handlers = this.eventHandlers.get(event);
    if (!handlers) {
      return;
    }

    const index = handlers.findIndex(h => h.handler === handler);
    if (index !== -1) {
      handlers.splice(index, 1);
    }

    // Remove event if no handlers remain
    if (handlers.length === 0) {
      this.eventHandlers.delete(event);
    }
  }

  /**
   * Publish an event
   */
  publish(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler.handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }

    // Record event in history
    const eventMessage: EventMessage = {
      event,
      data,
      timestamp: new Date().toISOString(),
      source: 'plugin'
    };

    this.eventHistory.push(eventMessage);

    // Maintain history size
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  /**
   * Publish event with target
   */
  publishToTarget(event: string, data: any, target: string): void {
    const eventMessage: EventMessage = {
      event,
      data,
      timestamp: new Date().toISOString(),
      source: 'plugin',
      target
    };

    this.eventHistory.push(eventMessage);

    // Find handlers for this specific target
    const targetEvent = `${event}:${target}`;
    const handlers = this.eventHandlers.get(targetEvent);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler.handler(data);
        } catch (error) {
          console.error(`Error in targeted event handler for ${targetEvent}:`, error);
        }
      });
    }
  }

  /**
   * Get event statistics
   */
  getEventStats(): {
    totalEvents: number;
    totalHandlers: number;
    eventsByType: Record<string, number>;
    recentEvents: EventMessage[];
  } {
    const eventsByType: Record<string, number> = {};
    let totalHandlers = 0;

    for (const [event, handlers] of this.eventHandlers) {
      eventsByType[event] = handlers.length;
      totalHandlers += handlers.length;
    }

    const recentEvents = this.eventHistory.slice(-10);

    return {
      totalEvents: this.eventHistory.length,
      totalHandlers,
      eventsByType,
      recentEvents
    };
  }

  /**
   * Get event history
   */
  getEventHistory(filter?: {
    event?: string;
    source?: string;
    target?: string;
    since?: string;
    limit?: number;
  }): EventMessage[] {
    let filtered = this.eventHistory;

    if (filter?.event) {
      filtered = filtered.filter(msg => msg.event === filter.event);
    }

    if (filter?.source) {
      filtered = filtered.filter(msg => msg.source === filter.source);
    }

    if (filter?.target) {
      filtered = filtered.filter(msg => msg.target === filter.target);
    }

    if (filter?.since) {
      filtered = filtered.filter(msg => msg.timestamp >= filter.since!);
    }

    if (filter?.limit) {
      filtered = filtered.slice(-filter.limit);
    }

    return filtered;
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Get active event subscriptions
   */
  getActiveSubscriptions(): Array<{
    event: string;
    handlerCount: number;
    lastSubscribed: string;
  }> {
    const subscriptions: Array<{
      event: string;
      handlerCount: number;
      lastSubscribed: string;
    }> = [];

    for (const [event, handlers] of this.eventHandlers) {
      if (handlers.length > 0) {
        const lastSubscribed = handlers
          .map(h => h.timestamp)
          .sort()
          .pop()!;

        subscriptions.push({
          event,
          handlerCount: handlers.length,
          lastSubscribed
        });
      }
    }

    return subscriptions;
  }

  /**
   * Remove all event handlers
   */
  clearAllHandlers(): void {
    this.eventHandlers.clear();
  }

  /**
   * Generate unique handler ID
   */
  private generateHandlerId(): string {
    return `handler_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
} 