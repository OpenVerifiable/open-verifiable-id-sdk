/**
 * Plugin Permissions Implementation
 * 
 * Manages plugin access control and permission requests
 */

import { PluginPermissions } from '../interfaces.js';

export interface PermissionRequest {
  permission: string;
  requestedAt: string;
  grantedAt?: string;
  deniedAt?: string;
  reason?: string;
}

export class PluginPermissionsImpl implements PluginPermissions {
  private grantedPermissions: Set<string> = new Set();
  private permissionRequests: Map<string, PermissionRequest> = new Map();
  private readonly defaultPermissions: string[] = ['read', 'write', 'sign', 'verify'];

  constructor(initialPermissions: string[] = []) {
    // Grant default permissions
    this.defaultPermissions.forEach(permission => {
      this.grantedPermissions.add(permission);
    });

    // Grant additional initial permissions
    initialPermissions.forEach(permission => {
      this.grantedPermissions.add(permission);
    });
  }

  /**
   * Check if plugin has a specific permission
   */
  has(permission: string): boolean {
    return this.grantedPermissions.has(permission);
  }

  /**
   * Request a permission (simplified - always grants for now)
   * In a real implementation, this would prompt the user or check policies
   */
  async request(permission: string): Promise<boolean> {
    // Check if already granted
    if (this.grantedPermissions.has(permission)) {
      return true;
    }

    // Create permission request
    const request: PermissionRequest = {
      permission,
      requestedAt: new Date().toISOString()
    };

    this.permissionRequests.set(permission, request);

    // For now, auto-grant most permissions
    // In a real implementation, this would check security policies
    const autoGrantPermissions = [
      'read', 'write', 'sign', 'verify', 'network', 'storage'
    ];

    if (autoGrantPermissions.includes(permission)) {
      this.grantPermission(permission, 'Auto-granted');
      return true;
    }

    // For sensitive permissions, deny by default
    const sensitivePermissions = [
      'admin', 'system', 'hardware', 'biometric'
    ];

    if (sensitivePermissions.includes(permission)) {
      this.denyPermission(permission, 'Sensitive permission denied');
      return false;
    }

    // For unknown permissions, deny by default
    this.denyPermission(permission, 'Unknown permission');
    return false;
  }

  /**
   * List all granted permissions
   */
  list(): string[] {
    return Array.from(this.grantedPermissions);
  }

  /**
   * Grant a permission
   */
  grantPermission(permission: string, reason: string = 'Manually granted'): void {
    this.grantedPermissions.add(permission);
    
    const request = this.permissionRequests.get(permission);
    if (request) {
      request.grantedAt = new Date().toISOString();
      request.reason = reason;
    }
  }

  /**
   * Deny a permission
   */
  denyPermission(permission: string, reason: string = 'Permission denied'): void {
    let request = this.permissionRequests.get(permission);
    if (!request) {
      // Create a new request if one doesn't exist
      request = {
        permission,
        requestedAt: new Date().toISOString()
      };
      this.permissionRequests.set(permission, request);
    }
    
    request.deniedAt = new Date().toISOString();
    request.reason = reason;
  }

  /**
   * Revoke a permission
   */
  revokePermission(permission: string): boolean {
    if (this.defaultPermissions.includes(permission)) {
      // Cannot revoke default permissions
      return false;
    }

    return this.grantedPermissions.delete(permission);
  }

  /**
   * Get permission request history
   */
  getPermissionHistory(): PermissionRequest[] {
    return Array.from(this.permissionRequests.values());
  }

  /**
   * Check if all required permissions are granted
   */
  hasAllPermissions(permissions: string[]): boolean {
    return permissions.every(permission => this.has(permission));
  }

  /**
   * Get permission statistics
   */
  getStats(): {
    totalGranted: number;
    totalRequested: number;
    totalDenied: number;
    pendingRequests: number;
  } {
    const totalRequested = this.permissionRequests.size;
    const totalGranted = Array.from(this.permissionRequests.values())
      .filter(req => req.grantedAt).length;
    const totalDenied = Array.from(this.permissionRequests.values())
      .filter(req => req.deniedAt).length;
    const pendingRequests = totalRequested - totalGranted - totalDenied;

    return {
      totalGranted: this.grantedPermissions.size,
      totalRequested,
      totalDenied,
      pendingRequests
    };
  }

  /**
   * Reset permissions to defaults
   */
  resetToDefaults(): void {
    this.grantedPermissions.clear();
    this.defaultPermissions.forEach(permission => {
      this.grantedPermissions.add(permission);
    });
  }

  /**
   * Export permission configuration
   */
  exportPermissions(): {
    granted: string[];
    requests: PermissionRequest[];
    stats: {
      totalGranted: number;
      totalRequested: number;
      totalDenied: number;
      pendingRequests: number;
    };
  } {
    return {
      granted: this.list(),
      requests: this.getPermissionHistory(),
      stats: this.getStats()
    };
  }
} 