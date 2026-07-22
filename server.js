const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

app.use((req, res) => {
  const indexPath = path.join(publicPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send(`<h2>Error: Missing File</h2><p>Folder must be named "public".</p>`);
  }
});

let startTime = null;
let isRunning = false;

io.on('connection', socket => {
  // CLOCK DRIFT FIX: Send how long the timer has been running, not the raw timestamp
  const elapsedSoFar = isRunning ? (Date.now() - startTime) : 0;
  socket.emit('timer_state', { isRunning, elapsedSoFar });
  io.emit('connected_count', io.engine.clientsCount);

  socket.on('request_state', () => {
    const elapsedSoFar = isRunning ? (Date.now() - startTime) : 0;
    socket.emit('timer_state', { isRunning, elapsedSoFar });
  });

  socket.on('start_timer', () => {
    if (!isRunning) {
      startTime = Date.now();
      isRunning = true;
      io.emit('timer_started'); // Just sends "GO!", no timestamp needed
    }
  });

  socket.on('stop_timer', () => {
    if (isRunning) {
      const dur = Date.now() - startTime; // Server calculates the exact official time
      isRunning = false;
      io.emit('timer_stopped', dur);
    }
  });

  socket.on('reset_timer', () => {
    startTime = null;
    isRunning = false;
    io.emit('timer_reset');
  });

  socket.on('ping_check', (timestamp, callback) => {
    callback(); 
  });

  socket.on('disconnect', () => {
    io.emit('connected_count', io.engine.clientsCount);
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`Listening on port ${port}`));
