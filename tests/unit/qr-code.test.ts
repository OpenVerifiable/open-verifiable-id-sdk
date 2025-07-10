import { describe, it, expect } from 'vitest'
import { encodeData, decodeData, generateQRCode } from '../../src/utils/qr-code'

describe('QR Code Utilities', () => {
  it.skip('should encode and decode data correctly', () => {
    const payload = { foo: 'bar', num: 42 }
    const encoded = encodeData(payload)
    const decodedStr = decodeData(encoded)
    expect(typeof decodedStr).toBe('string')
    const decodedObj = JSON.parse(decodedStr)
    expect(decodedObj).toEqual(payload)
  })

  it.skip('should generate a QR code data URI', async () => {
    const payload = 'hello-world'
    const dataUri = await generateQRCode(payload, { compress: false })
    expect(dataUri.startsWith('data:image')).toBe(true)
  })
}) 