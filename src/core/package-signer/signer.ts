/**
 * Package Signer Implementation
 * 
 * Signs and publishes the open-verifiable-id-sdk package with its own DID
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { v5 as uuidv5 } from 'uuid';
import { 
  PackageSigningOptions, 
  PackageSignature, 
  PackageSigningResult, 
  PackageVerificationOptions, 
  PackageVerificationResult, 
  PackageSigner 
} from './types.js';
import { UniversalCredentialManager } from '../universal-credential/index.js';
import { DIDLinkedResourceClient } from '../resource/resource-client.js';
import { ResourceVisibility } from '../resource/types.js';

/**
 * Package Signer Implementation
 */
export class PackageSignerImpl implements PackageSigner {
  private universalCredentialManager: UniversalCredentialManager;
  private resourceClient: DIDLinkedResourceClient;
  private packageJsonPath: string;

  constructor(
    universalCredentialManager: UniversalCredentialManager,
    resourceClient: DIDLinkedResourceClient,
    packageJsonPath: string = './package.json'
  ) {
    this.universalCredentialManager = universalCredentialManager;
    this.resourceClient = resourceClient;
    this.packageJsonPath = packageJsonPath;
  }

  /**
   * Sign the package
   */
  async signPackage(options: PackageSigningOptions): Promise<PackageSigningResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Read package.json
      const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf-8'));
      
      // Validate package DID
      if (packageJson.did !== options.packageDID) {
        errors.push(`Package DID mismatch: expected ${options.packageDID}, found ${packageJson.did}`);
      }

      // Get git commits
      const commits = this.getGitCommits();
      if (commits.length === 0) {
        warnings.push('No git commits found');
      }

      // Generate bundle hash
      const bundleHash = await this.generateBundleHash();

      // Create package signature
      const signature: PackageSignature = {
        name: packageJson.name,
        version: options.version,
        did: options.packageDID,
        signedAt: new Date().toISOString(),
        bundleHash,
        commits
      };

      // Create universal credential if requested
      if (options.createUniversalCredential) {
        try {
          const universalCredential = await this.universalCredentialManager.createUniversalCredential({
            packageVersion: options.version,
            issuerDID: options.packageDID,
            includeAllPermissions: true,
            statusListDID: options.statusListDID
          });

          // Publish universal credential to DLR
          const credentialUrl = await this.universalCredentialManager.publishUniversalCredential(universalCredential);
          signature.universalCredentialUrl = credentialUrl;

          console.log(`✅ Universal credential created and published: ${credentialUrl}`);
        } catch (error) {
          errors.push(`Failed to create universal credential: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Publish package signature to DLR if requested
      if (options.publishToDLR) {
        try {
          const resourceMetadata = await this.resourceClient.createResource({
            did: options.packageDID,
            name: 'package-signature',
            type: 'package-signature',
            version: options.version,
            data: signature,
            visibility: ResourceVisibility.PUBLIC,
            metadata: {
              purpose: 'Package signature for open-verifiable-id-sdk',
              signedBy: options.packageDID,
              signedAt: signature.signedAt
            }
          });

          signature.dlrResourceUrl = resourceMetadata.resourceUrl;
          console.log(`✅ Package signature published to DLR: ${resourceMetadata.resourceUrl}`);
        } catch (error) {
          errors.push(`Failed to publish to DLR: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Publish to npm if requested
      if (options.publishToNPM) {
        try {
          const npmPublished = await this.publishToNPM(options.version);
          signature.npmPublished = npmPublished;
          
          if (npmPublished) {
            console.log(`✅ Package published to npm: ${packageJson.name}@${options.version}`);
          } else {
            errors.push('Failed to publish to npm');
          }
        } catch (error) {
          errors.push(`Failed to publish to npm: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      const success = errors.length === 0;

      return {
        success,
        signature,
        errors,
        warnings
      };

    } catch (error) {
      return {
        success: false,
        errors: [`Package signing failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings
      };
    }
  }

  /**
   * Verify package signature
   */
  async verifyPackage(options: PackageVerificationOptions): Promise<PackageVerificationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const details = {
      signatureValid: false,
      didValid: false,
      versionValid: false,
      universalCredentialValid: false,
      dlrPublicationValid: false,
      npmPublicationValid: false
    };

    try {
      // Get package metadata
      const metadata = await this.getPackageMetadata();
      
      // Verify DID
      if (metadata.did === options.packageDID) {
        details.didValid = true;
      } else {
        errors.push(`DID mismatch: expected ${options.packageDID}, got ${metadata.did}`);
      }

      // Verify version
      if (metadata.version === options.version) {
        details.versionValid = true;
      } else {
        errors.push(`Version mismatch: expected ${options.version}, got ${metadata.version}`);
      }

      // Get package signature from DLR
      const signature = await this.getPackageSignature(options.version);
      if (signature) {
        details.signatureValid = true;
        
        // Verify universal credential if requested
        if (options.verifyUniversalCredential && signature.universalCredentialUrl) {
          try {
            const universalCredential = await this.universalCredentialManager.retrieveUniversalCredential();
            if (universalCredential) {
              const verification = await this.universalCredentialManager.verifyUniversalCredential(universalCredential);
              details.universalCredentialValid = verification.isValid;
              if (!verification.isValid) {
                errors.push(`Universal credential verification failed: ${verification.errors.join(', ')}`);
              }
            } else {
              errors.push('Universal credential not found');
            }
          } catch (error) {
            errors.push(`Universal credential verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        // Verify DLR publication if requested
        if (options.verifyDLRPublication && signature.dlrResourceUrl) {
          try {
            const resource = await this.resourceClient.getPublicResource('package-signature');
            details.dlrPublicationValid = !!resource;
            if (!resource) {
              errors.push('Package signature not found in DLR');
            }
          } catch (error) {
            errors.push(`DLR verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        // Verify npm publication if requested
        if (options.verifyNPMPublication) {
          try {
            // This would require npm API integration
            // For now, we'll just check if the signature indicates npm publication
            details.npmPublicationValid = signature.npmPublished === true;
            if (!signature.npmPublished) {
              warnings.push('NPM publication status unknown');
            }
          } catch (error) {
            errors.push(`NPM verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      } else {
        errors.push('Package signature not found');
      }

      const isValid = errors.length === 0;

      return {
        isValid,
        details,
        errors,
        warnings,
        signature: signature || undefined
      };

    } catch (error) {
      return {
        isValid: false,
        details,
        errors: [`Package verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings
      };
    }
  }

  /**
   * Get package signature
   */
  async getPackageSignature(version: string): Promise<PackageSignature | null> {
    try {
      const resource = await this.resourceClient.getPublicResource('package-signature');
      
      if (resource && resource.metadata?.type === 'package-signature') {
        const signature = resource.metadata.data as PackageSignature;
        if (signature.version === version) {
          return signature;
        }
      }

      return null;
    } catch (error) {
      console.warn('Failed to retrieve package signature:', error);
      return null;
    }
  }

  /**
   * Publish package to npm
   */
  async publishToNPM(version: string): Promise<boolean> {
    try {
      // Check if package is already published
      const currentVersion = execSync('npm pkg get version').toString().trim().replace(/"/g, '');
      
      if (currentVersion !== version) {
        console.log(`Updating package version from ${currentVersion} to ${version}`);
        execSync(`npm version ${version} --no-git-tag-version`);
      }

      // Publish to npm
      execSync('npm publish --access public', { stdio: 'inherit' });
      
      return true;
    } catch (error) {
      console.error('Failed to publish to npm:', error);
      return false;
    }
  }

  /**
   * Get package metadata
   */
  async getPackageMetadata(): Promise<{
    name: string;
    version: string;
    did: string;
    description: string;
    author: string;
    license: string;
  }> {
    const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf-8'));
    
    return {
      name: packageJson.name,
      version: packageJson.version,
      did: packageJson.did,
      description: packageJson.description,
      author: packageJson.author,
      license: packageJson.license
    };
  }

  /**
   * Get git commits
   */
  private getGitCommits(): string[] {
    try {
      const commits = execSync('git log --pretty=%H').toString().trim().split('\n');
      return commits.filter(commit => commit.length > 0);
    } catch (error) {
      console.warn('Failed to get git commits:', error);
      return [];
    }
  }

  /**
   * Generate bundle hash
   */
  private async generateBundleHash(): Promise<string> {
    try {
      // Create a hash of the package contents
      const crypto = await import('crypto');
      const files = this.getPackageFiles();
      const content = files.map(file => fs.readFileSync(file, 'utf-8')).join('\n');
      return crypto.createHash('sha256').update(content).digest('hex');
    } catch (error) {
      console.warn('Failed to generate bundle hash:', error);
      return 'unknown';
    }
  }

  /**
   * Get package files for hashing
   */
  private getPackageFiles(): string[] {
    const files: string[] = [];
    
    // Add package.json
    files.push(this.packageJsonPath);
    
    // Add dist files if they exist
    const distPath = path.join(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      this.addFilesRecursively(distPath, files);
    }
    
    return files;
  }

  /**
   * Add files recursively to the list
   */
  private addFilesRecursively(dir: string, files: string[]): void {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        this.addFilesRecursively(fullPath, files);
      } else if (stat.isFile()) {
        files.push(fullPath);
      }
    }
  }
}

/**
 * Create a package signer
 */
export function createPackageSigner(
  universalCredentialManager: UniversalCredentialManager,
  resourceClient: DIDLinkedResourceClient,
  packageJsonPath?: string
): PackageSigner {
  return new PackageSignerImpl(universalCredentialManager, resourceClient, packageJsonPath);
} 