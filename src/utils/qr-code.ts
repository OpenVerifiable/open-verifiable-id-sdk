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

    // Generate QR code as data URL
    const qrCodeDataURL = await QRCode.toDataURL(processedData, qrCodeOptions)
    return qrCodeDataURL
  } catch (error) {
    throw new Error(`Failed to generate QR code: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// SVG generation removed due to API compatibility issues
// Use generateQRCode() which returns a data URL that can be used in img tags

export async function readQRCode(imageData: string): Promise<string> {
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