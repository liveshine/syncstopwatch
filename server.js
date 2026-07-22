const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// Persistent Storage (Simple JSON file)
const DB_FILE = path.join(__dirname, 'db.json');
let rooms = new Map();

if (fs.existsSync(DB_FILE)) {
  try {
    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    rooms = new Map(Object.entries(data));
  } catch (e) {
    console.error("Could not load DB");
  }
}

const saveDB = () => {
  fs.writeFileSync(DB_FILE, JSON.stringify(Object.fromEntries(rooms)));
};

io.on('connection', socket => {
  // Latency Synchronization (Ping/Pong)
  socket.on('sync_ping', (clientTime) => {
    socket.emit('sync_pong', { clientTime, serverTime: Date.now() });
  });

  // Rooms Integration
  const roomId = socket.handshake.query.room || 'main';
  const aboutText = socket.handshake.query.about || ''; // Capture "About" from URL
  
  socket.join(roomId);

  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      host: socket.id,
      permission: 'host_only', 
      isRunning: false,
      startTime: null,
      elapsed: 0,
      laps: [],
      mode: 'stopwatch',
      countdownDuration: 60000,
      about: aboutText // Save "About" to the room database
    });
    saveDB();
  }

  const room = rooms.get(roomId);

  // If the room already existed but the host is updating the 'about' text
  if (aboutText && !room.about && room.host === socket.id) {
      room.about = aboutText;
      saveDB();
  }

  // Role-Based Permissions (Assign host if room is empty)
  if (!room.host || !io.sockets.sockets.get(room.host)) {
    room.host = socket.id;
    saveDB();
  }

  const broadcast = () => {
    const clientsCount = io.sockets.adapter.rooms.get(roomId)?.size || 0;
    io.to(roomId).emit('sync_state', { ...room, clientsCount });
    saveDB();
  };

  broadcast();

  // Helper function to check if a user is allowed to control the timer
  const canControl = (id) => room.permission === 'anyone' || id === room.host;

  socket.on('start', () => {
    if (!canControl(socket.id) || room.isRunning) return;
    room.startTime = Date.now() - room.elapsed;
    room.isRunning = true;
    io.to(roomId).emit('audio_cue', 'start');
    broadcast();
  });

  socket.on('stop', () => {
    if (!canControl(socket.id) || !room.isRunning) return;
    room.elapsed = Date.now() - room.startTime;
    room.isRunning = false;
    io.to(roomId).emit('audio_cue', 'stop');
    broadcast();
  });

  socket.on('lap', () => {
    if (!canControl(socket.id) || !room.isRunning) return;
    const current = Date.now() - room.startTime;
    room.laps.push(current);
    io.to(roomId).emit('audio_cue', 'lap');
    broadcast();
  });

  socket.on('reset', () => {
    if (!canControl(socket.id)) return;
    room.startTime = null;
    room.isRunning = false;
    room.elapsed = 0;
    room.laps = [];
    io.to(roomId).emit('audio_cue', 'reset');
    broadcast();
  });

  socket.on('set_mode', (data) => {
    if (!canControl(socket.id)) return;
    room.mode = data.mode;
    if (data.duration) room.countdownDuration = data.duration;
    room.startTime = null;
    room.isRunning = false;
    room.elapsed = 0;
    room.laps = [];
    broadcast();
  });

  // Listener to handle permission changes
  socket.on('set_permission', (perm) => {
    if (socket.id !== room.host) return; // Only the host can change this
    room.permission = perm;
    broadcast();
  });

  socket.on('disconnect', () => {
    const clients = io.sockets.adapter.rooms.get(roomId);
    if (room.host === socket.id && clients && clients.size > 0) {
      room.host = [...clients][0]; // Pass host to the next user in line
    }
    broadcast();
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`Listening on port ${port}`));
