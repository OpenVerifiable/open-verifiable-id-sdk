// Bluetooth coordination server for Web Bluetooth API
// This server coordinates between devices using Web Bluetooth API

export class BluetoothServer {
  private connectedDevices: Map<string, any> = new Map();
  private isActive = false;

  constructor() {
    console.log('🔵 Bluetooth coordination server initialized');
  }

  async startService() {
    try {
      console.log('🔵 Starting Bluetooth coordination service...');
      
      this.isActive = true;
      console.log('🔵 Service UUID: 0000ff00-0000-1000-8000-00805f9b34fb');
      console.log('🔵 Characteristic UUID: 0000ff01-0000-1000-8000-00805f9b34fb');
      console.log('🔵 Ready for Web Bluetooth connections');
      
    } catch (error) {
      console.error('🔴 Failed to start Bluetooth service:', error);
    }
  }

  async stopService() {
    this.isActive = false;
    console.log('🔵 Stopped Bluetooth coordination service');
  }

  async handleConnection(deviceId: string, deviceInfo: any) {
    console.log(`🔵 Device connected: ${deviceId}`);
    
    const connection = {
      id: deviceId,
      name: deviceInfo.name || 'Unknown Device',
      connected: true,
      timestamp: new Date().toISOString(),
      info: deviceInfo
    };
    
    this.connectedDevices.set(deviceId, connection);
    
    return {
      success: true,
      message: 'Connected to Open Verifiable Device',
      deviceId,
      deviceName: connection.name,
      timestamp: new Date().toISOString()
    };
  }

  async sendData(deviceId: string, data: string) {
    console.log(`🔵 Sending data to device ${deviceId}: ${data}`);
    
    const device = this.connectedDevices.get(deviceId);
    if (!device) {
      throw new Error('Device not connected');
    }
    
    // In a real implementation, this would trigger a Web Bluetooth notification
    // For now, we'll store the data to be retrieved by the client
    
    device.lastSentData = {
      data,
      timestamp: new Date().toISOString()
    };
    
    return {
      success: true,
      message: 'Data queued for Web Bluetooth transmission',
      deviceId,
      data,
      timestamp: new Date().toISOString()
    };
  }

  async receiveData(deviceId: string) {
    console.log(`🔵 Receiving data from device ${deviceId}`);
    
    const device = this.connectedDevices.get(deviceId);
    if (!device) {
      throw new Error('Device not connected');
    }
    
    // Simulate received data
    const receivedData = {
      data: `Hello from Open Verifiable Device! (${deviceId})`,
      timestamp: new Date().toISOString()
    };
    
    device.lastReceivedData = receivedData;
    
    return {
      success: true,
      message: 'Data received via Web Bluetooth',
      deviceId,
      data: receivedData.data,
      timestamp: receivedData.timestamp
    };
  }

  getConnectedDevices() {
    return Array.from(this.connectedDevices.values());
  }

  disconnectDevice(deviceId: string) {
    const device = this.connectedDevices.get(deviceId);
    if (device) {
      this.connectedDevices.delete(deviceId);
      console.log(`🔵 Device disconnected: ${deviceId}`);
      return true;
    }
    return false;
  }

  getServiceStatus() {
    return {
      isActive: this.isActive,
      connectedDevices: this.connectedDevices.size,
      serviceUUID: '0000ff00-0000-1000-8000-00805f9b34fb',
      characteristicUUID: '0000ff01-0000-1000-8000-00805f9b34fb'
    };
  }
}

// Create HTTP endpoints for Web Bluetooth coordination
export function createBluetoothServer(app: any) {
  const bluetoothServer = new BluetoothServer();
  
  // Start the coordination service
  bluetoothServer.startService();

  // Get available Bluetooth devices
  app.get('/api/bluetooth/devices', (req: any, res: any) => {
    const devices = bluetoothServer.getConnectedDevices();
    res.json({
      devices: devices.map(device => ({
        id: device.id,
        name: device.name,
        address: device.id,
        rssi: -50,
        services: ['0000ff00-0000-1000-8000-00805f9b34fb'],
        connected: device.connected,
        lastSeen: device.timestamp
      }))
    });
  });

  // Connect to a Bluetooth device
  app.post('/api/bluetooth/connect', async (req: any, res: any) => {
    try {
      const { deviceId, deviceInfo } = req.body;
      const result = await bluetoothServer.handleConnection(deviceId, deviceInfo || {});
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Send data via Bluetooth
  app.post('/api/bluetooth/send', async (req: any, res: any) => {
    try {
      const { deviceId, data } = req.body;
      const result = await bluetoothServer.sendData(deviceId, data);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Receive data via Bluetooth
  app.post('/api/bluetooth/receive', async (req: any, res: any) => {
    try {
      const { deviceId } = req.body;
      const result = await bluetoothServer.receiveData(deviceId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Disconnect from a Bluetooth device
  app.post('/api/bluetooth/disconnect', (req: any, res: any) => {
    try {
      const { deviceId } = req.body;
      const success = bluetoothServer.disconnectDevice(deviceId);
      res.json({ success, message: success ? 'Device disconnected' : 'Device not found' });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Get Bluetooth server status
  app.get('/api/bluetooth/status', (req: any, res: any) => {
    res.json(bluetoothServer.getServiceStatus());
  });

  return bluetoothServer;
} 