/**
 * Plugin Communication Layer
 * 
 * Exports all communication components for plugins
 */

export { PluginContextImpl } from './plugin-context.js';
export { PluginStorageImpl } from './plugin-storage.js';
export { PluginPermissionsImpl } from './plugin-permissions.js';
export { PluginEventsImpl } from './plugin-events.js';
export { PluginAPIsImpl } from './plugin-apis.js';
export { PluginCommunicationManager } from './communication-manager.js';

export type { 
  PermissionRequest
} from './plugin-permissions.js';

export type { 
  EventHandler,
  EventMessage
} from './plugin-events.js';

export type { 
  DIDAPI,
  CredentialAPI,
  KeyAPI,
  StorageAPI,
  NetworkAPI
} from './plugin-apis.js';

export type {
  CommunicationChannel,
  Message
} from './communication-manager.js'; 