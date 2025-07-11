/**
 * Bluetooth Communication Utilities
 * 
 * Provides cross-platform Bluetooth functionality for:
 * - Device discovery and pairing
 * - Secure data transfer between devices
 * - Credential and key exchange
 */

export interface BluetoothDevice {
  id: string
  name?: string
  rssi?: number
  uuids?: string[]
  manufacturerData?: Map<number, DataView>
  serviceData?: Map<string, DataView>
}

export interface BluetoothConnection {
  device: BluetoothDevice
  server: BluetoothRemoteGATTServer
  services: Map<string, BluetoothRemoteGATTService>
  isConnected: boolean
}

export interface DataTransferOptions {
  /** Service UUID for data transfer */
  serviceUUID?: string
  /** Characteristic UUID for data transfer */
  characteristicUUID?: string
  /** Whether to encrypt the data */
  encrypt?: boolean
  /** Timeout in milliseconds */
  timeout?: number
}

export interface TransferResult {
  success: boolean
  bytesTransferred: number
  error?: string
}

// Default UUIDs for our service
const DEFAULT_SERVICE_UUID = '0000ff00-0000-1000-8000-00805f9b34fb'
const DEFAULT_CHARACTERISTIC_UUID = '0000ff01-0000-1000-8000-00805f9b34fb'

export class BluetoothManager {
  private connections = new Map<string, BluetoothConnection>()
  private isSupported: boolean

  constructor() {
    this.isSupported = this.checkBluetoothSupport()
  }

  /**
   * Check if Bluetooth is supported in the current environment
   */
  private checkBluetoothSupport(): boolean {
    if (typeof navigator !== 'undefined' && 'bluetooth' in navigator) {
      return true // Web Bluetooth API
    }
    if (typeof global !== 'undefined' && 'BluetoothDevice' in global) {
      return true // Node.js with noble
    }
    return false
  }

  /**
   * Request Bluetooth permissions and scan for devices
   */
  async scanForDevices(
    filters?: BluetoothLEScanFilter[],
    options?: RequestDeviceOptions
  ): Promise<BluetoothDevice[]> {
    if (!this.isSupported) {
      throw new Error('Bluetooth not supported in this environment')
    }

    try {
      if (typeof navigator !== 'undefined' && 'bluetooth' in navigator) {
        // Web Bluetooth API
        const device = await (navigator as any).bluetooth.requestDevice({
          filters: filters || [{ services: [DEFAULT_SERVICE_UUID] }],
          optionalServices: ['battery_service'],
          ...options
        })
        
        return [{
          id: device.id,
          name: device.name,
          uuids: device.uuids
        }]
      } else {
        // Node.js with noble (simplified)
        throw new Error('Node.js Bluetooth scanning not yet implemented')
      }
    } catch (error) {
      throw new Error(`Bluetooth scanning failed: ${error}`)
    }
  }

  /**
   * Connect to a Bluetooth device
   */
  async connectToDevice(deviceId: string): Promise<BluetoothConnection> {
    if (!this.isSupported) {
      throw new Error('Bluetooth not supported in this environment')
    }

    try {
      if (typeof navigator !== 'undefined' && 'bluetooth' in navigator) {
        // Web Bluetooth API
        const device = await (navigator as any).bluetooth.requestDevice({
          filters: [{ services: [DEFAULT_SERVICE_UUID] }]
        })

        const server = await device.gatt?.connect()
        if (!server) {
          throw new Error('Failed to connect to GATT server')
        }

        const service = await server.getPrimaryService(DEFAULT_SERVICE_UUID)
        await service.getCharacteristic(DEFAULT_CHARACTERISTIC_UUID)

        const connection: BluetoothConnection = {
          device: {
            id: device.id,
            name: device.name
          },
          server,
          services: new Map([[DEFAULT_SERVICE_UUID, service]]),
          isConnected: true
        }

        this.connections.set(deviceId, connection)
        return connection
      } else {
        throw new Error('Node.js Bluetooth connection not yet implemented')
      }
    } catch (error) {
      throw new Error(`Failed to connect to device ${deviceId}: ${error}`)
    }
  }

  /**
   * Send data to a connected device
   */
  async sendData(
    deviceId: string,
    data: string | Uint8Array,
    options: DataTransferOptions = {}
  ): Promise<TransferResult> {
    const connection = this.connections.get(deviceId)
    if (!connection || !connection.isConnected) {
      throw new Error(`Device ${deviceId} not connected`)
    }

    try {
      const { serviceUUID = DEFAULT_SERVICE_UUID, characteristicUUID = DEFAULT_CHARACTERISTIC_UUID } = options
      
      const service = connection.services.get(serviceUUID)
      if (!service) {
        throw new Error(`Service ${serviceUUID} not found`)
      }

      const characteristic = await service.getCharacteristic(characteristicUUID)
      
      // Convert data to Uint8Array if it's a string
      const dataArray = typeof data === 'string' 
        ? new TextEncoder().encode(data)
        : data

      await characteristic.writeValue(dataArray)

      return {
        success: true,
        bytesTransferred: dataArray.length
      }
    } catch (error) {
      return {
        success: false,
        bytesTransferred: 0,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Receive data from a connected device
   */
  async receiveData(
    deviceId: string,
    options: DataTransferOptions = {}
  ): Promise<string> {
    const connection = this.connections.get(deviceId)
    if (!connection || !connection.isConnected) {
      throw new Error(`Device ${deviceId} not connected`)
    }

    try {
      const { serviceUUID = DEFAULT_SERVICE_UUID, characteristicUUID = DEFAULT_CHARACTERISTIC_UUID } = options
      
      const service = connection.services.get(serviceUUID)
      if (!service) {
        throw new Error(`Service ${serviceUUID} not found`)
      }

      const characteristic = await service.getCharacteristic(characteristicUUID)
      
      // Enable notifications
      await characteristic.startNotifications()
      
      return new Promise((resolve, reject) => {
        const timeout = options.timeout || 30000
        const timer = setTimeout(() => {
          reject(new Error('Data reception timeout'))
        }, timeout)

        characteristic.addEventListener('characteristicvaluechanged', (event: any) => {
          clearTimeout(timer)
          const value = event.target.value
          const decoder = new TextDecoder()
          resolve(decoder.decode(value))
        })
      })
    } catch (error) {
      throw new Error(`Failed to receive data: ${error}`)
    }
  }

  /**
   * Disconnect from a device
   */
  async disconnect(deviceId: string): Promise<void> {
    const connection = this.connections.get(deviceId)
    if (connection) {
      if (connection.server.connected) {
        await connection.server.disconnect()
      }
      connection.isConnected = false
      this.connections.delete(deviceId)
    }
  }

  /**
   * Get all connected devices
   */
  getConnectedDevices(): BluetoothDevice[] {
    return Array.from(this.connections.values())
      .filter(conn => conn.isConnected)
      .map(conn => conn.device)
  }

  /**
   * Check if a device is connected
   */
  isDeviceConnected(deviceId: string): boolean {
    const connection = this.connections.get(deviceId)
    return connection?.isConnected || false
  }
}

/**
 * Convenience function to send credentials via Bluetooth
 */
export async function sendCredentialsViaBluetooth(
  deviceId: string,
  credentials: any,
  options: DataTransferOptions = {}
): Promise<TransferResult> {
  const bluetooth = new BluetoothManager()
  
  // Connect to device
  await bluetooth.connectToDevice(deviceId)
  
  // Send credentials as JSON
  const result = await bluetooth.sendData(
    deviceId,
    JSON.stringify(credentials),
    options
  )
  
  // Disconnect
  await bluetooth.disconnect(deviceId)
  
  return result
}

/**
 * Convenience function to receive credentials via Bluetooth
 */
export async function receiveCredentialsViaBluetooth(
  deviceId: string,
  options: DataTransferOptions = {}
): Promise<any> {
  const bluetooth = new BluetoothManager()
  
  // Connect to device
  await bluetooth.connectToDevice(deviceId)
  
  // Receive data
  const data = await bluetooth.receiveData(deviceId, options)
  
  // Disconnect
  await bluetooth.disconnect(deviceId)
  
  // Parse JSON
  return JSON.parse(data)
} 