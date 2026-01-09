// backend/app.js
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();

// Update this to your frontend origin in production
const FRONTEND_ORIGIN ="https://learn-web-sockets.vercel.app"|| 'http://localhost:5173';

app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: FRONTEND_ORIGIN, credentials: true }
});

// In-memory user registry
const usersBySocket = new Map();     // socket.id -> { name }
const socketIdByName = new Map();    // name -> socket.id

io.on('connection', (socket) => {
  console.log('socket connected:', socket.id);

  // Register a username
  socket.on('register', (name) => {
    const clean = String(name || '').trim();
    if (!clean) return;

    // If name already taken, kick old and replace (simple rule for demo)
    const oldId = socketIdByName.get(clean);
    if (oldId && oldId !== socket.id) {
      io.sockets.sockets.get(oldId)?.disconnect(true);
    }

    usersBySocket.set(socket.id, { name: clean });
    socketIdByName.set(clean, socket.id);

    io.emit('users:list', Array.from(socketIdByName.keys()));
  });

  // Join a room (group)
  socket.on('room:join', (room) => {
    const r = String(room || '').trim();
    if (!r) return;
    socket.join(r);
    const from = usersBySocket.get(socket.id)?.name || 'User';
    socket.to(r).emit('room:system', `${from} joined #${r}`);
  });

  // Room message
  socket.on('room:message', ({ room, text }) => {
    const r = String(room || '').trim();
    const t = String(text || '').trim();
    if (!r || !t) return;
    const from = usersBySocket.get(socket.id)?.name || 'Anon';
    io.to(r).emit('room:message', { from, text: t, ts: Date.now() });
  });

  // Direct message
  socket.on('dm:message', ({ toName, text }) => {
    const to = String(toName || '').trim();
    const t = String(text || '').trim();
    if (!to || !t) return;

    const from = usersBySocket.get(socket.id)?.name || 'Anon';
    const targetId = socketIdByName.get(to);
    if (targetId) {
      io.to(targetId).emit('dm:message', { from, text: t, ts: Date.now() });
    } else {
      socket.emit('dm:error', `User ${to} not found`);
    }
  });

  socket.on('disconnect', () => {
    const name = usersBySocket.get(socket.id)?.name;
    if (name) socketIdByName.delete(name);
    usersBySocket.delete(socket.id);
    io.emit('users:list', Array.from(socketIdByName.keys()));
  });
});

app.get('/', (_, res) => res.send('Socket.IO chat server running'));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`server started at http://localhost:${PORT}`);
});
