import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const CID_KEY = 'magnat-client-id';
const SESSION_KEY = 'magnat-online-session';
const SNAP_KEY = 'magnat-online-snapshot';
const PROFILE_KEY = 'magnat-profile';

const read = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
};
const write = (key, value) => {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* stockage plein ou indisponible */
  }
};

/** Identifiant stable de ce navigateur : permet de retrouver sa place après un rechargement. */
function clientId() {
  let id = read(CID_KEY);
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    write(CID_KEY, id);
  }
  return id;
}

export const hasOnlineSession = () => !!read(SESSION_KEY)?.code;
export const loadProfile = () => read(PROFILE_KEY) || { name: '', token: '🎩' };
export const saveProfile = (p) => write(PROFILE_KEY, p);

/**
 * Connexion au serveur. L'adresse est la même que la page (en dev, Vite relaie vers le port 3001).
 * VITE_SERVER_URL permet de pointer vers un serveur hébergé ailleurs.
 */
export function useOnline() {
  const [status, setStatus] = useState('connecting'); // connecting | online | offline
  const [room, setRoom] = useState(null);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);

  const emit = useCallback(
    (event, payload = {}) =>
      new Promise((resolve) => {
        const socket = socketRef.current;
        if (!socket?.connected) {
          setError('Connexion au serveur perdue. Reconnexion en cours…');
          resolve({ ok: false });
          return;
        }
        socket.timeout(8000).emit(event, payload, (err, res) => {
          if (err) {
            setError('Le serveur ne répond pas.');
            resolve({ ok: false });
          } else {
            if (!res?.ok && res?.error) setError(res.error);
            resolve(res || { ok: false });
          }
        });
      }),
    []
  );

  // Rejoint la dernière salle ; si le serveur l'a oubliée (redémarrage), on la restaure.
  const rejoin = useCallback(async () => {
    const session = read(SESSION_KEY);
    if (!session?.code) return;
    const res = await emitQuiet(socketRef.current, 'room:join', { code: session.code, profile: loadProfile() });
    if (res.ok) return;
    const snap = read(SNAP_KEY);
    if (snap?.code === session.code && snap.you >= 0) {
      const r = await emitQuiet(socketRef.current, 'room:restore', { snapshot: snap });
      if (r.ok) return;
    }
    write(SESSION_KEY, null);
    setError(res.error || 'Impossible de retrouver la salle.');
  }, []);

  useEffect(() => {
    const url = import.meta.env.VITE_SERVER_URL || undefined;
    const socket = io(url, { auth: { clientId: clientId() } });
    socketRef.current = socket;
    socket.on('connect', () => {
      setStatus('online');
      setError(null);
      rejoin();
    });
    socket.on('disconnect', () => setStatus('offline'));
    socket.on('connect_error', () => setStatus('offline'));
    socket.on('room', (view) => {
      setRoom(view);
      write(SESSION_KEY, { code: view.code });
      if (view.you >= 0) write(SNAP_KEY, view);
    });
    socket.on('oops', (msg) => setError(msg));
    socket.on('kicked', () => {
      setRoom(null);
      write(SESSION_KEY, null);
      setError('L’hôte vous a retiré de la salle.');
    });
    return () => socket.disconnect();
  }, [rejoin]);

  const create = (profile) => {
    saveProfile(profile);
    return emit('room:create', { profile });
  };
  const join = (code, profile) => {
    saveProfile(profile);
    return emit('room:join', { code: code.trim().toUpperCase(), profile });
  };
  const leave = async () => {
    await emit('room:leave');
    write(SESSION_KEY, null);
    write(SNAP_KEY, null);
    setRoom(null);
  };

  return { status, room, error, clearError: () => setError(null), emit, create, join, leave };
}

function emitQuiet(socket, event, payload) {
  return new Promise((resolve) => {
    if (!socket?.connected) return resolve({ ok: false });
    socket.timeout(8000).emit(event, payload, (err, res) => resolve(err ? { ok: false } : res || { ok: false }));
  });
}
