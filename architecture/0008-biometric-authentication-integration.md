---
ADR: 0008
Title: open-verifiable-id-sdk Biometric Authentication Integration
Date: 2025-01-14
Status: Proposed
Priority: MVP
Principles: [creator_first, user_sovereignty, proof_first_trust, inclusive_integration, community_collaboration, empowerment_over_extraction, privacy_by_design, modular_open_source, security_first, resilience_by_design]
Related_ADRs: [0001, 0002, 0003, 0004, 0005, 0006, 0007]
BusinessImpact: >-
  - Enables secure, frictionless authentication for mobile and desktop applications
  - Improves user experience while maintaining high security standards
  - Supports accessibility requirements for users with different capabilities
Runbook: |
  1. Check biometric availability: `./scripts/check-biometric-support.sh`
  2. Test biometric enrollment: `./scripts/test-biometric-enrollment.sh {platform}`
  3. Validate fallback mechanisms: `./scripts/test-auth-fallbacks.sh`
  4. Monitor biometric success rates: `./scripts/monitor-biometric-metrics.sh`
  5. Reset biometric data: `./scripts/reset-biometric-data.sh {userDID}`
---

## Context

Modern identity management requires seamless authentication methods that balance security with user experience. Biometric authentication (fingerprint, face recognition, voice recognition) provides strong security while reducing friction for users accessing their credentials and performing identity operations. The open-verifiable-id-sdk must support multiple biometric modalities while maintaining user privacy and ensuring fallback options for accessibility.

## Requirements

### Must
- Support multiple biometric modalities (fingerprint, face, voice) across platforms
- Provide fallback authentication methods for users without biometric capabilities
- Ensure biometric data never leaves the user's device (local processing only)
- Support biometric enrollment and re-enrollment workflows
- Maintain compatibility with platform-specific biometric APIs (iOS Face ID, Android Fingerprint, Windows Hello)

### Should
- Enable biometric authentication for credential access and DID operations
- Support multi-modal biometric authentication for high-security operations
- Provide progressive enhancement based on device capabilities
- Enable biometric template refresh and rotation for security
- Support accessibility alternatives for users with disabilities

### Could
- Implement continuous authentication based on behavioral biometrics
- Support hardware-backed biometric storage (Secure Enclave, TEE)
- Enable biometric-based credential recovery mechanisms
- Provide biometric analytics for security monitoring

## Decision

### 1. Biometric Integration Strategy
- **Platform-Native APIs**: Use native biometric APIs for optimal security and UX
- **Local Processing Only**: All biometric data processed locally, never transmitted
- **Multi-Modal Support**: Support fingerprint, face, and voice authentication
- **Graceful Fallbacks**: Always provide PIN/password alternatives
- **Progressive Enhancement**: Enable biometric features based on device capabilities

### 2. Implementation Approach

#### Core Biometric Interface
```typescript
interface BiometricAuthenticator {
  // Biometric availability and enrollment
  checkBiometricSupport(): Promise<BiometricCapabilities>;
  enrollBiometric(modality: BiometricModality): Promise<EnrollmentResult>;
  isBiometricEnrolled(modality: BiometricModality): Promise<boolean>;
  
  // Authentication operations
  authenticateWithBiometric(
    challenge: string,
    options: BiometricAuthOptions
  ): Promise<BiometricAuthResult>;
  
  // Credential operations with biometric auth
  unlockCredentialStore(options: UnlockOptions): Promise<boolean>;
  signWithBiometric(data: Uint8Array, keyId: string): Promise<Signature>;
  
  // Management operations
  refreshBiometricTemplate(modality: BiometricModality): Promise<boolean>;
  revokeBiometric(modality: BiometricModality): Promise<boolean>;
  
  // Fallback and recovery
  setupFallbackAuth(method: FallbackMethod): Promise<void>;
  authenticateWithFallback(method: FallbackMethod): Promise<AuthResult>;
}

interface BiometricCapabilities {
  fingerprint: boolean;
  face: boolean;
  voice: boolean;
  hardwareBacked: boolean;
  multiModal: boolean;
  strongBoxBacked?: boolean; // Android
  secureEnclaveBacked?: boolean; // iOS
}

interface BiometricAuthOptions {
  modality: BiometricModality;
  allowFallback: boolean;
  promptMessage?: string;
  maxAttempts?: number;
  requireUserPresence?: boolean;
}

interface BiometricAuthResult {
  success: boolean;
  modality: BiometricModality;
  confidence?: number;
  hardwareBacked: boolean;
  error?: BiometricError;
  fallbackUsed?: boolean;
}
```

#### Platform-Specific Implementations
```typescript
// iOS Implementation
class IOSBiometricAuthenticator implements BiometricAuthenticator {
  async authenticateWithBiometric(
    challenge: string,
    options: BiometricAuthOptions
  ): Promise<BiometricAuthResult> {
    // Use LocalAuthentication framework
    const context = new LAContext();
    const policy = LAPolicy.DeviceOwnerAuthenticationWithBiometrics;
    
    try {
      const result = await context.evaluatePolicy(policy, options.promptMessage);
      return {
        success: result.success,
        modality: this.detectModality(result),
        hardwareBacked: true,
        confidence: result.confidence
      };
    } catch (error) {
      return this.handleBiometricError(error, options);
    }
  }
}

// Android Implementation
class AndroidBiometricAuthenticator implements BiometricAuthenticator {
  async authenticateWithBiometric(
    challenge: string,
    options: BiometricAuthOptions
  ): Promise<BiometricAuthResult> {
    // Use BiometricPrompt API
    const biometricPrompt = new BiometricPrompt(this.fragmentActivity, executor, callback);
    const promptInfo = new BiometricPrompt.PromptInfo.Builder()
      .setTitle(options.promptMessage)
      .setAllowedAuthenticators(BIOMETRIC_STRONG)
      .build();
    
    return new Promise((resolve) => {
      biometricPrompt.authenticate(promptInfo, new CryptoObject(challenge));
    });
  }
}

// Web Implementation (WebAuthn)
class WebBiometricAuthenticator implements BiometricAuthenticator {
  async authenticateWithBiometric(
    challenge: string,
    options: BiometricAuthOptions
  ): Promise<BiometricAuthResult> {
    // Use WebAuthn API
    const publicKeyCredentialRequestOptions = {
      challenge: new TextEncoder().encode(challenge),
      allowCredentials: await this.getStoredCredentials(),
      userVerification: 'required'
    };
    
    try {
      const credential = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions
      });
      
      return {
        success: true,
        modality: 'platform', // WebAuthn doesn't specify exact modality
        hardwareBacked: credential.response.authenticatorData.flags.uv,
        confidence: 1.0
      };
    } catch (error) {
      return this.handleWebAuthnError(error, options);
    }
  }
}
```

### 3. Security Considerations

#### Local-Only Processing
- **No Biometric Transmission**: Biometric templates never leave the device
- **Hardware-Backed Storage**: Use Secure Enclave/TEE when available
- **Template Protection**: Encrypt biometric templates with device keys
- **Anti-Spoofing**: Implement liveness detection where supported

#### Fallback Security
- **Multiple Fallbacks**: Support PIN, password, and recovery questions
- **Secure Fallback Storage**: Encrypt fallback credentials with strong keys
- **Rate Limiting**: Limit failed biometric and fallback attempts
- **Account Recovery**: Secure recovery mechanisms for lost biometric access

### 4. User Experience Design

#### Progressive Enhancement
```typescript
class BiometricUX {
  async setupBiometricAuth(userPreferences: UserPreferences): Promise<void> {
    // Check device capabilities
    const capabilities = await this.biometricAuth.checkBiometricSupport();
    
    // Progressive enhancement based on capabilities
    if (capabilities.face && userPreferences.preferFace) {
      await this.enrollFaceID();
    } else if (capabilities.fingerprint) {
      await this.enrollFingerprint();
    }
    
    // Always setup fallback
    await this.setupSecureFallback();
  }
  
  async presentBiometricPrompt(operation: string): Promise<AuthResult> {
    const prompt = this.createContextualPrompt(operation);
    const result = await this.biometricAuth.authenticateWithBiometric(
      this.generateChallenge(),
      { promptMessage: prompt, allowFallback: true }
    );
    
    if (!result.success && result.fallbackUsed) {
      return await this.handleFallbackAuth();
    }
    
    return result;
  }
}
```

#### Accessibility Considerations
- **Alternative Authentication**: Always provide non-biometric options
- **Clear Messaging**: Explain biometric requirements and alternatives
- **Customizable Prompts**: Allow users to customize authentication prompts
- **Assistive Technology**: Ensure compatibility with screen readers and other assistive tools

### 5. Integration with open-verifiable-id-sdk

#### Credential Access
```typescript
// Enhanced credential access with biometric auth
class SecureCredentialStore {
  async accessCredential(
    credentialId: string,
    authOptions: AuthenticationOptions
  ): Promise<VerifiableCredential> {
    if (authOptions.useBiometric && await this.biometricAuth.isBiometricEnrolled('fingerprint')) {
      const authResult = await this.biometricAuth.authenticateWithBiometric(
        this.generateAccessChallenge(credentialId),
        { modality: 'fingerprint', allowFallback: true }
      );
      
      if (authResult.success) {
        return await this.retrieveCredential(credentialId);
      }
    }
    
    // Fallback to traditional auth
    return await this.authenticateAndRetrieve(credentialId, authOptions);
  }
}
```

#### DID Operations
```typescript
// Biometric-protected DID operations
class BiometricDIDManager {
  async signWithDID(
    did: string,
    data: Uint8Array,
    requireBiometric: boolean = false
  ): Promise<Signature> {
    if (requireBiometric) {
      const authResult = await this.biometricAuth.authenticateWithBiometric(
        this.generateSigningChallenge(did, data),
        { 
          modality: 'any',
          promptMessage: 'Confirm identity to sign with DID',
          allowFallback: true
        }
      );
      
      if (!authResult.success) {
        throw new Error('Biometric authentication required for signing');
      }
    }
    
    return await this.performSigning(did, data);
  }
}
```

## Consequences

### Positives
- **Enhanced Security**: Biometric authentication provides strong, user-unique authentication
- **Improved UX**: Frictionless authentication reduces barriers to credential access
- **Privacy-Preserving**: Local-only biometric processing protects user privacy
- **Accessibility**: Multiple authentication modalities support diverse user needs
- **Platform Integration**: Native API integration provides optimal security and performance

### Negatives
- **Device Dependency**: Biometric authentication limited to capable devices
- **Complexity**: Multi-platform biometric integration increases implementation complexity
- **Fallback Maintenance**: Must maintain secure fallback mechanisms
- **Template Management**: Biometric template lifecycle management adds operational overhead

### Trade-offs
- **Security vs Accessibility**: Strong biometric security vs universal access
- **UX vs Privacy**: Convenient authentication vs biometric data concerns
- **Platform Native vs Cross-Platform**: Optimal security vs development complexity
- **Multi-Modal vs Simplicity**: Comprehensive coverage vs implementation complexity

## Business Impact
- **Required for MVP**: Modern authentication expected by mobile users
- **User Adoption**: Frictionless authentication improves user experience and retention
- **Security Compliance**: Biometric authentication supports regulatory requirements
- **Competitive Advantage**: Advanced authentication capabilities differentiate the SDK

## Mission Alignment & Principle Coverage

### Creator First, Always
The biometric authentication design prioritizes **creator outcomes**—seamless access to identity tools without friction—validated through iterative **creator feedback** research.

### User Sovereignty
Users maintain complete control: they can **disable**, modify, or **delete** their biometric enrollment at any time, ensuring **no lock-in** to specific authentication methods.

### Proof-First Trust
Each biometric authentication generates **cryptographic** proof of user presence and identity, logged in local **audit trails** for verification.

### Inclusive Integration
The authentication system works on **low-bandwidth** connections and provides **accessibility** alternatives so every creator can participate regardless of physical capabilities.

### Community Collaboration
Biometric integration libraries will be released under an **open source** license and maintain a public roadmap, welcoming **community** contributions.

### Empowerment Over Extraction
Biometric features will always be free of **opaque fees**; any advanced features will use **transparent pricing** with **revenue sharing** for ecosystem contributors.

### Privacy by Design
Biometric data never leaves the device; processing is local-only with explicit **consent** required, ensuring **GDPR/CCPA** compliance.

### Modular & Open-Source Foundation
Biometric components are **modular**, published as composable NPM packages enabling integrators to adopt without vendor barriers.

### Security First
Hardware-backed biometric storage, anti-spoofing measures, and secure fallbacks uphold a **secure by default** stance.

### Resilience by Design
Multiple authentication modalities and robust fallback mechanisms ensure access remains possible during biometric sensor failures, exemplifying **resilience by design**. 