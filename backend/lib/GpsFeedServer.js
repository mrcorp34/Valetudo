// Node.js GPS feed WebSocket server for Valetudo
// Reads ASCII statements from COM4 and broadcasts to all connected clients

const { SerialPort } = require('serialport');
const WebSocket = require('ws');

const PORT = 'COM3';
const BAUD = 115200;
const WS_PORT = 8089;

const serial = new SerialPort({ path: PORT, baudRate: BAUD });
const wss = new WebSocket.Server({ port: WS_PORT });

console.log(`GPSFeedServer: Listening on ${PORT} and WebSocket port ${WS_PORT}`);

wss.on('connection', ws => {
    console.log('WebSocket client connected');
});

serial.on('data', data => {
    const line = data.toString('ascii');
   // console.log('Serial data:', line.trim());
    // Broadcast to all clients
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(line);
          //  console.log('Sent to WebSocket:', line.trim());
        }
    });
});

serial.on('error', err => {
    console.error('Serial error:', err);
});
