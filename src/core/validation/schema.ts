/**
 * Schema validation functionality for Verifiable Credentials
 */

import Ajv, { type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { VerifiableCredential_2_0, CredentialSchema } from '../../types';

// Global validator cache to improve performance
const validatorCache = new Map<string, ValidateFunction>();

// Initialize AJV with standard formats
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

export async function validateSchema(
  credential: VerifiableCredential_2_0,
  schema: CredentialSchema
): Promise<void> {
  try {
    // Get or create validator for this schema
    const validator = getOrCreateValidator(schema);
    
    // Extract the data to validate (credentialSubject)
    const dataToValidate = credential.credentialSubject;
    
    // Perform validation
    const isValid = validator(dataToValidate);
    
    if (!isValid) {
      const errors = validator.errors?.map((error: any) => 
        `${error.instancePath} ${error.message}`
      ).join(', ') || 'Unknown validation error';
      
      throw new Error(`Schema validation failed: ${errors}`);
    }
    
  } catch (error: any) {
    if (error instanceof Error) {
      // Re-throw validation errors as-is
      if (error.message.startsWith('Schema validation failed')) {
        throw error;
      }
      // Wrap other errors
      throw new Error(`Schema validation failed: ${error.message}`);
    }
    throw new Error(`Schema validation failed: ${error}`);
  }
}

function getOrCreateValidator(schema: CredentialSchema): ValidateFunction {
  const cacheKey = schema.id;
  
  // Check cache first
  if (validatorCache.has(cacheKey)) {
    return validatorCache.get(cacheKey)!;
  }
  
  try {
    // Compile the schema
    const validator = ajv.compile(schema.schema);
    
    // Cache the validator
    validatorCache.set(cacheKey, validator);
    
    return validator;
    
  } catch (error) {
    throw new Error(`Failed to compile schema: ${error instanceof Error ? error.message : error}`);
  }
}

export function clearValidatorCache(): void {
  validatorCache.clear();
}

export function getValidatorCacheSize(): number {
  return validatorCache.size;
}

export function removeValidatorFromCache(schemaId: string): boolean {
  return validatorCache.delete(schemaId);
}

export function hasValidatorInCache(schemaId: string): boolean {
  return validatorCache.has(schemaId);
} 