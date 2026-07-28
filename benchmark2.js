const { io } = require('socket.io-client');
const { performance } = require('perf_hooks');

const NUM_CLIENTS = 100;
const URL = 'http://localhost:3000';

(async () => {
  const sockets = [];
  const startTime = performance.now();
  let connectedCount = 0;

  const pingSocket = io(URL, { query: { room: 'ping_room' } });

  let maxServerLatency = 0;

  pingSocket.on('connect', () => {
    // start pinging
    setInterval(() => {
      pingSocket.emit('sync_ping', performance.now());
    }, 50);
  });

  pingSocket.on('sync_pong', (data) => {
    const latency = performance.now() - data.clientTime;
    if (latency > maxServerLatency) {
      maxServerLatency = latency;
    }
  });

  await new Promise(r => setTimeout(r, 500)); // wait for ping to start

  const allConnected = new Promise(resolve => {
    for (let i = 0; i < NUM_CLIENTS; i++) {
      const socket = io(URL, { query: { room: 'room_' + i } });
      socket.on('connect', () => {
        connectedCount++;
        socket.emit('start');
        if (connectedCount === NUM_CLIENTS) resolve();
      });
      sockets.push(socket);
    }
  });

  await allConnected;
  await new Promise(r => setTimeout(r, 1000));

  console.log(`Connected ${NUM_CLIENTS} clients`);
  console.log(`Max Server Latency (via ping): ${maxServerLatency.toFixed(2)}ms`);

  sockets.forEach(s => s.disconnect());
  pingSocket.disconnect();
  process.exit(0);
})();
