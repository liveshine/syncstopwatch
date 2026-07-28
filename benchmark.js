const { io } = require('socket.io-client');
const { performance } = require('perf_hooks');

const NUM_CLIENTS = 1000;
const URL = 'http://localhost:3000';

// Measure event loop lag continuously
let maxLag = 0;
let lastCheck = performance.now();
const lagInterval = setInterval(() => {
  const now = performance.now();
  const lag = now - lastCheck - 10;
  if (lag > maxLag) maxLag = lag;
  lastCheck = now;
}, 10);

(async () => {
  const sockets = [];
  const startTime = performance.now();
  let connectedCount = 0;
  let syncStateCount = 0;

  const allConnected = new Promise(resolve => {
    for (let i = 0; i < NUM_CLIENTS; i++) {
      const socket = io(URL, { query: { room: 'room_' + Math.floor(i / 10) } });
      socket.on('connect', () => {
        connectedCount++;
        socket.emit('start'); // this will trigger broadcast and saveDB
        if (connectedCount === NUM_CLIENTS) resolve();
      });
      socket.on('sync_state', () => {
        syncStateCount++;
      });
      sockets.push(socket);
    }
  });

  await allConnected;

  // wait a bit for messages to be processed
  await new Promise(r => setTimeout(r, 1000));

  const elapsed = performance.now() - startTime;
  console.log(`Connected ${NUM_CLIENTS} clients in ${elapsed.toFixed(2)}ms`);
  console.log(`Max Event Loop Lag: ${maxLag.toFixed(2)}ms`);
  console.log(`Received ${syncStateCount} sync_state messages`);

  sockets.forEach(s => s.disconnect());
  clearInterval(lagInterval);
  process.exit(0);
})();
