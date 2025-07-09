import { StorageError, StorageErrorCode, StorageOperation } from '../../../src/core/storage/types';

describe('Storage Types', () => {
  describe('StorageError', () => {
    it('should create error with correct properties', () => {
      const message = 'Failed to encrypt data';
      const code = StorageErrorCode.ENCRYPTION_FAILED;
      const operation: StorageOperation = 'write';
      
      const error = new StorageError(message, code, operation);
      
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('StorageError');
      expect(error.message).toBe(message);
      expect(error.code).toBe(code);
      expect(error.operation).toBe(operation);
    });
    
    it('should handle all error codes', () => {
      const codes = Object.values(StorageErrorCode);
      expect(codes).toContain('ENCRYPTION_FAILED');
      expect(codes).toContain('DECRYPTION_FAILED');
      expect(codes).toContain('ITEM_NOT_FOUND');
      expect(codes).toContain('INVALID_DATA');
      expect(codes).toContain('STORAGE_FULL');
      expect(codes).toContain('BACKUP_FAILED');
      expect(codes).toContain('RESTORE_FAILED');
      expect(codes).toContain('PLATFORM_ERROR');
      expect(codes).toContain('PERMISSION_DENIED');
    });
  });
  
  describe('StorageOperation Type', () => {
    it('should allow valid operations', () => {
      const validOperations: StorageOperation[] = [
        'read',
        'write',
        'delete',
        'list',
        'clear',
        'backup',
        'restore',
        'rotate'
      ];
      
      validOperations.forEach(operation => {
        const error = new StorageError('test', StorageErrorCode.ENCRYPTION_FAILED, operation);
        expect(error.operation).toBe(operation);
      });
    });
  });
}); 