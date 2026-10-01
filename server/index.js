// Serveur Magnat : sert le jeu compilé et synchronise les parties en ligne.
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import { Server } from 'socket.io';
import { RoomManager, GameError } from './rooms.js';

const PORT = process.env.PORT || 3001;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, '..', 'dist');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: true },
  pingInterval: 20000,
  pingTimeout: 20000,
  maxHttpBufferSize: 2e6, // une partie restaurée pèse quelques centaines de Ko max
});

app.get('/health', (_req, res) => res.json({ ok: true, rooms: rooms.rooms.size }));

// En production, le serveur sert aussi le jeu compilé (npm run build)
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get('*', (_req, res) => res.sendFile(path.join(DIST, 'index.html')));
} else {
  app.get('/', (_req, res) =>
    res.send('Serveur Magnat actif. En développement, ouvrez le jeu via Vite (http://localhost:5173).')
  );
}

/** Envoie à chaque joueur de la salle sa propre vue. */
function broadcast(room) {
  const sockets = io.sockets.adapter.rooms.get(room.code);
  if (!sockets) return;
  for (const id of sockets) {
    const socket = io.sockets.sockets.get(id);
    if (socket) socket.emit('room', rooms.view(room, socket.data.clientId));
  }
}

const rooms = new RoomManager({ onChange: broadcast });
setInterval(() => rooms.sweep(), 10 * 60 * 1000);

io.on('connection', (socket) => {
  const clientId = String(socket.handshake.auth?.clientId || '').slice(0, 64);
  if (!clientId) {
    socket.disconnect(true);
    return;
  }
  socket.data.clientId = clientId;

  const enter = (room) => {
    if (socket.data.code && socket.data.code !== room.code) socket.leave(socket.data.code);
    socket.data.code = room.code;
    socket.join(room.code);
    broadcast(room);
  };

  // Enveloppe chaque handler : les erreurs de jeu sont renvoyées au joueur
  const on = (event, fn) =>
    socket.on(event, (payload = {}, ack) => {
      try {
        fn(payload);
        if (typeof ack === 'function') ack({ ok: true });
      } catch (e) {
        const message = e instanceof GameError ? e.message : 'Erreur du serveur.';
        if (!(e instanceof GameError)) console.error(e);
        if (typeof ack === 'function') ack({ ok: false, error: message });
        else socket.emit('oops', message);
      }
    });

  const code = () => socket.data.code;

  on('room:create', ({ profile }) => enter(rooms.create(clientId, profile)));
  on('room:join', ({ code: c, profile }) => enter(rooms.join(c, clientId, profile)));
  on('room:restore', ({ snapshot }) => enter(rooms.restore(clientId, snapshot)));
  on('room:leave', () => {
    if (!code()) return;
    const c = code();
    rooms.leave(c, clientId);
    socket.leave(c);
    socket.data.code = null;
  });

  on('lobby:profile', (patch) => rooms.updateProfile(code(), clientId, patch));
  on('lobby:addBot', () => rooms.addBot(code(), clientId));
  on('lobby:kick', ({ seat }) => {
    const kicked = rooms.kick(code(), clientId, seat);
    if (kicked) {
      for (const s of io.sockets.sockets.values()) {
        if (s.data.clientId === kicked && s.data.code === code()) {
          s.leave(code());
          s.data.code = null;
          s.emit('kicked');
        }
      }
    }
  });
  on('lobby:settings', (settings) => rooms.setSettings(code(), clientId, settings));
  on('lobby:start', () => rooms.start(code(), clientId));

  on('game:action', ({ action }) => rooms.action(code(), clientId, action));
  on('game:botify', ({ seat }) => rooms.botify(code(), clientId, seat));
  on('game:takeBack', () => rooms.takeBack(code(), clientId));
  on('game:lobby', () => rooms.backToLobby(code(), clientId));

  on('trade:propose', ({ offer }) => rooms.proposeTrade(code(), clientId, offer));
  on('trade:answer', ({ accept }) => rooms.answerTrade(code(), clientId, !!accept));
  on('trade:cancel', () => rooms.cancelTrade(code(), clientId));

  socket.on('disconnect', () => {
    // Un même joueur peut avoir plusieurs onglets : on ne le marque absent que s'il n'en reste aucun
    const stillHere = [...io.sockets.sockets.values()].some((s) => s.data.clientId === clientId);
    if (!stillHere) rooms.setConnected(clientId, false);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Serveur Magnat sur http://localhost:${PORT}`);
});
