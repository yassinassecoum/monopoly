import { SQUARES } from '../data/board.js';
import { DECKS, DECK_NAMES } from '../data/cards.js';

const ICON = { chance: '?', community: '◆' };
const fmt = (n) => `${Math.abs(n).toLocaleString('fr-FR')} €`;

/** Résumé court de l'effet, affiché en pied de carte. */
export function effectLabel(card) {
  switch (card.type) {
    case 'money':
      return card.amount > 0 ? `+${fmt(card.amount)}` : `−${fmt(card.amount)}`;
    case 'moveTo':
      return `Direction ${SQUARES[card.target].name}`;
    case 'moveBack':
      return `Reculez de ${card.n} cases`;
    case 'nearest':
      return card.kind === 'station' ? 'Gare la plus proche' : 'Compagnie la plus proche';
    case 'jail':
      return 'Direction prison';
    case 'jailCard':
      return 'Carte à conserver';
    case 'repairs':
      return `${card.house} € par maison, ${card.hotel} € par hôtel`;
    case 'payEach':
      return `−${fmt(card.amount)} à chaque joueur`;
    case 'collectEach':
      return `+${fmt(card.amount)} de chaque joueur`;
    default:
      return '';
  }
}

function tone(card) {
  if (card.type === 'money') return card.amount > 0 ? 'gain' : 'loss';
  if (['collectEach', 'jailCard'].includes(card.type)) return 'gain';
  if (['payEach', 'repairs', 'jail'].includes(card.type)) return 'loss';
  return 'move';
}

export function CardBack({ deck }) {
  return (
    <div className={`gcard-back deck-${deck}`}>
      <div className="gcard-back-seal">
        <span className="gcard-back-icon">{ICON[deck]}</span>
        <span className="gcard-back-name">{DECK_NAMES[deck]}</span>
      </div>
    </div>
  );
}

/** Pioche posée sur le plateau. */
export function Deck({ deck, count, highlight }) {
  return (
    <div className={`deck deck-pos-${deck} ${highlight ? 'drawing' : ''}`} aria-label={`Pioche ${DECK_NAMES[deck]}, ${count} cartes`}>
      <CardBack deck={deck} />
    </div>
  );
}

/** Carte piochée : arrive face cachée et se retourne. */
export default function GameCard({ deck, idx, drawId, canConfirm, onOk }) {
  const card = DECKS[deck][idx];
  return (
    <div className="gcard-stage">
      <div className={`gcard deck-${deck}`} key={drawId}>
        <div className="gcard-face gcard-face-back">
          <CardBack deck={deck} />
        </div>
        <div className={`gcard-face gcard-front tone-${tone(card)}`}>
          <span className="gcard-watermark" aria-hidden="true">{ICON[deck]}</span>
          <header className="gcard-head">
            <span className="gcard-badge">{ICON[deck]}</span>
            <span className="gcard-title">{DECK_NAMES[deck]}</span>
          </header>
          <p className="gcard-text">{card.text}</p>
          <footer className="gcard-foot">
            <span className="gcard-effect">{effectLabel(card)}</span>
          </footer>
        </div>
      </div>
      {canConfirm && (
        <button className="btn primary" onClick={onOk} autoFocus>
          D’accord
        </button>
      )}
    </div>
  );
}
