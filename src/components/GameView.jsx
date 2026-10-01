import { useEffect, useState } from 'react';
import { canRoll, canEndTurn } from '../game/logic.js';
import Board from './Board.jsx';
import PlayersPanel from './PlayersPanel.jsx';
import GameLog from './GameLog.jsx';
import PropertyModal from './PropertyModal.jsx';
import TradeModal from './TradeModal.jsx';
import Rules from './Rules.jsx';
import MobileGame from './MobileGame.jsx';

function useMediaQuery(query) {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatch(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return match;
}

/**
 * Plateau + panneaux + fenêtres. Utilisée par la partie locale et la partie en ligne.
 * - canControl(pid) : ce joueur est-il piloté depuis cet écran ?
 * - tradeFromId / onProposeTrade : qui propose les échanges, et comment les envoyer (en ligne)
 */
export default function GameView({
  state, dispatch, canControl, tradeFromId, onProposeTrade,
  toolbar, banner, playerExtra, onModalChange, children,
}) {
  const [selected, setSelected] = useState(null);
  const [trading, setTrading] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const isMobile = useMediaQuery('(max-width: 700px)');

  useEffect(() => {
    onModalChange?.(trading);
  }, [trading, onModalChange]);

  // Raccourci : Espace pour lancer / finir le tour
  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== 'Space' || state.phase !== 'playing' || selected != null || trading) return;
      if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(document.activeElement?.tagName)) return;
      if (!canControl(state.current)) return;
      e.preventDefault();
      if (canRoll(state)) dispatch({ type: 'ROLL' });
      else if (canEndTurn(state)) dispatch({ type: 'END_TURN' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state, selected, trading, canControl, dispatch]);

  const modals = (
    <>
      {selected != null && (
        <PropertyModal
          state={state}
          sqId={selected}
          dispatch={dispatch}
          canControl={canControl}
          onClose={() => setSelected(null)}
        />
      )}
      {trading && (
        <TradeModal
          state={state}
          dispatch={dispatch}
          fromId={tradeFromId ?? state.current}
          onPropose={onProposeTrade}
          onClose={() => setTrading(false)}
        />
      )}
      {showRules && <Rules onClose={() => setShowRules(false)} />}
      {children}
    </>
  );

  if (isMobile) {
    return (
      <>
        <MobileGame
          state={state}
          dispatch={dispatch}
          canControl={canControl}
          onSelect={setSelected}
          onTrade={() => setTrading(true)}
          toolbar={toolbar}
          banner={banner}
          onRules={() => setShowRules(true)}
          playerExtra={playerExtra}
          deedsPid={tradeFromId ?? state.current}
        />
        {modals}
      </>
    );
  }

  return (
    <div className="game">
      <header className="topbar">
        <h1 className="wordmark">Magnat</h1>
        <div className="topbar-tools">
          {toolbar}
          <button className="btn ghost" onClick={() => setShowRules(true)}>Règles</button>
        </div>
      </header>
      {banner}

      <main className="layout">
        <Board
          state={state}
          dispatch={dispatch}
          onSelect={setSelected}
          onTrade={() => setTrading(true)}
          canControl={canControl}
        />
        <aside className="sidebar">
          <PlayersPanel state={state} onSelect={setSelected} dispatch={dispatch} canControl={canControl} extra={playerExtra} />
          <GameLog log={state.log} />
        </aside>
      </main>

      {modals}
    </div>
  );
}
