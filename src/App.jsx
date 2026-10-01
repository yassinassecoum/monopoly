import { useState } from 'react';
import LocalGame from './LocalGame.jsx';
import OnlineGame from './OnlineGame.jsx';
import { hasOnlineSession } from './net/useOnline.js';

function initialMode() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('salle') || hasOnlineSession()) return 'online';
  return 'local';
}

export default function App() {
  const [mode, setMode] = useState(initialMode);
  if (mode === 'online') return <OnlineGame onBack={() => setMode('local')} />;
  return <LocalGame onOnline={() => setMode('online')} />;
}
