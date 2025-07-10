/**
 * Universal Credential Types
 * 
 * Types for the universal credential system that allows anyone to run the open-verifiable-id-sdk
 * This credential never expires and is issued by the package's own DID
 */

export interface UniversalCredentialPayload {
  /** Unique identifier for the credential */
  id: string;
  /** Type of credential */
  type: ['VerifiableCredential', 'UniversalAccessCredential'];
  /** Issuer DID (the package's own DID) */
  issuer: string;
  /** Subject (always the universal access subject) */
  subject: {
    id: 'did:universal:open-verifiable:access';
    type: 'UniversalAccessSubject';
    /** What this credential grants access to */
    grantedAccess: {
      sdk: 'open-verifiable-id-sdk';
      version: string;
      permissions: UniversalPermission[];
      scope: 'universal';
    };
    /** Credential metadata */
    metadata: {
      purpose: 'Universal access to Open Verifiable ID SDK';
      description: 'This credential grants universal access to run the open-verifiable-id-sdk';
      issuedFor: 'Open Verifiable Community';
      neverExpires: true;
    };
  };
  /** Issue date */
  issuanceDate: string;
  /** No expiration date - this credential never expires */
  expirationDate?: never;
  /** Credential status (always active) */
  credentialStatus?: {
    id: string;
    type: 'CredentialStatusList2021';
    statusListIndex: '0';
    statusListCredential: string;
  };
  /** Proof of the credential */
  proof?: any;
}

export type UniversalPermission = 
  | 'sdk:execute'
  | 'sdk:create-did'
  | 'sdk:issue-credential'
  | 'sdk:verify-credential'
  | 'sdk:manage-keys'
  | 'sdk:access-storage'
  | 'sdk:use-plugins'
  | 'sdk:network-access'
  | 'sdk:carbon-tracking'
  | 'sdk:trust-registry'
  | 'sdk:schema-registry';

export interface UniversalCredentialVerificationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  credential: UniversalCredentialPayload | null;
  verificationDetails: {
    signatureValid: boolean;
    issuerValid: boolean;
    notExpired: boolean;
    permissionsValid: boolean;
    statusValid: boolean;
  };
}

export interface UniversalCredentialOptions {
  /** Package version to include in the credential */
  packageVersion: string;
  /** Issuer DID (package's own DID) */
  issuerDID: string;
  /** Whether to include all permissions */
  includeAllPermissions?: boolean;
  /** Custom permissions to include */
  customPermissions?: UniversalPermission[];
  /** Status list DID for credential status */
  statusListDID?: string;
}

export interface UniversalCredentialManager {
  /** Create the universal credential */
  createUniversalCredential(options: UniversalCredentialOptions): Promise<UniversalCredentialPayload>;
  /** Verify a universal credential */
  verifyUniversalCredential(credential: UniversalCredentialPayload): Promise<UniversalCredentialVerificationResult>;
  /** Check if a credential grants a specific permission */
  hasPermission(credential: UniversalCredentialPayload, permission: UniversalPermission): boolean;
  /** Get the default universal credential for this SDK */
  getDefaultUniversalCredential(): UniversalCredentialPayload;
  /** Publish the universal credential as a DLR */
  publishUniversalCredential(credential: UniversalCredentialPayload): Promise<string>;
  /** Retrieve the universal credential from DLR */
  retrieveUniversalCredential(): Promise<UniversalCredentialPayload | null>;
} 