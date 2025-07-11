/**
 * React Native specific test setup
 * 
 * This file sets up mocks and configurations specific to React Native testing
 */

import { vi } from 'vitest'

// Mock React Native modules
vi.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    Version: '16.0',
    select: vi.fn((config) => config.ios || config.default)
  },
  
  // AsyncStorage mock
  AsyncStorage: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
    multiGet: vi.fn().mockResolvedValue([]),
    multiSet: vi.fn().mockResolvedValue(undefined),
    multiRemove: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
    getAllKeys: vi.fn().mockResolvedValue([])
  },
  
  // Keychain mock (for secure storage)
  Keychain: {
    setInternetCredentials: vi.fn().mockResolvedValue(true),
    getInternetCredentials: vi.fn().mockResolvedValue({ username: '', password: '' }),
    resetInternetCredentials: vi.fn().mockResolvedValue(true)
  },
  
  // Biometric authentication mock
  TouchID: {
    isSupported: vi.fn().mockResolvedValue(true),
    authenticate: vi.fn().mockResolvedValue(true)
  },
  
  FaceID: {
    isSupported: vi.fn().mockResolvedValue(true),
    authenticate: vi.fn().mockResolvedValue(true)
  },
  
  // Network info mock
  NetInfo: {
    fetch: vi.fn().mockResolvedValue({ isConnected: true, type: 'wifi' }),
    addEventListener: vi.fn()
  },
  
  // Dimensions mock
  Dimensions: {
    get: vi.fn().mockReturnValue({ width: 375, height: 812 })
  }
}))

// Mock React Native crypto
vi.mock('react-native-crypto', () => ({
  randomBytes: vi.fn((size: number) => new Uint8Array(size).fill(42)),
  createHash: vi.fn(() => ({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn().mockReturnValue('mocked-hash')
  }))
}))

// Mock React Native secure storage
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
    multiGet: vi.fn().mockResolvedValue([]),
    multiSet: vi.fn().mockResolvedValue(undefined),
    multiRemove: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
    getAllKeys: vi.fn().mockResolvedValue([])
  }
}))

// Mock React Native keychain
vi.mock('react-native-keychain', () => ({
  setInternetCredentials: vi.fn().mockResolvedValue(true),
  getInternetCredentials: vi.fn().mockResolvedValue({ 
    username: 'test', 
    password: 'test-password' 
  }),
  resetInternetCredentials: vi.fn().mockResolvedValue(true),
  getSupportedBiometryType: vi.fn().mockResolvedValue('TouchID')
}))

// Global React Native test utilities
export const reactNativeTestUtils = {
  // Mock platform switching
  mockPlatform: (os: 'ios' | 'android') => {
    const Platform = require('react-native').Platform
    Platform.OS = os
  },
  
  // Mock network connectivity
  mockNetworkState: (isConnected: boolean) => {
    const NetInfo = require('react-native').NetInfo
    NetInfo.fetch.mockResolvedValue({ isConnected, type: isConnected ? 'wifi' : 'none' })
  },
  
  // Mock biometric availability
  mockBiometricSupport: (supported: boolean) => {
    const TouchID = require('react-native').TouchID
    const FaceID = require('react-native').FaceID
    TouchID.isSupported.mockResolvedValue(supported)
    FaceID.isSupported.mockResolvedValue(supported)
  }
} 