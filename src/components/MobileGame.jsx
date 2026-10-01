import { useEffect, useRef, useState } from 'react';
import { SQUARES, GROUPS, GROUP_MEMBERS, isOwnable } from '../data/board.js';
import { ownedBy, rentFor, netWorth } from '../game/logic.js';
import { gridPos } from './Board.jsx';
import ActionPanel from './ActionPanel.jsx';
import Dice3D from './Dice3D.jsx';
import PlayersPanel from './PlayersPanel.jsx';
import GameLog from './GameLog.jsx';

const fmt = (n) => `${n.toLocaleString('fr-FR')} €`;
const CORNER = { go: '➜', jail: '▦', parking: 'P', gotojail: '⚑' };
const ICON = { chance: '?', community: '◆', station: '🚆', tax: '€' };

function squareColor(sq) {
  if (sq.group) return GROUPS[sq.group].color;
  return { chance: '#c2408a', community: '#2f6db5', station: '#2b2d42', utility: '#7d8b93', tax: '#c8323c', go: '#e0b84a', jail: '#9aa59a', parking: '#2f6db5', gotojail: '#c8323c' }[sq.type];
}

/* ------------------------------------------------------------------ */
/* Bandeau des joueurs                                                */
/* ------------------------------------------------------------------ */
function PlayerStrip({ state }) {
  return (
    <div className="m-players" role="list">
      {state.players.map((p) => (
        <div
          key={p.id}
          role="listitem"
          className={`m-player ${p.id === state.current && state.phase === 'playing' ? 'current' : ''} ${p.bankrupt ? 'out' : ''}`}
          style={{ '--pc': p.color }}
        >
          <span className="m-player-token">{p.token}</span>
          <span className="m-player-info">
            <span className="m-player-name">{p.name}{p.inJail ? ' ▦' : ''}</span>
            <span className="m-player-money">{p.bankrupt ? 'Faillite' : fmt(p.money)}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Rail : toutes les cases en grand, défilement horizontal            */
/* ------------------------------------------------------------------ */
function RailCard({ sq, state, onSelect, cardRef }) {
  const pr = state.props[sq.id];
  const owner = pr?.owner != null ? state.players[pr.owner] : null;
  const here = state.players.filter((p) => !p.bankrupt && p.pos === sq.id);
  const isCurrent = here.some((p) => p.id === state.current);
  const corner = CORNER[sq.type];
  const color = squareColor(sq);

  return (
    <button
      ref={cardRef}
      className={`rail-card type-${sq.type} ${isCurrent ? 'current' : ''} ${pr?.mortgaged ? 'mortgaged' : ''}`}
      style={{ '--g': color, '--owner': owner?.color }}
      onClick={() => pr && onSelect(sq.id)}
      aria-label={sq.name}
    >
      {sq.type === 'property' ? (
        <span className="rail-band">
          {pr.houses === 5 ? <span className="rail-hotel">Hôtel</span> : pr.houses > 0 ? <span className="rail-houses">{'⌂'.repeat(pr.houses)}</span> : null}
        </span>
      ) : (
        <span className="rail-icon">{corner || ICON[sq.type] || sq.icon}</span>
      )}
      <span className="rail-name">{sq.name}</span>
      <span className="rail-meta">
        {owner ? (
          <span className="rail-owner">{owner.token} {owner.name}</span>
        ) : sq.price ? (
          <span className="rail-price">{fmt(sq.price)}</span>
        ) : sq.type === 'tax' ? (
          <span className="rail-price">Payez {fmt(sq.amount)}</span>
        ) : sq.type === 'go' ? (
          <span className="rail-price">+200 €</span>
        ) : null}
        {pr?.mortgaged && <span className="rail-mort">Hypothéqué</span>}
      </span>
      <span className="rail-tokens">
        {here.map((p) => (
          <span key={p.id} className={`token ${p.id === state.current ? 'current' : ''}`} style={{ '--pc': p.color }}>
            {p.token}
          </span>
        ))}
      </span>
    </button>
  );
}

function Rail({ state, onSelect, focus }) {
  const refs = useRef({});
  useEffect(() => {
    const el = refs.current[focus];
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
  }, [focus]);

  return (
    <div className="rail" aria-label="Cases du plateau">
      {SQUARES.map((sq) => (
        <RailCard key={sq.id} sq={sq} state={state} onSelect={onSelect} cardRef={(el) => (refs.current[sq.id] = el)} />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Mini-plateau : vue d'ensemble sans texte                           */
/* ------------------------------------------------------------------ */
function MiniMap({ state, onPick }) {
  return (
    <div className="minimap">
      {SQUARES.map((sq) => {
        const { row, col } = gridPos(sq.id);
        const pr = state.props[sq.id];
        const owner = pr?.owner != null ? state.players[pr.owner] : null;
        const here = state.players.filter((p) => !p.bankrupt && p.pos === sq.id);
        return (
          <button
            key={sq.id}
            className={`mm-cell ${[0, 10, 20, 30].includes(sq.id) ? 'corner' : ''} ${pr?.mortgaged ? 'mortgaged' : ''}`}
            style={{ gridRow: row, gridColumn: col, '--g': squareColor(sq), '--owner': owner?.color }}
            onClick={() => onPick(sq.id)}
            aria-label={sq.name}
          >
            {sq.type === 'property' && <span className="mm-band" />}
            {owner && <span className="mm-owner" />}
            {pr?.houses > 0 && <span className="mm-build">{pr.houses === 5 ? 'H' : pr.houses}</span>}
            {here.length > 0 && (
              <span className="mm-tokens">
                {here.map((p) => (
                  <span key={p.id} className={`mm-dot ${p.id === state.current ? 'current' : ''}`} style={{ '--pc': p.color }} />
                ))}
              </span>
            )}
          </button>
        );
      })}
      <div className="mm-center">
        <Dice3D dice={state.dice} rollId={state.rollId} />
        <span className="mm-info">Tour {state.turn}</span>
        {state.settings.freeParking && state.jackpot > 0 && <span className="mm-info">Cagnotte {fmt(state.jackpot)}</span>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Onglet Biens                                                       */
/* ------------------------------------------------------------------ */
function Deeds({ state, defaultPid, onSelect }) {
  const [pid, setPid] = useState(defaultPid);
  const p = state.players[pid] || state.players[0];
  const owned = ownedBy(state, p.id);
  const total = state.dice[0] + state.dice[1];

  const groups = [
    ...Object.keys(GROUPS).map((g) => ({ key: g, title: GROUPS[g].name, color: GROUPS[g].color, ids: owned.filter((id) => SQUARES[id].group === g), size: GROUP_MEMBERS[g].length })),
    { key: 'station', title: 'Gares', color: '#2b2d42', ids: owned.filter((id) => SQUARES[id].type === 'station'), size: 4 },
    { key: 'utility', title: 'Compagnies', color: '#7d8b93', ids: owned.filter((id) => SQUARES[id].type === 'utility'), size: 2 },
  ].filter((g) => g.ids.length);

  return (
    <div className="m-deeds">
      <div className="m-chips" role="tablist" aria-label="Joueur">
        {state.players.map((o) => (
          <button key={o.id} role="tab" aria-selected={o.id === p.id} className={o.id === p.id ? 'on' : ''} style={{ '--pc': o.color }} onClick={() => setPid(o.id)}>
            {o.token} {o.name}
          </button>
        ))}
      </div>
      <p className="m-worth">
        <span>Argent <strong>{fmt(p.money)}</strong></span>
        <span>Patrimoine <strong>{fmt(netWorth(state, p.id))}</strong></span>
        {p.jailCards.length > 0 && <span>{p.jailCards.length} carte prison</span>}
      </p>
      {groups.length === 0 && (
        <p className="m-empty">Aucune propriété pour l’instant. Arrêtez-vous sur une rue libre pour l’acheter.</p>
      )}
      {groups.map((g) => (
        <section key={g.key} className="m-group" style={{ '--g': g.color }}>
          <h3>
            {g.title}
            <small>{g.ids.length === g.size ? 'Complet' : `${g.ids.length} sur ${g.size}`}</small>
          </h3>
          {g.ids.map((id) => {
            const sq = SQUARES[id];
            const pr = state.props[id];
            const status = pr.mortgaged ? 'Hypothéqué'
              : sq.type === 'station' ? 'Gare'
              : sq.type === 'utility' ? 'Compagnie'
              : pr.houses === 5 ? 'Hôtel'
              : pr.houses ? `${pr.houses} maison${pr.houses > 1 ? 's' : ''}` : 'Terrain nu';
            const rent = sq.type === 'utility' ? 'Selon les dés' : `Loyer ${fmt(rentFor(state, id, total))}`;
            return (
              <button key={id} className={`m-deed ${pr.mortgaged ? 'mortgaged' : ''}`} onClick={() => onSelect(id)}>
                <span className="m-deed-name">{sq.name}</span>
                <span className="m-deed-status">{status}</span>
                <span className="m-deed-rent">{pr.mortgaged ? '—' : rent}</span>
              </button>
            );
          })}
        </section>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Écran mobile complet                                               */
/* ------------------------------------------------------------------ */
const TABS = [
  ['board', 'Plateau', '▦'],
  ['deeds', 'Biens', '⌂'],
  ['players', 'Joueurs', '☺'],
  ['log', 'Journal', '≡'],
];

export default function MobileGame({
  state, dispatch, canControl, onSelect, onTrade, toolbar, banner, onRules, playerExtra, deedsPid,
}) {
  const [tab, setTab] = useState('board');
  const [menu, setMenu] = useState(false);
  const [focus, setFocus] = useState(state.players[state.current].pos);
  const pos = state.players[state.current].pos;

  // Le rail suit le pion du joueur actif
  useEffect(() => setFocus(pos), [pos, state.current]);

  const pick = (id) => {
    setFocus(id);
    if (isOwnable(SQUARES[id])) onSelect(id);
  };

  return (
    <div className="m-game">
      <header className="m-top">
        <h1 className="wordmark">Magnat</h1>
        <button className="m-menu-btn" aria-expanded={menu} aria-label="Menu" onClick={() => setMenu((v) => !v)}>
          {menu ? '×' : '⋯'}
        </button>
        {menu && (
          <div className="m-menu" onClick={() => setMenu(false)}>
            {toolbar}
            <button className="btn ghost" onClick={onRules}>Règles</button>
          </div>
        )}
      </header>
      <PlayerStrip state={state} />
      {banner}

      <main className="m-main">
        {tab === 'board' && (
          <>
            <Rail state={state} onSelect={onSelect} focus={focus} />
            <MiniMap state={state} onPick={pick} />
          </>
        )}
        {tab === 'deeds' && <Deeds state={state} defaultPid={deedsPid} onSelect={onSelect} />}
        {tab === 'players' && (
          <PlayersPanel state={state} onSelect={onSelect} dispatch={dispatch} canControl={canControl} extra={playerExtra} />
        )}
        {tab === 'log' && <GameLog log={state.log} />}
      </main>

      <section className="m-sheet" aria-label="Actions">
        <ActionPanel state={state} dispatch={dispatch} onTrade={onTrade} onSelect={onSelect} canControl={canControl} />
      </section>

      <nav className="m-tabs" role="tablist">
        {TABS.map(([key, label, icon]) => (
          <button key={key} role="tab" aria-selected={tab === key} className={tab === key ? 'on' : ''} onClick={() => setTab(key)}>
            <span className="m-tab-icon" aria-hidden="true">{icon}</span>
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
