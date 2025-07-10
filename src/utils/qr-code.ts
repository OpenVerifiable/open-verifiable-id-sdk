import QRCode from 'qrcode'

export interface QRCodeOptions {
  compress?: boolean
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
  margin?: number
  width?: number
  color?: {
    dark?: string
    light?: string
  }
}

export interface EncodeOptions {
  compress?: boolean
}

/**
 * Encode data for QR code transmission
 */
export function encodeData(data: any, options: EncodeOptions = {}): string {
  const { compress = true } = options
  
  try {
    const jsonString = JSON.stringify(data)
    
    if (compress && jsonString.length > 100) {
      // Simple base64 encoding for compression demo
      return Buffer.from(jsonString).toString('base64')
    }
    
    return jsonString
  } catch (error) {
    throw new Error(`Failed to encode data: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Decode data from QR code transmission
 */
export function decodeData(encodedData: string): string {
  try {
    // Try to decode as base64 first (compressed)
    try {
      const decoded = Buffer.from(encodedData, 'base64').toString('utf-8')
      // Validate it's valid JSON
      JSON.parse(decoded)
      return decoded
    } catch {
      // If base64 fails, assume it's plain JSON
      return encodedData
    }
  } catch (error) {
    throw new Error(`Failed to decode data: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function generateQRCode(
  data: string,
  options: QRCodeOptions = {}
): Promise<string> {
  const {
    compress = true,
    errorCorrectionLevel = 'M',
    margin = 1,
    width = 256,
    color = {
      dark: '#000000',
      light: '#FFFFFF'
    }
  } = options

  try {
    // If compression is enabled, compress the data
    let processedData = data
    if (compress && data.length > 100) {
      // Simple compression for demo purposes
      // In production, you might want to use a more sophisticated compression
      processedData = JSON.stringify({
        compressed: true,
        data: data,
        timestamp: new Date().toISOString()
      })
    }

    const qrCodeOptions = {
      errorCorrectionLevel,
      margin,
      width,
      color
    }

    // Generate QR code as data URL (PNG format)
    const qrCodeDataURL = await QRCode.toDataURL(processedData, qrCodeOptions)
    return qrCodeDataURL
  } catch (error) {
    throw new Error(`Failed to generate QR code: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// SVG generation removed due to API compatibility issues
// Use generateQRCode() which returns a data URL that can be used in img tags

export async function readQRCode(_imageData: string): Promise<string> {
  // This would require a QR code reader library like jsqr
  // For now, we'll return a placeholder
  throw new Error('QR code reading not implemented yet')
}

// Utility function to create QR codes for different use cases
export async function createDevicePairingQR(deviceInfo: {
  deviceId: string
  deviceName: string
  capabilities: string[]
  bluetoothService?: string
}): Promise<string> {
  const data = {
    type: 'device-pairing',
    ...deviceInfo,
    timestamp: new Date().toISOString()
  }
  
  return generateQRCode(JSON.stringify(data, null, 2), { compress: false })
}

export async function createConnectionInstructionsQR(instructions: {
  steps: string[]
  deviceName: string
  serviceUUID?: string
  characteristicUUID?: string
}): Promise<string> {
  const data = {
    type: 'bluetooth-connection',
    ...instructions,
    timestamp: new Date().toISOString()
  }
  
  return generateQRCode(JSON.stringify(data, null, 2), { compress: false })
}

export async function createCredentialTransferQR(request: {
  requestId: string
  requestedCredentials: string[]
  transferMethod: string
  deviceId: string
  expiresAt: string
}): Promise<string> {
  const data = {
    type: 'credential-transfer-request',
    ...request,
    timestamp: new Date().toISOString()
  }
  
  return generateQRCode(JSON.stringify(data, null, 2), { compress: false })
} 