/**
 * Package Signer Types
 * 
 * Types for signing and publishing the open-verifiable-id-sdk package with its own DID
 */

export interface PackageSigningOptions {
  /** Package version to sign */
  version: string;
  /** Package DID (from package.json) */
  packageDID: string;
  /** Whether to create and publish universal credential */
  createUniversalCredential?: boolean;
  /** Whether to publish to DLR */
  publishToDLR?: boolean;
  /** Whether to publish to npm */
  publishToNPM?: boolean;
  /** Custom signing key */
  signingKey?: string;
  /** Status list DID for credential status */
  statusListDID?: string;
}

export interface PackageSignature {
  /** Package name */
  name: string;
  /** Package version */
  version: string;
  /** Package DID */
  did: string;
  /** Signature timestamp */
  signedAt: string;
  /** Bundle hash */
  bundleHash: string;
  /** Git commits */
  commits: string[];
  /** Universal credential URL (if created) */
  universalCredentialUrl?: string;
  /** DLR resource URL (if published) */
  dlrResourceUrl?: string;
  /** NPM publication status (if published) */
  npmPublished?: boolean;
}

export interface PackageSigningResult {
  /** Whether signing was successful */
  success: boolean;
  /** Package signature */
  signature?: PackageSignature;
  /** Universal credential (if created) */
  universalCredential?: any;
  /** Errors */
  errors: string[];
  /** Warnings */
  warnings: string[];
}

export interface PackageVerificationOptions {
  /** Package version to verify */
  version: string;
  /** Package DID to verify against */
  packageDID: string;
  /** Whether to verify universal credential */
  verifyUniversalCredential?: boolean;
  /** Whether to verify DLR publication */
  verifyDLRPublication?: boolean;
  /** Whether to verify npm publication */
  verifyNPMPublication?: boolean;
}

export interface PackageVerificationResult {
  /** Whether verification was successful */
  isValid: boolean;
  /** Verification details */
  details: {
    signatureValid: boolean;
    didValid: boolean;
    versionValid: boolean;
    universalCredentialValid: boolean;
    dlrPublicationValid: boolean;
    npmPublicationValid: boolean;
  };
  /** Errors */
  errors: string[];
  /** Warnings */
  warnings: string[];
  /** Package signature */
  signature?: PackageSignature;
}

export interface PackageSigner {
  /** Sign the package */
  signPackage(options: PackageSigningOptions): Promise<PackageSigningResult>;
  /** Verify package signature */
  verifyPackage(options: PackageVerificationOptions): Promise<PackageVerificationResult>;
  /** Get package signature */
  getPackageSignature(version: string): Promise<PackageSignature | null>;
  /** Publish package to npm */
  publishToNPM(version: string): Promise<boolean>;
  /** Get package metadata */
  getPackageMetadata(): Promise<{
    name: string;
    version: string;
    did: string;
    description: string;
    author: string;
    license: string;
  }>;
} 