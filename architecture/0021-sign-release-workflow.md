---
ADR: 0021
Title: Sign-Release Workflow for Package Provenance and Integrity
Date: 2025-01-14
Status: Proposed
Priority: MVP
Principles: [creator_first, proof_first_trust, security_first, resilience_by_design, community_collaboration]
Related_ADRs: [0017, 0019, 0020]
BusinessImpact: >-
  - Enables verifiable package provenance and supply chain security
  - Provides cryptographic proof of package integrity and authenticity
  - Supports software distribution security and trust verification
  - Enables compliance with software supply chain security requirements
Runbook: |
  1. Initialize package agent: `./scripts/init-package-agent.sh {packageName} {version}`
  2. Hash package files: `./scripts/hash-package-files.sh {packagePath}`
  3. Create package DID: `./scripts/create-package-did.sh {hash} {packageName}`
  4. Sign release: `./scripts/sign-release.sh {packageName} {version} {parentDID}`
  5. Publish credential: `./scripts/publish-credential.sh {credential} {parentDID}`
  6. Verify package: `./scripts/verify-package.sh {packagePath} {credential}`
---

## Context

Software package distribution requires verifiable provenance and integrity to ensure security and trust in the software supply chain. The Open Verifiable ID SDK must support a sign-release workflow where package files are hashed, a DID is created from the hash, a credential is issued and linked as a resource on a parent agent's DID, and this credential is published before the npm package is released. This creates cryptographic proof that the package was published by the authorized DID and that the files haven't been tampered with.

## Requirements

### Must
- Hash all files in a package to create a unique identifier
- Create a did:key from the package hash
- Issue a verifiable credential signed by the package DID
- Link the credential as a resource on the parent agent's DID
- Publish the credential before the npm package release
- Verify package integrity using the published credential

### Should
- Support multiple package formats (npm, pip, cargo, etc.)
- Enable batch signing of multiple packages
- Provide package verification tools and APIs
- Support package revocation and updates
- Enable integration with CI/CD pipelines

### Could
- Support package dependency verification
- Enable package reputation and trust scoring
- Provide package analytics and usage tracking
- Support package federation and distribution

## Decision

### 1. Package Agent Sign-Release Workflow

The PackageAgent implements the sign-release workflow with comprehensive file hashing and credential issuance:

#### Package Agent Implementation
```typescript
export class PackageAgent extends BaseAgent {
  private packageInfo: { name: string; version: string; };

  constructor(packageName: string, packageVersion: string, encryptionKey?: string) {
    super(`package-${packageName}`, AgentType.PACKAGE, encryptionKey);
    this.packageInfo = { name: packageName, version: packageVersion };
  }

  async signRelease(packagePath: string, parentDID: string): Promise<SignReleaseResult> {
    try {
      // Step 1: Hash all package files
      const packageHash = await this.hashPackageFiles(packagePath);
      
      // Step 2: Create package DID from hash
      const packageDID = await this.createPackageDID(packageHash);
      
      // Step 3: Create and sign release credential
      const credential = await this.createReleaseCredential(packageHash, parentDID);
      
      // Step 4: Link credential to parent DID
      await this.linkCredentialToParent(credential, parentDID);
      
      // Step 5: Publish credential
      await this.publishCredential(credential);
      
      return {
        packageHash,
        packageDID,
        credential,
        parentDID,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Sign-release failed: ${error.message}`);
    }
  }

  private async hashPackageFiles(packagePath: string): Promise<string> {
    const files = await this.getAllPackageFiles(packagePath);
    const hashes = await Promise.all(
      files.map(file => this.hashFile(file))
    );
    
    // Create a Merkle tree or combined hash
    return this.combineHashes(hashes);
  }

  private async createPackageDID(packageHash: string): Promise<string> {
    // Create a did:key from the package hash
    const keyPair = await this.generateKeyPairFromHash(packageHash);
    const did = `did:key:${this.encodePublicKey(keyPair.publicKey)}`;
    
    // Store the private key securely
    await this.secureStorage.storeKey(`${did}#key-1`, keyPair.privateKey);
    
    return did;
  }

  private async createReleaseCredential(packageHash: string, parentDID: string): Promise<VerifiableCredential_2_0> {
    const template: CredentialTemplate = {
      type: ['VerifiableCredential', 'PackageReleaseCredential'],
      credentialSubject: {
        id: this.agentId,
        packageName: this.packageInfo.name,
        packageVersion: this.packageInfo.version,
        packageHash,
        parentDID,
        releaseDate: new Date().toISOString(),
        fileCount: await this.getPackageFileCount(),
        totalSize: await this.getPackageTotalSize()
      },
      issuer: await this.getPackageDID(packageHash),
      validFrom: new Date().toISOString(),
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year
    };

    return await this.issueCredential(template);
  }
}
```

### 2. File Hashing and Integrity Verification

#### Comprehensive File Hashing
```typescript
export class PackageHasher {
  static async hashPackageFiles(packagePath: string): Promise<PackageHashResult> {
    const files = await this.getAllPackageFiles(packagePath);
    const fileHashes: FileHash[] = [];
    
    for (const file of files) {
      const hash = await this.hashFile(file);
      fileHashes.push({
        path: file,
        hash,
        size: await this.getFileSize(file),
        lastModified: await this.getFileLastModified(file)
      });
    }
    
    // Create Merkle tree for efficient verification
    const merkleTree = this.createMerkleTree(fileHashes.map(f => f.hash));
    const rootHash = merkleTree.root;
    
    return {
      rootHash,
      fileHashes,
      merkleTree,
      totalFiles: files.length,
      totalSize: fileHashes.reduce((sum, f) => sum + f.size, 0)
    };
  }

  private static async hashFile(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath);
    const hash = await crypto.subtle.digest('SHA-256', content);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private static createMerkleTree(hashes: string[]): MerkleTree {
    // Implement Merkle tree creation for efficient verification
    const leaves = hashes.map(hash => ({ hash, left: null, right: null }));
    
    while (leaves.length > 1) {
      const level: any[] = [];
      for (let i = 0; i < leaves.length; i += 2) {
        const left = leaves[i];
        const right = leaves[i + 1] || left;
        const combined = this.hashPair(left.hash, right.hash);
        level.push({ hash: combined, left, right });
      }
      leaves.splice(0, leaves.length, ...level);
    }
    
    return { root: leaves[0].hash, tree: leaves[0] };
  }
}
```

### 3. Parent Agent Integration

#### Parent Agent Credential Linking
```typescript
export class ParentAgent extends BaseAgent {
  async linkPackageCredential(credential: VerifiableCredential_2_0): Promise<void> {
    // Add the credential as a resource to the parent DID
    const resourceId = `resource:package:${credential.credentialSubject.packageName}:${credential.credentialSubject.packageVersion}`;
    
    await this.addDIDResource(this.agentId, {
      id: resourceId,
      type: 'PackageReleaseCredential',
      serviceEndpoint: credential.id,
      metadata: {
        packageName: credential.credentialSubject.packageName,
        packageVersion: credential.credentialSubject.packageVersion,
        packageHash: credential.credentialSubject.packageHash,
        releaseDate: credential.credentialSubject.releaseDate
      }
    });
  }

  async verifyPackageCredential(credential: VerifiableCredential_2_0): Promise<VerificationResult> {
    // Verify the credential was issued by an authorized package agent
    const verificationResult = await this.verifyCredential(credential);
    
    if (verificationResult.isValid) {
      // Check if the package agent is authorized
      const isAuthorized = await this.isAuthorizedPackageAgent(credential.issuer);
      if (!isAuthorized) {
        verificationResult.isValid = false;
        verificationResult.validationErrors.push('Package agent not authorized');
      }
    }
    
    return verificationResult;
  }
}
```

### 4. Credential Publishing and Verification

#### Credential Publishing
```typescript
export class CredentialPublisher {
  static async publishCredential(credential: VerifiableCredential_2_0): Promise<void> {
    // Publish to multiple endpoints for redundancy
    await Promise.all([
      this.publishToSchemaRegistry(credential),
      this.publishToTrustRegistry(credential),
      this.publishToPackageRegistry(credential)
    ]);
  }

  private static async publishToSchemaRegistry(credential: VerifiableCredential_2_0): Promise<void> {
    // Publish to schema registry for discovery
    const endpoint = process.env.SCHEMA_REGISTRY_ENDPOINT;
    if (endpoint) {
      await fetch(`${endpoint}/credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credential)
      });
    }
  }

  private static async publishToPackageRegistry(credential: VerifiableCredential_2_0): Promise<void> {
    // Publish to package registry for package verification
    const endpoint = process.env.PACKAGE_REGISTRY_ENDPOINT;
    if (endpoint) {
      await fetch(`${endpoint}/packages/${credential.credentialSubject.packageName}/releases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credential)
      });
    }
  }
}
```

#### Package Verification
```typescript
export class PackageVerifier {
  static async verifyPackage(packagePath: string, expectedCredentialId: string): Promise<VerificationResult> {
    try {
      // Step 1: Retrieve the published credential
      const credential = await this.retrieveCredential(expectedCredentialId);
      if (!credential) {
        return {
          isValid: false,
          validationErrors: ['Credential not found'],
          warnings: []
        };
      }

      // Step 2: Hash the current package files
      const currentHash = await PackageHasher.hashPackageFiles(packagePath);
      
      // Step 3: Compare with the hash in the credential
      if (currentHash.rootHash !== credential.credentialSubject.packageHash) {
        return {
          isValid: false,
          validationErrors: ['Package hash mismatch - files may have been tampered with'],
          warnings: []
        };
      }

      // Step 4: Verify the credential signature
      const verificationResult = await this.verifyCredential(credential);
      
      return {
        isValid: verificationResult.isValid,
        validationErrors: verificationResult.validationErrors,
        warnings: verificationResult.warnings,
        metadata: {
          packageName: credential.credentialSubject.packageName,
          packageVersion: credential.credentialSubject.packageVersion,
          releaseDate: credential.credentialSubject.releaseDate,
          issuer: credential.issuer
        }
      };
    } catch (error) {
      return {
        isValid: false,
        validationErrors: [`Verification failed: ${error.message}`],
        warnings: []
      };
    }
  }
}
```

### 5. CI/CD Integration

#### GitHub Actions Integration
```yaml
# .github/workflows/sign-release.yml
name: Sign and Release Package

on:
  release:
    types: [published]

jobs:
  sign-release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          
      - name: Install Open Verifiable ID SDK
        run: npm install @open-verifiable/id-sdk
        
      - name: Sign Release
        run: |
          node -e "
            const { createPackageAgent, createParentAgent } = require('@open-verifiable/id-sdk');
            
            async function signRelease() {
              const packageAgent = await createPackageAgent('${{ github.event.repository.name }}', '${{ github.event.release.tag_name }}');
              const parentAgent = await createParentAgent('${{ github.repository_owner }}');
              
              const result = await packageAgent.signRelease('.', parentAgent.agentId);
              console.log('Release signed:', JSON.stringify(result, null, 2));
            }
            
            signRelease().catch(console.error);
          "
          
      - name: Publish to npm
        run: npm publish
```

### 6. Package Registry Integration

#### NPM Package Verification
```typescript
export class NPMPackageVerifier {
  static async verifyNPMPackage(packageName: string, version: string): Promise<VerificationResult> {
    try {
      // Step 1: Download package from npm
      const packageData = await this.downloadNPMPackage(packageName, version);
      
      // Step 2: Extract and hash package files
      const extractedPath = await this.extractPackage(packageData);
      const packageHash = await PackageHasher.hashPackageFiles(extractedPath);
      
      // Step 3: Retrieve published credential
      const credential = await this.retrievePackageCredential(packageName, version);
      
      // Step 4: Verify package integrity
      return await PackageVerifier.verifyPackage(extractedPath, credential.id);
    } catch (error) {
      return {
        isValid: false,
        validationErrors: [`NPM package verification failed: ${error.message}`],
        warnings: []
      };
    }
  }
}
```

## Consequences

### Positives
- **Provenance Verification**: Cryptographic proof of package origin and authenticity
- **Integrity Assurance**: Tamper detection through file hashing and verification
- **Supply Chain Security**: Enables secure software supply chain practices
- **Compliance**: Supports regulatory requirements for software security
- **Trust**: Builds user confidence in package authenticity

### Negatives
- **Complexity**: Sign-release workflow adds complexity to package publishing
- **Performance**: File hashing and credential verification may impact performance
- **Dependencies**: Creates dependencies on credential publishing infrastructure
- **Key Management**: Requires secure management of package signing keys

### Trade-offs
- **Security vs Simplicity**: Enhanced security through complexity
- **Performance vs Trust**: Verification overhead for trust assurance
- **Centralization vs Decentralization**: Centralized credential publishing vs decentralized verification

## Business Impact
- **Supply Chain Security**: Enables secure software supply chain practices
- **Compliance**: Meets regulatory requirements for software security
- **Trust**: Builds user confidence in package authenticity
- **Competitive Advantage**: Differentiates through enhanced security features
- **Ecosystem Growth**: Enables secure package distribution ecosystem

## Mission Alignment & Principle Coverage
- **Creator First, Always**: Protects creators' intellectual property and reputation
- **Proof-First Trust**: Cryptographic proof underpins verifiable trust
- **Security First**: Strong cryptographic foundations ensure package security
- **Resilience by Design**: Tamper detection and verification improve system resilience
- **Community Collaboration**: Enables secure collaboration in package ecosystems 