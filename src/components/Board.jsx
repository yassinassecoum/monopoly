import { SQUARES, GROUPS } from '../data/board.js';
import ActionPanel from './ActionPanel.jsx';
import Dice3D from './Dice3D.jsx';
import { Deck } from './GameCard.jsx';

/** Position de la case i dans une grille 11×11 (Départ en bas à droite). */
export function gridPos(i) {
  if (i <= 10) return { row: 11, col: 11 - i, side: 'bottom' };
  if (i <= 20) return { row: 11 - (i - 10), col: 1, side: 'left' };
  if (i <= 30) return { row: 1, col: 1 + (i - 20), side: 'top' };
  return { row: 1 + (i - 30), col: 11, side: 'right' };
}

const CORNER = { go: '➜', jail: '▦', parking: 'P', gotojail: '⚑' };

function HouseIcon() {
  return (
    <svg className="house-ico" viewBox="0 0 10 10" aria-hidden="true">
      <path d="M1 5.2 5 1.5l4 3.7V9H1z" />
    </svg>
  );
}

function HotelIcon() {
  return (
    <svg className="hotel-ico" viewBox="0 0 18 10" aria-hidden="true">
      <path d="M1 4.5 9 1l8 3.5V9H1z" />
      <rect x="7.5" y="5.5" width="3" height="3.5" fill="#fff" opacity=".85" />
    </svg>
  );
}

function Buildings({ houses }) {
  if (houses === 5) return <HotelIcon />;
  return Array.from({ length: houses }, (_, i) => <HouseIcon key={i} />);
}

function Square({ sq, state, onSelect }) {
  const { row, col, side } = gridPos(sq.id);
  const corner = [0, 10, 20, 30].includes(sq.id);
  const pr = state.props[sq.id];
  const owner = pr?.owner != null ? state.players[pr.owner] : null;
  const here = state.players.filter((p) => !p.bankrupt && p.pos === sq.id);
  const isCurrentHere = here.some((p) => p.id === state.current);
  const clickable = !!pr;
  const groupColor = sq.group ? GROUPS[sq.group].color : null;

  const icon =
    sq.type === 'chance' ? '?' : sq.type === 'community' ? '◆' : sq.type === 'station' ? '🚆' :
    sq.type === 'utility' ? sq.icon : sq.type === 'tax' ? '€' : null;

  return (
    <div
      className={`sq side-${side} type-${sq.type} ${corner ? 'corner' : ''} ${isCurrentHere ? 'active' : ''} ${pr?.mortgaged ? 'mortgaged' : ''} ${owner ? 'owned' : ''}`}
      style={{ gridRow: row, gridColumn: col, '--g': groupColor || undefined, '--owner': owner?.color }}
      onClick={clickable ? () => onSelect(sq.id) : undefined}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => e.key === 'Enter' && onSelect(sq.id) : undefined}
      aria-label={owner ? `${sq.name}, propriété de ${owner.name}` : sq.name}
    >
      {corner ? (
        <div className="sq-corner">
          <span className="corner-icon">{CORNER[sq.type]}</span>
          <span className="corner-name">{sq.name}</span>
          {sq.type === 'go' && <span className="corner-sub">+200 €</span>}
          {sq.type === 'parking' && state.settings.freeParking && state.jackpot > 0 && (
            <span className="corner-sub jackpot">{state.jackpot} €</span>
          )}
        </div>
      ) : (
        <div className="sq-inner">
          {sq.type === 'property' && (
            <div className="band">
              <Buildings houses={pr.houses} />
            </div>
          )}
          <div className="sq-body">
            {icon && <span className="sq-icon">{icon}</span>}
            <span className="sq-name">{sq.name}</span>
          </div>
          {owner ? (
            <div className="plate" title={`Propriétaire : ${owner.name}`}>
              <span className="plate-token">{owner.token}</span>
            </div>
          ) : sq.price ? (
            <span className="sq-price">{sq.price} €</span>
          ) : sq.type === 'tax' ? (
            <span className="sq-price">{sq.amount} €</span>
          ) : null}
        </div>
      )}
      {here.length > 0 && (
        <div className="tokens">
          {here.map((p) => (
            <span
              key={p.id}
              className={`token ${p.id === state.current ? 'current' : ''} ${p.inJail && sq.id === 10 ? 'jailed' : ''}`}
              style={{ '--pc': p.color }}
              title={p.name}
            >
              {p.token}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Board({ state, dispatch, onSelect, onTrade, canControl }) {
  return (
    <div className="board-wrap">
      <div className="board">
        {SQUARES.map((sq) => (
          <Square key={sq.id} sq={sq} state={state} onSelect={onSelect} />
        ))}
        <div className="center">
          <div className="center-mark" aria-hidden="true">Magnat</div>
          <Deck deck="chance" count={state.decks.chance.length} highlight={state.pending?.type === 'card' && state.pending.deck === 'chance'} />
          <Deck deck="community" count={state.decks.community.length} highlight={state.pending?.type === 'card' && state.pending.deck === 'community'} />
          {state.pending?.type !== 'card' && <Dice3D dice={state.dice} rollId={state.rollId} />}
          <ActionPanel state={state} dispatch={dispatch} onTrade={onTrade} onSelect={onSelect} canControl={canControl} />
          <div className="center-foot">
            <span>Tour {state.turn}</span>
            {state.settings.limitedHouses && (
              <span>Banque : {state.bankHouses} maisons, {state.bankHotels} hôtels</span>
            )}
            {state.settings.freeParking && <span>Cagnotte : {state.jackpot} €</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
