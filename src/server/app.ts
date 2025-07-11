import express, { Request, Response } from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { generateQRCode } from '../utils/qr-code.js'
// import { createBluetoothServer } from './bluetooth-server.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 8080

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, '../../test-results')))

// Initialize Bluetooth simulator
// const bluetoothServer = createBluetoothServer(app)

// Routes
app.get('/', (req: Request, res: Response) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>QR + Bluetooth Demo</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .card { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .qr-container { text-align: center; }
        .qr-code { max-width: 300px; height: auto; }
        .button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
        .button:hover { background: #0056b3; }
      </style>
    </head>
    <body>
      <h1>🔗 QR + Bluetooth Demo Server</h1>
      
      <div class="card">
        <h2>📱 Mobile Connection</h2>
        <p>Scan the QR code below to open the mobile demo on your phone:</p>
        <div class="qr-container" id="mobileQR"></div>
        <p><a href="/mobile" class="button">Open Mobile Demo</a></p>
      </div>

      <div class="card">
        <h2>🔍 QR Code Generator</h2>
        <p>Generate QR codes for different types of data:</p>
        <button onclick="generateDeviceQR()" class="button">Device Pairing QR</button>
        <button onclick="generateConnectionQR()" class="button">Connection Instructions QR</button>
        <button onclick="generateTransferQR()" class="button">Credential Transfer QR</button>
        <div id="generatedQR"></div>
      </div>

      <div class="card">
        <h2>📊 Server Status</h2>
        <p>✅ Server running on port ${PORT}</p>
        <p>🌐 Accessible at: ${req.protocol}://${req.get('host')}</p>
      </div>

      <script>
        // Generate mobile QR code on page load
        window.onload = function() {
          const mobileUrl = window.location.origin + '/mobile';
          fetch('/api/qr?data=' + encodeURIComponent(mobileUrl))
            .then(response => response.text())
            .then(dataUrl => {
              document.getElementById('mobileQR').innerHTML = '<img src="' + dataUrl + '" alt="Mobile QR Code" class="qr-code">';
            });
        };

        function generateDeviceQR() {
          const deviceInfo = {
            type: 'device-pairing',
            deviceId: 'device-' + Date.now(),
            deviceName: 'Open Verifiable Device',
            capabilities: ['bluetooth', 'qr-code', 'credentials'],
            bluetoothService: '0000ff00-0000-1000-8000-00805f9b34fb',
            timestamp: new Date().toISOString()
          };
          
          fetch('/api/qr?data=' + encodeURIComponent(JSON.stringify(deviceInfo, null, 2)))
            .then(response => response.text())
            .then(dataUrl => {
              document.getElementById('generatedQR').innerHTML = '<h3>Device Pairing QR:</h3><img src="' + dataUrl + '" alt="Device Pairing QR" class="qr-code">';
            });
        }

        function generateConnectionQR() {
          const connectionInfo = {
            type: 'bluetooth-connection',
            steps: [
              '1. Enable Bluetooth on your device',
              '2. Open Bluetooth settings',
              '3. Look for "Open Verifiable Device"',
              '4. Tap to pair',
              '5. Enter PIN if prompted'
            ],
            deviceName: 'Open Verifiable Device',
            serviceUUID: '0000ff00-0000-1000-8000-00805f9b34fb',
            characteristicUUID: '0000ff01-0000-1000-8000-00805f9b34fb'
          };
          
          fetch('/api/qr?data=' + encodeURIComponent(JSON.stringify(connectionInfo, null, 2)))
            .then(response => response.text())
            .then(dataUrl => {
              document.getElementById('generatedQR').innerHTML = '<h3>Connection Instructions QR:</h3><img src="' + dataUrl + '" alt="Connection Instructions QR" class="qr-code">';
            });
        }

        function generateTransferQR() {
          const transferInfo = {
            type: 'credential-transfer-request',
            requestId: 'req-' + Date.now(),
            requestedCredentials: ['email', 'name', 'phone'],
            transferMethod: 'bluetooth',
            deviceId: 'device-' + Date.now(),
            expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString()
          };
          
          fetch('/api/qr?data=' + encodeURIComponent(JSON.stringify(transferInfo, null, 2)))
            .then(response => response.text())
            .then(dataUrl => {
              document.getElementById('generatedQR').innerHTML = '<h3>Credential Transfer QR:</h3><img src="' + dataUrl + '" alt="Credential Transfer QR" class="qr-code">';
            });
        }
      </script>
    </body>
    </html>
  `)
})

// Mobile demo page
app.get('/mobile', (req: Request, res: Response) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Mobile Bluetooth Demo</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; }
        .card { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .button { background: #007bff; color: white; padding: 15px 20px; border: none; border-radius: 4px; cursor: pointer; width: 100%; font-size: 16px; margin: 10px 0; }
        .button:hover { background: #0056b3; }
        .button:disabled { background: #ccc; cursor: not-allowed; }
        input, textarea { width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
        .log { background: #222; color: #b2ffb2; font-family: monospace; padding: 15px; border-radius: 6px; margin: 10px 0; min-height: 100px; overflow-y: auto; }
        .status { padding: 10px; border-radius: 4px; margin: 10px 0; }
        .status.connected { background: #d4edda; color: #155724; }
        .status.disconnected { background: #f8d7da; color: #721c24; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>📱 Mobile Bluetooth Demo</h1>
        
        <div class="card">
          <h2>🔗 Connect to Device</h2>
          <div id="connectionStatus" class="status disconnected">Not connected</div>
          <button onclick="connectBluetooth()" class="button" id="connectBtn">Connect via Bluetooth</button>
          <button onclick="disconnectBluetooth()" class="button" id="disconnectBtn" disabled>Disconnect</button>
        </div>

        <div class="card">
          <h2>📤 Send Data</h2>
          <textarea id="sendData" placeholder="Enter data to send..." rows="3">{"message": "Hello from mobile!", "timestamp": "${new Date().toISOString()}"}</textarea>
          <button onclick="sendData()" class="button" id="sendBtn" disabled>Send Data</button>
        </div>

        <div class="card">
          <h2>📥 Receive Data</h2>
          <button onclick="startReceiving()" class="button" id="receiveBtn" disabled>Start Receiving</button>
          <button onclick="stopReceiving()" class="button" id="stopReceiveBtn" disabled>Stop Receiving</button>
        </div>

        <div class="card">
          <h2>📋 Activity Log</h2>
          <div class="log" id="log"></div>
          <button onclick="clearLog()" class="button">Clear Log</button>
        </div>
      </div>

      <script>
        let device = null;
        let server = null;
        let service = null;
        let characteristic = null;
        let isReceiving = false;

        function log(msg) {
          const logDiv = document.getElementById('log');
          logDiv.innerHTML += '<div>' + new Date().toLocaleTimeString() + ': ' + msg + '</div>';
          logDiv.scrollTop = logDiv.scrollHeight;
        }

        function updateStatus(connected) {
          const statusDiv = document.getElementById('connectionStatus');
          const connectBtn = document.getElementById('connectBtn');
          const disconnectBtn = document.getElementById('disconnectBtn');
          const sendBtn = document.getElementById('sendBtn');
          const receiveBtn = document.getElementById('receiveBtn');

          if (connected) {
            statusDiv.textContent = 'Connected to ' + (device?.name || 'Unknown Device');
            statusDiv.className = 'status connected';
            connectBtn.disabled = true;
            disconnectBtn.disabled = false;
            sendBtn.disabled = false;
            receiveBtn.disabled = false;
          } else {
            statusDiv.textContent = 'Not connected';
            statusDiv.className = 'status disconnected';
            connectBtn.disabled = false;
            disconnectBtn.disabled = true;
            sendBtn.disabled = true;
            receiveBtn.disabled = true;
            document.getElementById('stopReceiveBtn').disabled = true;
          }
        }

        async function connectBluetooth() {
          try {
            log('Requesting Bluetooth device...');
            device = await navigator.bluetooth.requestDevice({
              filters: [{ services: ['0000ff00-0000-1000-8000-00805f9b34fb'] }],
              optionalServices: ['0000ff00-0000-1000-8000-00805f9b34fb']
            });
            
            log('Connecting to GATT server...');
            server = await device.gatt.connect();
            
            log('Getting service...');
            service = await server.getPrimaryService('0000ff00-0000-1000-8000-00805f9b34fb');
            
            log('Getting characteristic...');
            characteristic = await service.getCharacteristic('0000ff01-0000-1000-8000-00805f9b34fb');
            
            log('Bluetooth connected successfully!');
            updateStatus(true);
          } catch (error) {
            log('Connection failed: ' + error.message);
            updateStatus(false);
          }
        }

        async function disconnectBluetooth() {
          if (server && server.connected) {
            await server.disconnect();
            log('Disconnected from Bluetooth device');
          }
          device = null;
          server = null;
          service = null;
          characteristic = null;
          updateStatus(false);
        }

        async function sendData() {
          if (!characteristic) {
            log('Not connected to any device');
            return;
          }

          try {
            const data = document.getElementById('sendData').value;
            const encoder = new TextEncoder();
            await characteristic.writeValue(encoder.encode(data));
            log('Data sent: ' + data);
          } catch (error) {
            log('Send failed: ' + error.message);
          }
        }

        async function startReceiving() {
          if (!characteristic) {
            log('Not connected to any device');
            return;
          }

          try {
            await characteristic.startNotifications();
            characteristic.addEventListener('characteristicvaluechanged', handleReceivedData);
            isReceiving = true;
            document.getElementById('receiveBtn').disabled = true;
            document.getElementById('stopReceiveBtn').disabled = false;
            log('Started receiving data...');
          } catch (error) {
            log('Failed to start receiving: ' + error.message);
          }
        }

        function handleReceivedData(event) {
          const value = event.target.value;
          const decoder = new TextDecoder();
          const data = decoder.decode(value);
          log('Received: ' + data);
        }

        async function stopReceiving() {
          if (characteristic && isReceiving) {
            await characteristic.stopNotifications();
            characteristic.removeEventListener('characteristicvaluechanged', handleReceivedData);
            isReceiving = false;
            document.getElementById('receiveBtn').disabled = false;
            document.getElementById('stopReceiveBtn').disabled = true;
            log('Stopped receiving data');
          }
        }

        function clearLog() {
          document.getElementById('log').innerHTML = '';
        }

        // Handle page unload
        window.addEventListener('beforeunload', () => {
          if (server && server.connected) {
            server.disconnect();
          }
        });
      </script>
    </body>
    </html>
  `)
})

// API route to generate QR codes
app.get('/api/qr', async (req: Request, res: Response) => {
  try {
    const data = req.query.data as string
    if (!data) {
      return res.status(400).send('Missing data parameter')
    }

    const qrCode = await generateQRCode(data, { compress: false })
    
    // Return the data URL directly for use in img tags
    res.setHeader('Content-Type', 'text/plain')
    res.send(qrCode)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).send('Error generating QR code: ' + errorMessage)
  }
})

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📱 Mobile demo: http://localhost:${PORT}/mobile`)
  console.log(`🔗 Main page: http://localhost:${PORT}/`)
  console.log(`📊 Health check: http://localhost:${PORT}/health`)
})

export default app 