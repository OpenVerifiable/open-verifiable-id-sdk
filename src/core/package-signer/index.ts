/**
 * Package Signer Module
 * 
 * Provides functionality to sign and publish npm packages with their own DID,
 * including universal credential creation and DID-linked resource publication.
 */

export * from './types.js';
export * from './signer.js';

import { PackageSignerImpl } from './signer.js';
import type { PackageSigner } from './types.js';
import { UniversalCredentialManager } from '../universal-credential/index.js';
import { DIDLinkedResourceClient } from '../resource/index.js';

/**
 * Create a package signer instance
 * 
 * @param universalCredentialManager - Universal credential manager instance
 * @param resourceClient - DID-linked resource client instance
 * @param packageJsonPath - Path to package.json (default: './package.json')
 * @returns Package signer instance
 */
export function createPackageSigner(
  universalCredentialManager: UniversalCredentialManager,
  resourceClient: DIDLinkedResourceClient,
  packageJsonPath: string = './package.json'
): PackageSigner {
  return new PackageSignerImpl(universalCredentialManager, resourceClient, packageJsonPath);
}

/**
 * Convenience function to create a complete package signing workflow
 * 
 * @param packageJsonPath - Path to package.json (default: './package.json')
 * @param options - Additional options for resource client
 * @returns Promise resolving to package signer instance
 */
export async function createPackageSignerFromConfig(
  packageJsonPath: string = './package.json',
  options?: {
    resourceClientOptions?: any;
    universalCredentialOptions?: any;
  }
): Promise<PackageSigner> {
  // Import required modules
  const { createDIDLinkedResourceClient } = await import('../resource/index.js');
  const { createUniversalCredentialManager } = await import('../universal-credential/index.js');
  const fs = await import('fs');
  const path = await import('path');

  // Read package.json
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  
  // Extract DID from package.json
  const packageDID = packageJson.did;
  if (!packageDID) {
    throw new Error('Package DID not found in package.json. Please add a "did" field.');
  }

  // Create resource client
  const resourceClient = createDIDLinkedResourceClient(options?.resourceClientOptions);

  // Create universal credential manager
  const universalCredentialManager = createUniversalCredentialManager(
    resourceClient,
    packageDID,
    packageJson.version
  );

  // Create and return package signer
  return createPackageSigner(universalCredentialManager, resourceClient, packageJsonPath);
} 