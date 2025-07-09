declare module 'qrcode' {
  const toDataURL: (data: string | Buffer, opts?: any) => Promise<string>
  export = {
    toDataURL
  }
}

declare module 'pako' {
  const deflate: (input: string | Uint8Array) => Uint8Array
  const inflate: (input: Uint8Array | Buffer) => Uint8Array
  export { deflate, inflate }
  export default {
    deflate,
    inflate
  }
}

// Web Bluetooth API types
interface BluetoothRemoteGATTServer {
  connected: boolean
  connect(): Promise<BluetoothRemoteGATTServer>
  disconnect(): void
  getPrimaryService(service: string): Promise<BluetoothRemoteGATTService>
}

interface BluetoothRemoteGATTService {
  getCharacteristic(characteristic: string): Promise<BluetoothRemoteGATTCharacteristic>
}

interface BluetoothRemoteGATTCharacteristic {
  writeValue(value: BufferSource): Promise<void>
  startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>
  addEventListener(type: string, listener: EventListener): void
  value?: DataView
}

interface BluetoothLEScanFilter {
  services?: string[]
  name?: string
  namePrefix?: string
  manufacturerData?: Array<{
    companyIdentifier: number
    dataPrefix?: BufferSource
    mask?: BufferSource
  }>
  serviceData?: Array<{
    service: string
    dataPrefix?: BufferSource
    mask?: BufferSource
  }>
}

interface RequestDeviceOptions {
  filters?: BluetoothLEScanFilter[]
  optionalServices?: string[]
  acceptAllDevices?: boolean
}

interface BluetoothDevice {
  id: string
  name?: string
  gatt?: BluetoothRemoteGATTServer
  uuids?: string[]
}

declare global {
  interface Navigator {
    bluetooth?: {
      requestDevice(options: RequestDeviceOptions): Promise<BluetoothDevice>
    }
  }
} 