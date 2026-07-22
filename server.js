const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// Persistent Storage for Rooms
const DB_FILE = path.join(__dirname, 'db.json');
let rooms = new Map();
if (fs.existsSync(DB_FILE)) {
  try { rooms = new Map(Object.entries(JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')))); } catch (e) { }
}
const saveDB = () => fs.writeFileSync(DB_FILE, JSON.stringify(Object.fromEntries(rooms)));

// NEW: Persistent Storage for User History (Cloud)
const HISTORY_FILE = path.join(__dirname, 'history.json');
let userHistory = new Map();
if (fs.existsSync(HISTORY_FILE)) {
  try { userHistory = new Map(Object.entries(JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8')))); } catch (e) { }
}
const saveHistoryDB = () => fs.writeFileSync(HISTORY_FILE, JSON.stringify(Object.fromEntries(userHistory)));


io.on('connection', socket => {
  // Latency Sync
  socket.on('sync_ping', (clientTime) => socket.emit('sync_pong', { clientTime, serverTime: Date.now() }));

  // --- NEW: CLOUD HISTORY LOGIC ---
  socket.on('get_cloud_history', (syncKey) => {
    const hist = userHistory.get(syncKey) || [];
    socket.emit('cloud_history_data', hist);
  });

  socket.on('save_cloud_history', ({ syncKey, data }) => {
    userHistory.set(syncKey, data);
    saveHistoryDB();
  });
  // ---------------------------------

  const roomId = socket.handshake.query.room || 'main';
  const aboutText = socket.handshake.query.about || ''; 
  
  socket.join(roomId);

  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      host: socket.id, permission: 'host_only', isRunning: false,
      startTime: null, elapsed: 0, laps: [], mode: 'stopwatch',
      countdownDuration: 60000, about: aboutText
    });
    saveDB();
  }

  const room = rooms.get(roomId);

  if (aboutText && !room.about && room.host === socket.id) {
      room.about = aboutText; saveDB();
  }
  if (!room.host || !io.sockets.sockets.get(room.host)) {
    room.host = socket.id; saveDB();
  }

  const broadcast = () => {
    const clientsCount = io.sockets.adapter.rooms.get(roomId)?.size || 0;
    io.to(roomId).emit('sync_state', { ...room, clientsCount });
    saveDB();
  };

  broadcast();

  const canControl = (id) => room.permission === 'anyone' || id === room.host;

  socket.on('start', () => {
    if (!canControl(socket.id) || room.isRunning) return;
    room.startTime = Date.now() - room.elapsed;
    room.isRunning = true;
    io.to(roomId).emit('audio_cue', 'start'); broadcast();
  });

  socket.on('stop', () => {
    if (!canControl(socket.id) || !room.isRunning) return;
    room.elapsed = Date.now() - room.startTime;
    room.isRunning = false;
    io.to(roomId).emit('audio_cue', 'stop'); broadcast();
  });

  socket.on('lap', () => {
    if (!canControl(socket.id) || !room.isRunning) return;
    const current = Date.now() - room.startTime;
    room.laps.push(current);
    io.to(roomId).emit('audio_cue', 'lap'); broadcast();
  });

  socket.on('reset', () => {
    if (!canControl(socket.id)) return;
    room.startTime = null; room.isRunning = false;
    room.elapsed = 0; room.laps = [];
    io.to(roomId).emit('audio_cue', 'reset'); broadcast();
  });

  socket.on('set_mode', (data) => {
    if (!canControl(socket.id)) return;
    room.mode = data.mode;
    if (data.duration) room.countdownDuration = data.duration;
    room.startTime = null; room.isRunning = false;
    room.elapsed = 0; room.laps = []; broadcast();
  });

  socket.on('set_permission', (perm) => {
    if (socket.id !== room.host) return; 
    room.permission = perm; broadcast();
  });

  socket.on('disconnect', () => {
    const clients = io.sockets.adapter.rooms.get(roomId);
    if (room.host === socket.id && clients && clients.size > 0) {
      room.host = [...clients][0]; 
    }
    broadcast();
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`Listening on port ${port}`));
