/**
 * Biometric Authentication Types
 * 
 * Type definitions for biometric authentication across platforms
 */

export enum BiometricModality {
  FINGERPRINT = 'fingerprint',
  FACE = 'face',
  VOICE = 'voice',
  IRIS = 'iris'
}

export interface BiometricCapabilities {
  fingerprint: boolean;
  face: boolean;
  voice: boolean;
  iris: boolean;
  hardwareBacked: boolean;
  multiModal: boolean;
  strongBoxBacked?: boolean; // Android
  secureEnclaveBacked?: boolean; // iOS
}

export interface BiometricAuthOptions {
  modality: BiometricModality;
  allowFallback: boolean;
  promptMessage?: string;
  maxAttempts?: number;
  requireUserPresence?: boolean;
}

export interface BiometricAuthResult {
  success: boolean;
  modality: BiometricModality;
  confidence?: number;
  hardwareBacked: boolean;
  error?: BiometricError;
  fallbackUsed?: boolean;
}

export interface BiometricError {
  code: string;
  message: string;
  recoverable: boolean;
}

export interface EnrollmentResult {
  success: boolean;
  modality: BiometricModality;
  templateId?: string;
  error?: BiometricError;
}

export interface UnlockOptions {
  requireBiometric: boolean;
  fallbackMethod?: 'password' | 'pin';
  promptMessage?: string;
}

export interface AuthResult {
  success: boolean;
  method: 'biometric' | 'fallback';
  error?: string;
}

export interface Signature {
  data: Uint8Array;
  algorithm: string;
  timestamp: string;
}

export type FallbackMethod = 'password' | 'pin' | 'pattern'; 