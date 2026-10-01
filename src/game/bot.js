import { SQUARES, GROUPS, GROUP_MEMBERS, isOwnable } from '../data/board.js';
import {
  canBuild, canSellHouse, canMortgage, canUnmortgage, unmortgageCost,
  ownedBy, ownsGroup, JAIL_FINE,
} from './logic.js';

/** Quel joueur doit agir maintenant ? */
export function actorId(s) {
  if (s.phase !== 'playing' || s.moving) return null;
  if (s.debts.length) return s.debts[0].debtor;
  if (s.auction) return s.auction.turn;
  return s.current;
}

function unownedCount(s) {
  return SQUARES.filter((sq) => isOwnable(sq) && s.props[sq.id].owner == null).length;
}

/** Réserve de sécurité : plus la partie avance, plus il faut de liquidités. */
function reserve(s) {
  const built = SQUARES.filter((sq) => s.props[sq.id]?.houses > 0).length;
  return 120 + built * 25;
}

/** Ce terrain compléterait-il un quartier pour pid ? */
function completesSet(s, pid, sqId) {
  const sq = SQUARES[sqId];
  if (sq.type !== 'property') return false;
  return GROUP_MEMBERS[sq.group].every((id) => id === sqId || s.props[id].owner === pid);
}

/** Un adversaire possède-t-il déjà le reste du quartier ? (achat bloquant) */
function blocksOpponent(s, pid, sqId) {
  const sq = SQUARES[sqId];
  if (sq.type !== 'property') return false;
  const others = GROUP_MEMBERS[sq.group].filter((id) => id !== sqId).map((id) => s.props[id].owner);
  return others.length > 0 && others[0] != null && others[0] !== pid && others.every((o) => o === others[0]);
}

function valueFor(s, pid, sqId) {
  const sq = SQUARES[sqId];
  let mult = 1.05;
  if (completesSet(s, pid, sqId)) mult = 1.7;
  else if (blocksOpponent(s, pid, sqId)) mult = 1.35;
  else if (sq.type === 'station') mult = 1.2;
  return Math.round(sq.price * mult);
}

function buildCandidate(s, pid, budget) {
  const options = ownedBy(s, pid)
    .filter((id) => !canBuild(s, pid, id) && GROUPS[SQUARES[id].group].house <= budget)
    .sort((a, b) => s.props[a].houses - s.props[b].houses || SQUARES[b].price - SQUARES[a].price);
  return options[0];
}

function raiseFunds(s, pid) {
  const owned = ownedBy(s, pid);
  const sell = owned
    .filter((id) => !canSellHouse(s, pid, id))
    .sort((a, b) => s.props[b].houses - s.props[a].houses);
  if (sell.length) return { type: 'SELL_HOUSE', pid, sq: sell[0] };
  const mort = owned
    .filter((id) => !canMortgage(s, pid, id))
    .sort((a, b) => {
      const sa = SQUARES[a];
      const sb = SQUARES[b];
      const inSetA = sa.type === 'property' && ownsGroup(s, pid, sa.group) ? 1 : 0;
      const inSetB = sb.type === 'property' && ownsGroup(s, pid, sb.group) ? 1 : 0;
      return inSetA - inSetB || sa.price - sb.price;
    });
  if (mort.length) return { type: 'MORTGAGE', pid, sq: mort[0] };
  return null;
}

/** Retourne l'action que le bot veut faire, ou null si ce n'est pas à un bot d'agir. */
export function botAction(s) {
  const id = actorId(s);
  if (id == null) return null;
  const p = s.players[id];
  if (!p.isBot || p.bankrupt) return null;
  const r = reserve(s);

  if (s.debts.length) {
    const d = s.debts[0];
    if (p.money >= d.amount) return { type: 'PAY_DEBT' };
    return raiseFunds(s, id) || { type: 'BANKRUPT' };
  }

  if (s.auction) {
    const a = s.auction;
    const limit = Math.min(p.money - Math.min(r, 80), valueFor(s, id, a.square));
    const step = a.bid < 100 ? 10 : a.bid < 300 ? 20 : 50;
    if (a.bid + step <= limit) return { type: 'AUCTION_BID', amount: step };
    return { type: 'AUCTION_PASS' };
  }

  if (s.pending?.type === 'card') return { type: 'CARD_OK' };

  if (s.pending?.type === 'buy') {
    const sq = SQUARES[s.pending.square];
    if (p.money < sq.price) return { type: 'DECLINE' };
    const wants =
      p.money - sq.price >= r ||
      (completesSet(s, id, sq.id) && p.money - sq.price >= 0) ||
      (blocksOpponent(s, id, sq.id) && p.money - sq.price >= 40);
    return { type: wants ? 'BUY' : 'DECLINE' };
  }

  // Son propre tour
  if (p.inJail && !s.rolled) {
    if (p.jailCards.length) return { type: 'USE_JAIL_CARD' };
    // En début de partie on sort vite pour acheter ; en fin de partie la prison protège.
    if (unownedCount(s) > 8 && p.money >= JAIL_FINE + r) return { type: 'PAY_JAIL' };
  }

  const toLift = ownedBy(s, id).find(
    (sq) => !canUnmortgage(s, id, sq) && p.money - unmortgageCost(sq) >= r * 2
  );
  if (toLift != null) return { type: 'UNMORTGAGE', pid: id, sq: toLift };

  const b = buildCandidate(s, id, p.money - r);
  if (b != null) return { type: 'BUILD', pid: id, sq: b };

  if (!s.rolled || s.canRollAgain) return { type: 'ROLL' };
  return { type: 'END_TURN' };
}

/** Le bot accepte-t-il l'échange proposé ? (offer.to est le bot) */
export function botAcceptsTrade(s, o) {
  const val = (sqId) => SQUARES[sqId].price * (s.props[sqId].mortgaged ? 0.5 : 1);
  let gain = o.giveMoney + o.giveCards * 50;
  let loss = o.getMoney + o.getCards * 50;
  o.giveProps.forEach((sqId) => {
    gain += val(sqId);
    // Ce qu'on reçoit complète-t-il un de nos quartiers ?
    const sq = SQUARES[sqId];
    if (sq.type === 'property') {
      const mine = GROUP_MEMBERS[sq.group].every(
        (m) => m === sqId || s.props[m].owner === o.to || o.giveProps.includes(m)
      );
      if (mine) gain += sq.price;
    }
  });
  o.getProps.forEach((sqId) => {
    loss += val(sqId);
    const sq = SQUARES[sqId];
    if (sq.type === 'property') {
      // Donner un terrain qui complète le quartier de l'adversaire coûte cher
      const theirs = GROUP_MEMBERS[sq.group].every(
        (m) => m === sqId || s.props[m].owner === o.from || o.getProps.includes(m)
      );
      if (theirs) loss += sq.price * 1.6;
      if (ownsGroup(s, o.to, sq.group)) loss += sq.price * 2;
    }
  });
  return gain >= loss * 1.15 && gain > 0;
}
