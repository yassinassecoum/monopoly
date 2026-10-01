import { SQUARES, GROUPS } from '../data/board.js';
import { ownedBy, netWorth } from '../game/logic.js';

const fmt = (n) => `${n.toLocaleString('fr-FR')} €`;

function chipColor(sq) {
  if (sq.group) return GROUPS[sq.group].color;
  return sq.type === 'station' ? '#2b2d42' : '#7d8b93';
}

export default function PlayersPanel({ state, onSelect, dispatch, canControl = (pid) => !state.players[pid].isBot, extra }) {
  return (
    <section className="players">
      {state.players.map((p) => {
        const owned = ownedBy(state, p.id);
        const isCurrent = p.id === state.current && state.phase === 'playing';
        return (
          <article
            key={p.id}
            className={`pcard ${isCurrent ? 'current' : ''} ${p.bankrupt ? 'out' : ''}`}
            style={{ '--pc': p.color }}
          >
            <header>
              <span className="pcard-token">{p.token}</span>
              <div className="pcard-id">
                <strong>{p.name}</strong>
                <small>
                  {p.bankrupt ? 'En faillite' : p.isBot ? 'Ordinateur' : 'Humain'}
                  {p.inJail && ' · en prison'}
                  {p.jailCards.length > 0 && ` · ${p.jailCards.length} carte${p.jailCards.length > 1 ? 's' : ''} prison`}
                </small>
              </div>
              <div className="pcard-money">
                <strong>{fmt(p.money)}</strong>
                {!p.bankrupt && <small>Patrimoine {fmt(netWorth(state, p.id))}</small>}
              </div>
            </header>
            {owned.length > 0 && (
              <div className="deeds">
                {owned.map((id) => {
                  const sq = SQUARES[id];
                  const pr = state.props[id];
                  return (
                    <button
                      key={id}
                      className={`deed-chip ${pr.mortgaged ? 'mortgaged' : ''}`}
                      style={{ '--c': chipColor(sq) }}
                      onClick={() => onSelect(id)}
                      title={`${sq.name}${pr.mortgaged ? ' (hypothéqué)' : ''}${pr.houses === 5 ? ' — hôtel' : pr.houses ? ` — ${pr.houses} maison(s)` : ''}`}
                    >
                      {pr.houses === 5 ? 'H' : pr.houses || ''}
                    </button>
                  );
                })}
              </div>
            )}
            {extra?.(p)}
            {!p.bankrupt && canControl(p.id) && state.phase === 'playing' && (
              <button
                className="linkish small forfeit"
                onClick={() => confirm(`${p.name}, abandonner la partie ?`) && dispatch({ type: 'FORFEIT', pid: p.id })}
              >
                Abandonner
              </button>
            )}
          </article>
        );
      })}
    </section>
  );
}
