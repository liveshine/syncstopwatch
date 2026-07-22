const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);

// UPGRADE 1: Open the server to all phone browsers (CORS bypass)
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
  socket.emit('timer_state', { isRunning, startTime });
  io.emit('connected_count', io.engine.clientsCount);

  // UPGRADE 2: If a phone wakes up from sleep, let it ask for the current time
  socket.on('request_state', () => {
    socket.emit('timer_state', { isRunning, startTime });
  });

  socket.on('start_timer', () => {
    if (!isRunning) {
      startTime = Date.now();
      isRunning = true;
      io.emit('timer_started', startTime);
    }
  });

  socket.on('stop_timer', () => {
    if (isRunning) {
      const dur = Date.now() - startTime;
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
