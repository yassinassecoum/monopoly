import { useCallback, useEffect, useReducer, useState } from 'react';
import { reducer } from './game/logic.js';
import { botAction } from './game/bot.js';
import Setup from './components/Setup.jsx';
import GameView from './components/GameView.jsx';
import GameOver from './components/GameOver.jsx';
import Rules from './components/Rules.jsx';

const SAVE_KEY = 'magnat-save-v1';

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Partie sur un seul écran (joueurs humains à tour de rôle + ordinateurs). */
export default function LocalGame({ onOnline }) {
  const [state, dispatch] = useReducer(reducer, { phase: 'setup' });
  const [paused, setPaused] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [saved, setSaved] = useState(loadSave);

  // Animation du pion case par case
  useEffect(() => {
    if (state.phase !== 'playing' || !state.moving) return;
    const t = setTimeout(() => dispatch({ type: 'STEP' }), (state.moving.delay ? 1200 : 160) / speed);
    return () => clearTimeout(t);
  }, [state, speed]);

  // Les joueurs ordinateur jouent tout seuls
  useEffect(() => {
    if (state.phase !== 'playing' || state.moving || paused) return;
    const action = botAction(state);
    if (!action) return;
    const wait = action.type === 'CARD_OK' ? 2200 : 700;
    const t = setTimeout(() => dispatch(action), wait / speed);
    return () => clearTimeout(t);
  }, [state, speed, paused]);

  // Sauvegarde automatique
  useEffect(() => {
    try {
      if (state.phase === 'playing') localStorage.setItem(SAVE_KEY, JSON.stringify(state));
      if (state.phase === 'over') localStorage.removeItem(SAVE_KEY);
    } catch {
      /* stockage indisponible : on continue sans sauvegarde */
    }
  }, [state]);

  const canControl = useCallback((pid) => !state.players?.[pid]?.isBot, [state.players]);

  if (state.phase === 'setup') {
    return (
      <Setup
        saved={saved}
        onStart={(players, settings) => dispatch({ type: 'NEW_GAME', players, settings })}
        onResume={() => dispatch({ type: 'LOAD', state: saved })}
        onDiscard={() => {
          try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
          setSaved(null);
        }}
        onRules={() => setShowRules(true)}
        onOnline={onOnline}
        rules={showRules && <Rules onClose={() => setShowRules(false)} />}
      />
    );
  }

  const quit = () => {
    if (confirm('Quitter la partie ? Elle reste sauvegardée et vous pourrez la reprendre.')) {
      setSaved(loadSave());
      dispatch({ type: 'RESET' });
    }
  };

  return (
    <GameView
      state={state}
      dispatch={dispatch}
      canControl={canControl}
      onModalChange={setPaused}
      toolbar={
        <>
          <label className="speed">
            Vitesse
            <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
              <option value={0.6}>Lente</option>
              <option value={1}>Normale</option>
              <option value={2}>Rapide</option>
              <option value={4}>Éclair</option>
            </select>
          </label>
          <button className="btn ghost" onClick={quit}>Quitter</button>
        </>
      }
    >
      {state.phase === 'over' && (
        <GameOver state={state}>
          <button className="btn primary big" onClick={() => { setSaved(null); dispatch({ type: 'RESET' }); }}>
            Nouvelle partie
          </button>
        </GameOver>
      )}
    </GameView>
  );
}
