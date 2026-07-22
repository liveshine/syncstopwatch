const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Serve static files directly from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

let startTime = null;
let isRunning = false;

io.on('connection', (socket) => {
  // Sync state for newly connected phones
  socket.emit('timer_state', { isRunning, startTime });
  
  // Broadcast connected count to everyone
  io.emit('connected_count', io.engine.clientsCount);

  // START
  socket.on('start_timer', () => {
    if (!isRunning) {
      startTime = Date.now();
      isRunning = true;
      io.emit('timer_started', startTime);
    }
  });

  // STOP
  socket.on('stop_timer', () => {
    if (isRunning) {
      const dur = Date.now() - startTime;
      isRunning = false;
      io.emit('timer_stopped', dur);
    }
  });

  // RESET
  socket.on('reset_timer', () => {
    startTime = null;
    isRunning = false;
    io.emit('timer_reset');
  });

  // DISCONNECT
  socket.on('disconnect', () => {
    io.emit('connected_count', io.engine.clientsCount);
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`Listening on port ${port}`));
