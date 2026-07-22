const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs'); // Added filesystem module to check files

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Point exactly to the public folder
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// BULLETPROOF ROUTING: If the file is missing, tell you exactly why
app.get('*', (req, res) => {
  const indexPath = path.join(publicPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    // This will print on your screen if the folder structure is wrong
    res.status(404).send(`
      <h2 style="font-family: sans-serif;">Error: Missing File</h2>
      <p style="font-family: sans-serif;">The server is awake, but it can't find your HTML file.</p>
      <p style="font-family: sans-serif;">It is strictly looking inside this exact folder path:<br> <b>${publicPath}</b></p>
      <p style="font-family: sans-serif;">Ensure your folder in GitHub is named exactly "<b>public</b>" (all lowercase) and the file is named "<b>index.html</b>".</p>
    `);
  }
});

let startTime = null;
let isRunning = false;

io.on('connection', socket => {
  socket.emit('timer_state', { isRunning, startTime });
  io.emit('connected_count', io.engine.clientsCount);

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
