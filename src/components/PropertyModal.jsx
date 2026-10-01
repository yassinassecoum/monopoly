import { SQUARES, GROUPS, GROUP_MEMBERS } from '../data/board.js';
import {
  canBuild, canSellHouse, canMortgage, canUnmortgage,
  mortgageValue, unmortgageCost, rentFor,
} from '../game/logic.js';
import Modal from './Modal.jsx';

const fmt = (n) => `${n.toLocaleString('fr-FR')} €`;
const RENT_LABELS = ['Terrain nu', '1 maison', '2 maisons', '3 maisons', '4 maisons', 'Hôtel'];

function Action({ label, error, onClick, kind = '' }) {
  return (
    <button className={`btn ${kind}`} disabled={!!error} title={error || ''} onClick={onClick}>
      {label}
    </button>
  );
}

export default function PropertyModal({ state, sqId, dispatch, onClose, canControl = (pid) => !state.players[pid].isBot }) {
  const sq = SQUARES[sqId];
  const pr = state.props[sqId];
  const owner = pr.owner != null ? state.players[pr.owner] : null;
  const canManage = owner && canControl(owner.id) && state.phase === 'playing';
  const pid = owner?.id;
  const band = sq.group ? GROUPS[sq.group].color : sq.type === 'station' ? '#2b2d42' : '#5c6b73';
  const current = owner ? rentFor(state, sqId, state.dice[0] + state.dice[1]) : 0;

  return (
    <Modal onClose={onClose} label={sq.name}>
      <div className={`deed ${pr.mortgaged ? 'is-mortgaged' : ''}`}>
        <div className="deed-head" style={{ background: band }} data-light={['lightblue', 'yellow'].includes(sq.group) ? '' : undefined}>
          <small>Titre de propriété</small>
          <small>{sq.group ? GROUPS[sq.group].name : sq.type === 'station' ? 'Gare' : 'Compagnie'}</small>
          <h2>{sq.name}</h2>
        </div>

        {sq.type === 'property' && (
          <table className="deed-table">
            <tbody>
              {sq.rent.map((r, i) => (
                <tr key={i} className={`${owner && pr.houses === i ? 'now' : ''} ${i === 5 ? 'hotel' : ''}`}>
                  <td>{RENT_LABELS[i]}{i === 0 && <small> (doublé si quartier complet)</small>}</td>
                  <td>{fmt(r)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {sq.type === 'station' && (
          <table className="deed-table">
            <tbody>
              {[1, 2, 3, 4].map((n) => (
                <tr key={n}><td>{n} gare{n > 1 ? 's' : ''} possédée{n > 1 ? 's' : ''}</td><td>{fmt(25 * 2 ** (n - 1))}</td></tr>
              ))}
            </tbody>
          </table>
        )}
        {sq.type === 'utility' && (
          <table className="deed-table">
            <tbody>
              <tr><td>1 compagnie</td><td>4 × les dés</td></tr>
              <tr><td>2 compagnies</td><td>10 × les dés</td></tr>
            </tbody>
          </table>
        )}

        <dl className="deed-facts">
          <div><dt>Prix</dt><dd>{fmt(sq.price)}</dd></div>
          {sq.group && <div><dt>Maison / hôtel</dt><dd>{fmt(GROUPS[sq.group].house)}</dd></div>}
          <div><dt>Hypothèque</dt><dd>{fmt(mortgageValue(sqId))}</dd></div>
          <div><dt>Lever l’hypothèque</dt><dd>{fmt(unmortgageCost(sqId))}</dd></div>
        </dl>

        <div className="deed-owner">
          {owner ? (
            <>
              <span className="who" style={{ '--pc': owner.color }}>{owner.token} {owner.name}</span>
              <span>
                {pr.mortgaged ? 'Hypothéqué' : sq.type === 'utility' ? 'Loyer selon les dés' : `Loyer actuel : ${fmt(current)}`}
              </span>
            </>
          ) : (
            <span className="muted">Appartient encore à la banque</span>
          )}
        </div>

        {sq.group && (
          <div className="deed-group">
            {GROUP_MEMBERS[sq.group].map((id) => {
              const o = state.props[id].owner;
              return (
                <span key={id} className="chip" style={{ '--pc': o != null ? state.players[o].color : 'transparent' }}>
                  {SQUARES[id].name}
                </span>
              );
            })}
          </div>
        )}

        {canManage && (
          <div className="deed-actions">
            {sq.type === 'property' && (
              <>
                <Action
                  kind="primary"
                  label={pr.houses === 4 ? `Construire un hôtel (${fmt(GROUPS[sq.group].house)})` : `Construire une maison (${fmt(GROUPS[sq.group].house)})`}
                  error={canBuild(state, pid, sqId)}
                  onClick={() => dispatch({ type: 'BUILD', pid, sq: sqId })}
                />
                <Action
                  label={`Revendre (+${fmt(GROUPS[sq.group].house / 2)})`}
                  error={canSellHouse(state, pid, sqId)}
                  onClick={() => dispatch({ type: 'SELL_HOUSE', pid, sq: sqId })}
                />
              </>
            )}
            {pr.mortgaged ? (
              <Action
                label={`Lever l’hypothèque (−${fmt(unmortgageCost(sqId))})`}
                error={canUnmortgage(state, pid, sqId)}
                onClick={() => dispatch({ type: 'UNMORTGAGE', pid, sq: sqId })}
              />
            ) : (
              <Action
                label={`Hypothéquer (+${fmt(mortgageValue(sqId))})`}
                error={canMortgage(state, pid, sqId)}
                onClick={() => dispatch({ type: 'MORTGAGE', pid, sq: sqId })}
              />
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
