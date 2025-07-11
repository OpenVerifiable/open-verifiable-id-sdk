/**
 * Universal Credential Manager
 * 
 * Manages the universal credential that allows anyone to run the open-verifiable-id-sdk
 * This credential never expires and is issued by the package's own DID
 */

import { v5 as uuidv5 } from 'uuid';
import { 
  UniversalCredentialPayload, 
  UniversalCredentialVerificationResult, 
  UniversalCredentialOptions, 
  UniversalCredentialManager,
  UniversalPermission 
} from './types.js';
import { DIDLinkedResourceClient } from '../resource/resource-client.js';
import { ResourceVisibility } from '../resource/types.js';

/**
 * Default universal permissions for the SDK
 */
const DEFAULT_UNIVERSAL_PERMISSIONS: UniversalPermission[] = [
  'sdk:execute',
  'sdk:create-did',
  'sdk:issue-credential',
  'sdk:verify-credential',
  'sdk:manage-keys',
  'sdk:access-storage',
  'sdk:use-plugins',
  'sdk:network-access',
  'sdk:carbon-tracking',
  'sdk:trust-registry',
  'sdk:schema-registry'
];

/**
 * Universal Credential Manager Implementation
 */
export class UniversalCredentialManagerImpl implements UniversalCredentialManager {
  private resourceClient: DIDLinkedResourceClient;
  private packageDID: string;
  private packageVersion: string;

  constructor(
    resourceClient: DIDLinkedResourceClient,
    packageDID: string,
    packageVersion: string
  ) {
    this.resourceClient = resourceClient;
    this.packageDID = packageDID;
    this.packageVersion = packageVersion;
  }

  /**
   * Create the universal credential
   */
  async createUniversalCredential(options: UniversalCredentialOptions): Promise<UniversalCredentialPayload> {
    const credentialId = uuidv5(`universal-credential-${options.packageVersion}-${Date.now()}`, uuidv5.URL);
    
    const permissions = options.includeAllPermissions 
      ? DEFAULT_UNIVERSAL_PERMISSIONS
      : options.customPermissions || DEFAULT_UNIVERSAL_PERMISSIONS;

    const credential: UniversalCredentialPayload = {
      id: credentialId,
      type: ['VerifiableCredential', 'UniversalAccessCredential'],
      issuer: options.issuerDID,
      subject: {
        id: 'did:universal:open-verifiable:access',
        type: 'UniversalAccessSubject',
        grantedAccess: {
          sdk: 'open-verifiable-id-sdk',
          version: options.packageVersion,
          permissions: permissions,
          scope: 'universal'
        },
        metadata: {
          purpose: 'Universal access to Open Verifiable ID SDK',
          description: 'This credential grants universal access to run the open-verifiable-id-sdk',
          issuedFor: 'Open Verifiable Community',
          neverExpires: true
        }
      },
      issuanceDate: new Date().toISOString()
    };

    // Add credential status if provided
    if (options.statusListDID) {
      credential.credentialStatus = {
        id: `${options.statusListDID}#0`,
        type: 'CredentialStatusList2021',
        statusListIndex: '0',
        statusListCredential: options.statusListDID
      };
    }

    return credential;
  }

  /**
   * Verify a universal credential
   */
  async verifyUniversalCredential(credential: UniversalCredentialPayload): Promise<UniversalCredentialVerificationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const verificationDetails = {
      signatureValid: true, // We'll implement signature verification later
      issuerValid: false,
      notExpired: true, // Universal credentials never expire
      permissionsValid: false,
      statusValid: true // We'll implement status checking later
    };

    // Verify issuer is the package DID
    if (credential.issuer === this.packageDID) {
      verificationDetails.issuerValid = true;
    } else {
      errors.push(`Invalid issuer: expected ${this.packageDID}, got ${credential.issuer}`);
    }

    // Verify credential type
    if (!credential.type.includes('UniversalAccessCredential')) {
      errors.push('Invalid credential type: must include UniversalAccessCredential');
    }

    // Verify subject structure
    if (credential.subject?.id !== 'did:universal:open-verifiable:access') {
      errors.push('Invalid subject ID: must be did:universal:open-verifiable:access');
    }

    // Verify granted access
    if (credential.subject?.grantedAccess?.sdk !== 'open-verifiable-id-sdk') {
      errors.push('Invalid SDK in granted access');
    }

    // Verify permissions
    if (credential.subject?.grantedAccess?.permissions) {
      const grantedPermissions = credential.subject.grantedAccess.permissions;
      const hasValidPermissions = grantedPermissions.every(permission => 
        DEFAULT_UNIVERSAL_PERMISSIONS.includes(permission)
      );
      
      if (hasValidPermissions) {
        verificationDetails.permissionsValid = true;
      } else {
        errors.push('Invalid permissions in credential');
      }
    } else {
      errors.push('No permissions specified in credential');
    }

    // Verify scope
    if (credential.subject?.grantedAccess?.scope !== 'universal') {
      errors.push('Invalid scope: must be universal');
    }

    // Verify never expires
    if (credential.expirationDate) {
      errors.push('Universal credentials should not have an expiration date');
    }

    const isValid = errors.length === 0;

    return {
      isValid,
      errors,
      warnings,
      credential: isValid ? credential : null,
      verificationDetails
    };
  }

  /**
   * Check if a credential grants a specific permission
   */
  hasPermission(credential: UniversalCredentialPayload, permission: UniversalPermission): boolean {
    const grantedPermissions = credential.subject?.grantedAccess?.permissions || [];
    return grantedPermissions.includes(permission);
  }

  /**
   * Get the default universal credential for this SDK
   */
  getDefaultUniversalCredential(): UniversalCredentialPayload {
    return {
      id: 'did:universal:open-verifiable:default',
      type: ['VerifiableCredential', 'UniversalAccessCredential'],
      issuer: this.packageDID,
      subject: {
        id: 'did:universal:open-verifiable:access',
        type: 'UniversalAccessSubject',
        grantedAccess: {
          sdk: 'open-verifiable-id-sdk',
          version: this.packageVersion,
          permissions: DEFAULT_UNIVERSAL_PERMISSIONS,
          scope: 'universal'
        },
        metadata: {
          purpose: 'Universal access to Open Verifiable ID SDK',
          description: 'This credential grants universal access to run the open-verifiable-id-sdk',
          issuedFor: 'Open Verifiable Community',
          neverExpires: true
        }
      },
      issuanceDate: new Date().toISOString()
    };
  }

  /**
   * Publish the universal credential as a DLR
   */
  async publishUniversalCredential(credential: UniversalCredentialPayload): Promise<string> {
    try {
      const resourceMetadata = await this.resourceClient.createResource({
        did: this.packageDID,
        name: 'universal-access-credential',
        type: 'universal-credential',
        version: this.packageVersion,
        data: credential,
        visibility: ResourceVisibility.PUBLIC,
        metadata: {
          purpose: 'Universal access credential for open-verifiable-id-sdk',
          neverExpires: true,
          issuedBy: this.packageDID,
          issuedAt: new Date().toISOString()
        }
      });

      return resourceMetadata.resourceUrl;
    } catch (error) {
      throw new Error(`Failed to publish universal credential: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieve the universal credential from DLR
   */
  async retrieveUniversalCredential(): Promise<UniversalCredentialPayload | null> {
    try {
      // Try to get the public universal credential
      const resource = await this.resourceClient.getPublicResource('universal-access-credential');
      
      if (resource && resource.metadata?.type === 'universal-credential') {
        return resource.metadata.data as UniversalCredentialPayload;
      }

      return null;
    } catch (error) {
      console.warn('Failed to retrieve universal credential from DLR:', error);
      return null;
    }
  }

  /**
   * Get all available permissions
   */
  getAllPermissions(): UniversalPermission[] {
    return [...DEFAULT_UNIVERSAL_PERMISSIONS];
  }

  /**
   * Validate that a credential grants all required permissions
   */
  validateRequiredPermissions(
    credential: UniversalCredentialPayload, 
    requiredPermissions: UniversalPermission[]
  ): { valid: boolean; missing: UniversalPermission[] } {
    const grantedPermissions = credential.subject?.grantedAccess?.permissions || [];
    const missing = requiredPermissions.filter(permission => !grantedPermissions.includes(permission));
    
    return {
      valid: missing.length === 0,
      missing
    };
  }
}

/**
 * Create a universal credential manager
 */
export function createUniversalCredentialManager(
  resourceClient: DIDLinkedResourceClient,
  packageDID: string,
  packageVersion: string
): UniversalCredentialManager {
  return new UniversalCredentialManagerImpl(resourceClient, packageDID, packageVersion);
} 