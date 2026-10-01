import { useCallback, useEffect, useState } from 'react';
import { SQUARES } from './data/board.js';
import { useOnline } from './net/useOnline.js';
import OnlineMenu from './components/OnlineMenu.jsx';
import Lobby from './components/Lobby.jsx';
import GameView from './components/GameView.jsx';
import GameOver from './components/GameOver.jsx';
import Modal from './components/Modal.jsx';

const fmt = (n) => `${n.toLocaleString('fr-FR')} €`;

function describe(props, money, cards) {
  const parts = [...props.map((id) => SQUARES[id].name)];
  if (money) parts.push(fmt(money));
  if (cards) parts.push(`${cards} carte${cards > 1 ? 's' : ''} prison`);
  return parts.length ? parts.join(', ') : 'rien';
}

/** Offre d'échange en attente : le destinataire répond, l'auteur peut annuler. */
function PendingTrade({ room, net }) {
  const t = room.trade;
  if (!t) return null;
  const g = room.game;
  const from = g.players[t.offer.from];
  const to = g.players[t.offer.to];
  const o = t.offer;

  if (room.you === o.to) {
    return (
      <Modal label="Offre d’échange">
        <h2 className="modal-title">{from.token} {from.name} vous propose un échange</h2>
        <div className="trade-confirm">
          <p><strong>Vous recevez :</strong> {describe(o.giveProps, o.giveMoney, o.giveCards)}</p>
          <p><strong>Vous donnez :</strong> {describe(o.getProps, o.getMoney, o.getCards)}</p>
          <div className="row">
            <button className="btn primary" onClick={() => net.emit('trade:answer', { accept: true })}>Accepter</button>
            <button className="btn ghost" onClick={() => net.emit('trade:answer', { accept: false })}>Refuser</button>
          </div>
        </div>
      </Modal>
    );
  }
  return (
    <div className="toast">
      {room.you === o.from ? (
        <>
          En attente de la réponse de {to.name}…
          <button className="linkish" onClick={() => net.emit('trade:cancel')}>Annuler l’offre</button>
        </>
      ) : (
        <>{from.name} propose un échange à {to.name}…</>
      )}
    </div>
  );
}

function OnlineMatch({ net }) {
  const { room } = net;
  const state = room.game;
  const you = room.you;
  const [toast, setToast] = useState(null);

  const dispatch = useCallback((action) => net.emit('game:action', { action }), [net]);
  const canControl = useCallback(
    (pid) => pid === you && !state.players[pid]?.isBot,
    [you, state.players]
  );

  // Résultat d'un échange qu'on a proposé
  const resultId = room.tradeResult?.id;
  useEffect(() => {
    const r = room.tradeResult;
    if (!r || (r.from !== you && r.to !== you)) return;
    if (Date.now() - r.id > 10000) return; // ancien résultat reçu à la reconnexion
    const other = state.players[r.from === you ? r.to : r.from].name;
    setToast(r.accepted ? `Échange conclu avec ${other}.` : `${other} a refusé l’échange.`);
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultId]);

  useEffect(() => {
    if (!net.error) return;
    const t = setTimeout(net.clearError, 4000);
    return () => clearTimeout(t);
  }, [net.error, net.clearError]);

  const quit = () => {
    if (confirm('Quitter la salle ? Vous pourrez revenir avec le même code tant que la partie continue.')) net.leave();
  };

  const me = state.players[you];

  return (
    <GameView
      state={state}
      dispatch={dispatch}
      canControl={canControl}
      tradeFromId={you}
      onProposeTrade={(offer) => net.emit('trade:propose', { offer })}
      toolbar={
        <>
          <span className={`net-status ${net.status}`} title={net.status === 'online' ? 'Connecté' : 'Connexion perdue'}>
            Salle {room.code}
          </span>
          <button className="btn ghost" onClick={quit}>Quitter</button>
        </>
      }
      banner={
        <>
          {net.status !== 'online' && <p className="banner bad">Connexion perdue. Reconnexion automatique…</p>}
          {me?.isBot && !me.bankrupt && (
            <p className="banner">
              L’ordinateur joue à votre place.{' '}
              <button className="linkish" onClick={() => net.emit('game:takeBack')}>Reprendre la main</button>
            </p>
          )}
        </>
      }
      playerExtra={(p) => {
        const seat = room.seats[p.id];
        if (p.bankrupt || !seat) return null;
        if (!seat.connected && !p.isBot) {
          return (
            <p className="pcard-net">
              Déconnecté
              {room.isHost && (
                <button className="linkish small" onClick={() => net.emit('game:botify', { seat: p.id })}>
                  Faire jouer l’ordinateur
                </button>
              )}
            </p>
          );
        }
        return p.id === you ? <p className="pcard-net you">C’est vous</p> : null;
      }}
    >
      <PendingTrade room={room} net={net} />
      {(toast || net.error) && <div className="toast">{toast || net.error}</div>}
      {state.phase === 'over' && (
        <GameOver state={state}>
          {room.isHost ? (
            <button className="btn primary big" onClick={() => net.emit('game:lobby')}>Retour au salon</button>
          ) : (
            <span className="muted">L’hôte peut relancer une partie.</span>
          )}
          <button className="btn ghost" onClick={() => net.leave()}>Quitter la salle</button>
        </GameOver>
      )}
    </GameView>
  );
}

export default function OnlineGame({ onBack }) {
  const net = useOnline();
  const back = () => {
    window.history.replaceState(null, '', window.location.pathname);
    onBack();
  };
  if (!net.room) return <OnlineMenu net={net} onBack={back} />;
  if (net.room.phase === 'lobby' || !net.room.game) return <Lobby net={net} />;
  return <OnlineMatch net={net} />;
}
