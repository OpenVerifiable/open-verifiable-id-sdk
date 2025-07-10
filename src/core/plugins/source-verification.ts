/**
 * Source Verification System
 * 
 * Implements the pattern from ov-id-sdk for verifiable plugins:
 * - Source-derived DID:key generation
 * - Pre-publish verification with blockchain credentials
 * - DID-Linked Resource verification
 * - Identity aggregation claims validation
 */

import { createHash } from 'crypto';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Source verification result
 */
export interface SourceVerificationResult {
  isValid: boolean;
  sourceHash: string;
  didKey: string;
  blockchainVerified: boolean;
  identityAggregated: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Release metadata for blockchain verification
 */
export interface ReleaseMetadata {
  name: string;
  version: string;
  bundleHash: string;
  commits: string[];
  id: string;
  issuer: string;
  sourceDID: string;
  publishedAt: string;
}

/**
 * Source Verification Engine
 * 
 * Handles the complete source verification workflow:
 * 1. Generate source-derived DID:key
 * 2. Create blockchain credential
 3. Verify against DID-Linked Resources
 * 4. Validate identity aggregation claims
 */
export class SourceVerificationEngine {
  private cheqdClient: any; // Cheqd blockchain client
  private didResolver: any; // DID resolver

  constructor(options?: {
    cheqdClient?: any;
    didResolver?: any;
  }) {
    this.cheqdClient = options?.cheqdClient;
    this.didResolver = options?.didResolver;
  }

  /**
   * Generate source-derived DID:key from plugin source files
   */
  async generateSourceDID(pluginPath: string): Promise<{
    sourceHash: string;
    didKey: string;
    bundleHash: string;
  }> {
    try {
      // 1. Generate bundle hash from source files
      const bundleHash = await this.generateBundleHash(pluginPath);
      
      // 2. Generate source hash (includes package.json, source files, etc.)
      const sourceHash = await this.generateSourceHash(pluginPath);
      
      // 3. Derive DID:key from source hash
      const didKey = this.deriveDIDFromSource(sourceHash);
      
      return {
        sourceHash,
        didKey,
        bundleHash
      };
    } catch (error) {
      throw new Error(`Failed to generate source DID: ${error}`);
    }
  }

  /**
   * Create release metadata credential for blockchain
   */
  async createReleaseCredential(
    pluginPath: string,
    packageDID: string,
    version: string
  ): Promise<ReleaseMetadata> {
    try {
      // 1. Get package.json
      const packageJsonPath = path.join(pluginPath, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      
      // 2. Generate source verification data
      const { sourceHash, didKey, bundleHash } = await this.generateSourceDID(pluginPath);
      
      // 3. Get git commit history
      const commits = this.getGitCommits(pluginPath);
      
      // 4. Create release metadata
      const releaseId = this.generateReleaseId(packageJson.name, version);
      
      const releaseMetadata: ReleaseMetadata = {
        name: packageJson.name,
        version,
        bundleHash,
        commits,
        id: releaseId,
        issuer: packageDID,
        sourceDID: didKey,
        publishedAt: new Date().toISOString()
      };
      
      return releaseMetadata;
    } catch (error) {
      throw new Error(`Failed to create release credential: ${error}`);
    }
  }

  /**
   * Verify plugin source integrity
   */
  async verifyPluginSource(
    pluginId: string,
    pluginPath: string,
    expectedDID: string
  ): Promise<SourceVerificationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      // 1. Generate current source hash
      const { sourceHash, didKey } = await this.generateSourceDID(pluginPath);
      
      // 2. Verify DID:key matches expected
      if (didKey !== expectedDID) {
        errors.push(`Source-derived DID mismatch. Expected: ${expectedDID}, Got: ${didKey}`);
      }
      
      // 3. Verify against blockchain credential
      const blockchainVerified = await this.verifyBlockchainCredential(pluginId, sourceHash);
      if (!blockchainVerified) {
        errors.push('Blockchain credential verification failed');
      }
      
      // 4. Check identity aggregation claims
      const identityAggregated = await this.verifyIdentityAggregation(pluginId);
      if (!identityAggregated) {
        warnings.push('No identity aggregation claims found');
      }
      
      return {
        isValid: errors.length === 0,
        sourceHash,
        didKey,
        blockchainVerified,
        identityAggregated,
        errors,
        warnings
      };
    } catch (error) {
      errors.push(`Source verification failed: ${error}`);
      return {
        isValid: false,
        sourceHash: '',
        didKey: '',
        blockchainVerified: false,
        identityAggregated: false,
        errors,
        warnings
      };
    }
  }

  /**
   * Generate bundle hash from source files
   */
  private async generateBundleHash(pluginPath: string): Promise<string> {
    const files = this.getSourceFiles(pluginPath);
    const hash = createHash('sha256');
    
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      hash.update(content);
    }
    
    return hash.digest('hex');
  }

  /**
   * Generate source hash (includes package.json, git info, etc.)
   */
  private async generateSourceHash(pluginPath: string): Promise<string> {
    const hash = createHash('sha256');
    
    // Include package.json
    const packageJsonPath = path.join(pluginPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = fs.readFileSync(packageJsonPath, 'utf-8');
      hash.update(packageJson);
    }
    
    // Include source files
    const sourceFiles = this.getSourceFiles(pluginPath);
    for (const file of sourceFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      hash.update(content);
    }
    
    // Include git commit hash
    try {
      const gitHash = execSync('git rev-parse HEAD', { cwd: pluginPath }).toString().trim();
      hash.update(gitHash);
    } catch (error) {
      // Git not available, continue without it
    }
    
    return hash.digest('hex');
  }

  /**
   * Derive DID:key from source hash
   */
  private deriveDIDFromSource(sourceHash: string): string {
    // Use the source hash to generate a deterministic DID:key
    const didKey = `did:key:${sourceHash.substring(0, 32)}`;
    return didKey;
  }

  /**
   * Get source files for hashing
   */
  private getSourceFiles(pluginPath: string): string[] {
    const files: string[] = [];
    const extensions = ['.ts', '.js', '.json', '.md'];
    
    const walkDir = (dir: string) => {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          walkDir(fullPath);
        } else if (stat.isFile()) {
          const ext = path.extname(item);
          if (extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    };
    
    walkDir(pluginPath);
    return files.sort();
  }

  /**
   * Get git commit history
   */
  private getGitCommits(pluginPath: string): string[] {
    try {
      const commits = execSync('git log --pretty=%H', { cwd: pluginPath })
        .toString()
        .trim()
        .split('\n')
        .filter(commit => commit.length > 0);
      
      return commits;
    } catch (error) {
      return [];
    }
  }

  /**
   * Generate release ID
   */
  private generateReleaseId(name: string, version: string): string {
    const timestamp = new Date().toISOString();
    const input = `${name}-${version}-${timestamp}`;
    return createHash('sha256').update(input).digest('hex');
  }

  /**
   * Verify blockchain credential
   */
  private async verifyBlockchainCredential(pluginId: string, sourceHash: string): Promise<boolean> {
    try {
      // This would verify the credential exists on the blockchain
      // and the source hash matches
      if (!this.cheqdClient) {
        return false; // No blockchain client available
      }
      
      // Mock implementation - would query blockchain
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Verify identity aggregation claims
   */
  private async verifyIdentityAggregation(pluginId: string): Promise<boolean> {
    try {
      // This would check if the plugin creator has identity aggregation claims
      if (!this.didResolver) {
        return false; // No DID resolver available
      }
      
      // Mock implementation - would check DID document for claims
      return true;
    } catch (error) {
      return false;
    }
  }
} 