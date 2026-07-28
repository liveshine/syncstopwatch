const { io } = require("socket.io-client");
const http = require("http");

async function runBenchmark() {
  const socket = io("http://localhost:3000");

  await new Promise(resolve => socket.on("connect", resolve));

  const numRequests = 500;

  // Baseline latency
  let startPing = Date.now();
  socket.emit("sync_ping", startPing);
  await new Promise(resolve => socket.once("sync_pong", resolve));
  let baseLatency = Date.now() - startPing;

  // Spam save_cloud_history
  const startTime = Date.now();
  for(let i=0; i<numRequests; i++) {
    socket.emit("save_cloud_history", { syncKey: "test", data: { foo: i, largeArray: new Array(1000).fill(i) } });
  }

  // Ping immediately after spamming to see event loop delay
  startPing = Date.now();
  socket.emit("sync_ping", startPing);
  await new Promise(resolve => socket.once("sync_pong", resolve));
  let blockedLatency = Date.now() - startPing;

  const totalTime = Date.now() - startTime;

  console.log(`Base Ping Latency: ${baseLatency}ms`);
  console.log(`Blocked Ping Latency: ${blockedLatency}ms`);
  console.log(`Total time for ${numRequests} ops + ping: ${totalTime}ms`);

  socket.disconnect();
}

runBenchmark().catch(console.error);
