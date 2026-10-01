import { SQUARES, GROUPS, GROUP_MEMBERS, STATIONS, UTILITIES, isOwnable } from '../data/board.js';
import { DECKS, DECK_NAMES } from '../data/cards.js';

export const GO_SALARY = 200;
export const JAIL_POS = 10;
export const JAIL_FINE = 50;
export const MAX_JAIL_TURNS = 3;

const rollDie = () => 1 + Math.floor(Math.random() * 6);
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const fmt = (n) => `${n.toLocaleString('fr-FR')} €`;

/* ------------------------------------------------------------------ */
/* Création                                                           */
/* ------------------------------------------------------------------ */

export function createGame(playersSetup, settings) {
  const props = {};
  SQUARES.forEach((sq) => {
    if (isOwnable(sq)) props[sq.id] = { owner: null, houses: 0, mortgaged: false };
  });
  const s = {
    phase: 'playing',
    settings,
    players: playersSetup.map((p, i) => ({
      id: i,
      name: p.name,
      token: p.token,
      color: p.color,
      isBot: p.isBot,
      money: settings.startMoney,
      pos: 0,
      inJail: false,
      jailTurns: 0,
      jailCards: [],
      bankrupt: false,
    })),
    props,
    current: 0,
    turn: 1,
    dice: [1, 1],
    rollId: 0,
    rolled: false,
    canRollAgain: false,
    doublesCount: 0,
    moving: null,
    pending: null,
    debts: [],
    auction: null,
    decks: {
      chance: shuffle(DECKS.chance.map((_, i) => i)),
      community: shuffle(DECKS.community.map((_, i) => i)),
    },
    jackpot: 0,
    bankHouses: settings.limitedHouses ? 32 : 999,
    bankHotels: settings.limitedHouses ? 12 : 999,
    history: [],
    log: [],
    logId: 0,
    winner: null,
  };
  addLog(s, `La partie commence ! ${s.players[0].name} ouvre le bal.`);
  snapshot(s);
  return s;
}

/* ------------------------------------------------------------------ */
/* Lecture de l'état (exportées pour l'UI et les bots)                */
/* ------------------------------------------------------------------ */

export const currentPlayer = (s) => s.players[s.current];
export const alivePlayers = (s) => s.players.filter((p) => !p.bankrupt);

export function ownsGroup(s, pid, group) {
  return GROUP_MEMBERS[group].every((id) => s.props[id].owner === pid);
}
export function countOwned(s, pid, list) {
  return list.filter((id) => s.props[id].owner === pid).length;
}
export function groupHasBuildings(s, group) {
  return GROUP_MEMBERS[group].some((id) => s.props[id].houses > 0);
}
export function ownedBy(s, pid) {
  return SQUARES.filter((sq) => isOwnable(sq) && s.props[sq.id].owner === pid).map((sq) => sq.id);
}

export function rentFor(s, sqId, diceTotal, opts = {}) {
  const sq = SQUARES[sqId];
  const p = s.props[sqId];
  if (p.owner == null || p.mortgaged) return 0;
  if (sq.type === 'property') {
    if (p.houses > 0) return sq.rent[p.houses];
    return sq.rent[0] * (ownsGroup(s, p.owner, sq.group) ? 2 : 1);
  }
  if (sq.type === 'station') {
    const n = countOwned(s, p.owner, STATIONS);
    return 25 * 2 ** (n - 1) * (opts.rentMult || 1);
  }
  if (sq.type === 'utility') {
    if (opts.utilityFlat) return diceTotal * opts.utilityFlat;
    return diceTotal * (countOwned(s, p.owner, UTILITIES) === 2 ? 10 : 4);
  }
  return 0;
}

export const unmortgageCost = (sqId) => Math.ceil((SQUARES[sqId].price / 2) * 1.1);
export const mortgageValue = (sqId) => SQUARES[sqId].price / 2;

export function canBuild(s, pid, sqId) {
  const sq = SQUARES[sqId];
  const pr = s.props[sqId];
  if (sq.type !== 'property') return 'Seuls les terrains peuvent être construits.';
  if (pr.owner !== pid) return 'Ce terrain ne vous appartient pas.';
  if (!ownsGroup(s, pid, sq.group)) return 'Il faut posséder tout le quartier.';
  const members = GROUP_MEMBERS[sq.group];
  if (members.some((id) => s.props[id].mortgaged)) return 'Un terrain du quartier est hypothéqué.';
  if (pr.houses >= 5) return 'Il y a déjà un hôtel.';
  const min = Math.min(...members.map((id) => s.props[id].houses));
  if (pr.houses > min) return 'Construisez uniformément sur le quartier.';
  const cost = GROUPS[sq.group].house;
  if (s.players[pid].money < cost) return `Il faut ${fmt(cost)}.`;
  if (pr.houses === 4 && s.bankHotels <= 0) return 'La banque n’a plus d’hôtel.';
  if (pr.houses < 4 && s.bankHouses <= 0) return 'La banque n’a plus de maison.';
  return null;
}

export function canSellHouse(s, pid, sqId) {
  const sq = SQUARES[sqId];
  const pr = s.props[sqId];
  if (sq.type !== 'property' || pr.owner !== pid) return 'Ce terrain ne vous appartient pas.';
  if (pr.houses === 0) return 'Aucune construction à vendre.';
  const max = Math.max(...GROUP_MEMBERS[sq.group].map((id) => s.props[id].houses));
  if (pr.houses < max) return 'Vendez uniformément sur le quartier.';
  if (pr.houses === 5 && s.bankHouses < 4) return 'La banque n’a pas 4 maisons pour remplacer l’hôtel.';
  return null;
}

export function canMortgage(s, pid, sqId) {
  const sq = SQUARES[sqId];
  const pr = s.props[sqId];
  if (pr.owner !== pid) return 'Ce terrain ne vous appartient pas.';
  if (pr.mortgaged) return 'Déjà hypothéqué.';
  if (sq.type === 'property' && groupHasBuildings(s, sq.group)) return 'Vendez d’abord les constructions du quartier.';
  return null;
}

export function canUnmortgage(s, pid, sqId) {
  const pr = s.props[sqId];
  if (pr.owner !== pid) return 'Ce terrain ne vous appartient pas.';
  if (!pr.mortgaged) return 'Ce terrain n’est pas hypothéqué.';
  if (s.players[pid].money < unmortgageCost(sqId)) return `Il faut ${fmt(unmortgageCost(sqId))}.`;
  return null;
}

/** Valeur totale : argent + terrains + constructions (prix d'achat). */
export function netWorth(s, pid) {
  const p = s.players[pid];
  if (p.bankrupt) return 0;
  let v = p.money;
  ownedBy(s, pid).forEach((id) => {
    const sq = SQUARES[id];
    const pr = s.props[id];
    v += pr.mortgaged ? sq.price / 2 : sq.price;
    if (sq.type === 'property') v += pr.houses * GROUPS[sq.group].house;
  });
  return v;
}

/** Ce que le joueur peut récupérer en vendant/hypothéquant tout. */
export function liquidationValue(s, pid) {
  let v = s.players[pid].money;
  ownedBy(s, pid).forEach((id) => {
    const sq = SQUARES[id];
    const pr = s.props[id];
    if (sq.type === 'property') v += (pr.houses * GROUPS[sq.group].house) / 2;
    if (!pr.mortgaged) v += sq.price / 2;
  });
  return v;
}

export function canRoll(s) {
  const p = currentPlayer(s);
  return (
    s.phase === 'playing' && !p.bankrupt && !s.moving && !s.pending && !s.auction &&
    s.debts.length === 0 && (!s.rolled || s.canRollAgain)
  );
}

export function canEndTurn(s) {
  return (
    s.phase === 'playing' && s.rolled && !s.canRollAgain && !s.moving && !s.pending &&
    !s.auction && s.debts.length === 0
  );
}

export function isBusy(s) {
  return !!(s.moving || s.pending || s.auction || s.debts.length);
}

export function validateTrade(s, o) {
  const A = s.players[o.from];
  const B = s.players[o.to];
  if (!A || !B || A.bankrupt || B.bankrupt || o.from === o.to) return 'Partenaire invalide.';
  if (!o.giveProps.length && !o.getProps.length && !o.giveMoney && !o.getMoney && !o.giveCards && !o.getCards)
    return 'L’échange est vide.';
  for (const id of o.giveProps) if (s.props[id].owner !== o.from) return `${SQUARES[id].name} n’appartient pas à ${A.name}.`;
  for (const id of o.getProps) if (s.props[id].owner !== o.to) return `${SQUARES[id].name} n’appartient pas à ${B.name}.`;
  for (const id of [...o.giveProps, ...o.getProps]) {
    const sq = SQUARES[id];
    if (sq.type === 'property' && groupHasBuildings(s, sq.group))
      return `Vendez d’abord les constructions du quartier ${GROUPS[sq.group].name}.`;
  }
  if (o.giveMoney < 0 || o.getMoney < 0) return 'Montant invalide.';
  if (o.giveMoney > A.money) return `${A.name} n’a pas ${fmt(o.giveMoney)}.`;
  if (o.getMoney > B.money) return `${B.name} n’a pas ${fmt(o.getMoney)}.`;
  if (o.giveCards > A.jailCards.length) return `${A.name} n’a pas assez de cartes prison.`;
  if (o.getCards > B.jailCards.length) return `${B.name} n’a pas assez de cartes prison.`;
  return null;
}

/* ------------------------------------------------------------------ */
/* Mutations internes (sur un brouillon cloné)                        */
/* ------------------------------------------------------------------ */

function addLog(s, msg, kind = '') {
  s.logId += 1;
  s.log.unshift({ id: s.logId, msg, kind });
  if (s.log.length > 200) s.log.length = 200;
}

function snapshot(s) {
  s.history.push({ turn: s.turn, worth: s.players.map((p) => netWorth(s, p.id)) });
  if (s.history.length > 300) s.history.shift();
}

const bankTarget = (s) => (s.settings.freeParking ? 'jackpot' : 'bank');

function transfer(s, from, to, amount) {
  s.players[from].money -= amount;
  if (typeof to === 'number') s.players[to].money += amount;
  else if (to === 'jackpot') s.jackpot += amount;
}

/** Fait payer `amount`. Si le joueur ne peut pas, une dette est mise en file. */
function charge(s, from, to, amount, reason) {
  if (amount <= 0) return;
  const p = s.players[from];
  if (p.bankrupt) return;
  const hasDebts = s.debts.some((d) => d.debtor === from);
  if (!hasDebts && p.money >= amount) {
    transfer(s, from, to, amount);
  } else {
    s.debts.push({ debtor: from, to, amount, reason });
    addLog(s, `${p.name} doit ${fmt(amount)} mais n’a que ${fmt(p.money)} : il faut vendre ou hypothéquer.`, 'warn');
  }
}

function sendToJail(s, pid) {
  const p = s.players[pid];
  p.pos = JAIL_POS;
  p.inJail = true;
  p.jailTurns = 0;
  if (pid === s.current) {
    s.canRollAgain = false;
    s.doublesCount = 0;
    s.moving = null;
  }
  addLog(s, `${p.name} part en prison.`, 'bad');
}

function land(s, opts = {}) {
  const p = currentPlayer(s);
  const sq = SQUARES[p.pos];
  const total = s.dice[0] + s.dice[1];
  switch (sq.type) {
    case 'property':
    case 'station':
    case 'utility': {
      const pr = s.props[sq.id];
      if (pr.owner == null) {
        s.pending = { type: 'buy', square: sq.id };
      } else if (pr.owner === p.id) {
        addLog(s, `${p.name} est chez lui sur ${sq.name}.`);
      } else if (pr.mortgaged) {
        addLog(s, `${sq.name} est hypothéqué : pas de loyer.`);
      } else {
        const owner = s.players[pr.owner];
        const rent = rentFor(s, sq.id, total, opts);
        addLog(s, `${p.name} paie ${fmt(rent)} de loyer à ${owner.name} (${sq.name}).`, 'pay');
        charge(s, p.id, owner.id, rent, `Loyer ${sq.name}`);
      }
      break;
    }
    case 'tax':
      addLog(s, `${p.name} paie ${sq.name} : ${fmt(sq.amount)}.`, 'pay');
      charge(s, p.id, bankTarget(s), sq.amount, sq.name);
      break;
    case 'chance':
    case 'community':
      drawCard(s, sq.type);
      break;
    case 'gotojail':
      sendToJail(s, p.id);
      break;
    case 'parking':
      if (s.settings.freeParking && s.jackpot > 0) {
        addLog(s, `${p.name} rafle la cagnotte du Parc gratuit : ${fmt(s.jackpot)} !`, 'good');
        p.money += s.jackpot;
        s.jackpot = 0;
      } else addLog(s, `${p.name} se repose au Parc gratuit.`);
      break;
    case 'jail':
      addLog(s, `${p.name} rend visite aux détenus.`);
      break;
    default:
      break;
  }
}

function drawCard(s, deck) {
  const idx = s.decks[deck].shift();
  const card = DECKS[deck][idx];
  if (card.type !== 'jailCard') s.decks[deck].push(idx);
  addLog(s, `${currentPlayer(s).name} pioche ${DECK_NAMES[deck]} : « ${card.text} »`, 'card');
  s.pending = { type: 'card', deck, idx, drawId: s.logId };
}

function applyCard(s, deck, idx) {
  const card = DECKS[deck][idx];
  const p = currentPlayer(s);
  const others = alivePlayers(s).filter((o) => o.id !== p.id);
  switch (card.type) {
    case 'money':
      if (card.amount > 0) p.money += card.amount;
      else charge(s, p.id, bankTarget(s), -card.amount, 'Carte');
      break;
    case 'moveTo':
      s.moving = { steps: (card.target - p.pos + 40) % 40 || 40, dir: 1 };
      break;
    case 'moveBack':
      s.moving = { steps: card.n, dir: -1 };
      break;
    case 'nearest': {
      const list = card.kind === 'station' ? STATIONS : UTILITIES;
      const target = list.find((id) => id > p.pos) ?? list[0];
      s.moving = {
        steps: (target - p.pos + 40) % 40,
        dir: 1,
        opts: card.kind === 'station' ? { rentMult: 2 } : { utilityFlat: 10 },
      };
      break;
    }
    case 'jail':
      sendToJail(s, p.id);
      break;
    case 'jailCard':
      p.jailCards.push(deck);
      break;
    case 'repairs': {
      let houses = 0;
      let hotels = 0;
      ownedBy(s, p.id).forEach((id) => {
        const h = s.props[id].houses;
        if (h === 5) hotels += 1;
        else houses += h;
      });
      const total = houses * card.house + hotels * card.hotel;
      addLog(s, total ? `${p.name} : ${houses} maison(s), ${hotels} hôtel(s) → ${fmt(total)}.` : `${p.name} n’a aucune construction : rien à payer.`, total ? 'pay' : '');
      charge(s, p.id, bankTarget(s), total, 'Réparations');
      break;
    }
    case 'payEach':
      others.forEach((o) => charge(s, p.id, o.id, card.amount, 'Carte'));
      break;
    case 'collectEach':
      others.forEach((o) => charge(s, o.id, p.id, card.amount, 'Carte'));
      break;
    default:
      break;
  }
}

function startAuction(s, sqId) {
  const order = [];
  for (let k = 0; k < s.players.length; k++) {
    const id = (s.current + k) % s.players.length;
    if (!s.players[id].bankrupt) order.push(id);
  }
  s.auction = { square: sqId, bid: 0, leader: null, active: order, turn: order[0] };
  addLog(s, `Enchères ouvertes pour ${SQUARES[sqId].name} !`, 'card');
}

function advanceAuction(s, fromId) {
  const a = s.auction;
  const others = a.active.filter((id) => id !== a.leader);
  if ((a.leader != null && others.length === 0) || a.active.length === 0) {
    finishAuction(s);
    return;
  }
  let i = fromId;
  for (let k = 0; k < s.players.length; k++) {
    i = (i + 1) % s.players.length;
    if (a.active.includes(i) && i !== a.leader) {
      a.turn = i;
      return;
    }
  }
  finishAuction(s);
}

function finishAuction(s) {
  const a = s.auction;
  const sq = SQUARES[a.square];
  if (a.leader != null) {
    const w = s.players[a.leader];
    w.money -= a.bid;
    s.props[a.square].owner = w.id;
    addLog(s, `${w.name} remporte ${sq.name} pour ${fmt(a.bid)}.`, 'good');
  } else {
    addLog(s, `Personne ne veut de ${sq.name}. Il reste à la banque.`);
  }
  s.auction = null;
}

function jailCardIndex(deck) {
  return DECKS[deck].findIndex((c) => c.type === 'jailCard');
}

function declareBankrupt(s, pid, creditor) {
  const p = s.players[pid];
  // Les constructions sont revendues à la banque à moitié prix
  ownedBy(s, pid).forEach((id) => {
    const pr = s.props[id];
    if (pr.houses > 0) {
      const sq = SQUARES[id];
      p.money += (pr.houses * GROUPS[sq.group].house) / 2;
      if (pr.houses === 5) s.bankHotels += 1;
      else s.bankHouses += pr.houses;
      pr.houses = 0;
    }
  });
  if (typeof creditor === 'number' && !s.players[creditor].bankrupt) {
    const c = s.players[creditor];
    c.money += Math.max(0, p.money);
    ownedBy(s, pid).forEach((id) => (s.props[id].owner = creditor));
    c.jailCards.push(...p.jailCards);
    addLog(s, `${p.name} fait faillite ! ${c.name} récupère tous ses biens.`, 'bad');
  } else {
    ownedBy(s, pid).forEach((id) => {
      s.props[id].owner = null;
      s.props[id].mortgaged = false;
    });
    p.jailCards.forEach((deck) => s.decks[deck].push(jailCardIndex(deck)));
    addLog(s, `${p.name} fait faillite ! Ses biens retournent à la banque.`, 'bad');
  }
  p.money = 0;
  p.jailCards = [];
  p.inJail = false;
  p.bankrupt = true;

  s.debts = s.debts
    .filter((d) => d.debtor !== pid)
    .map((d) => (d.to === pid ? { ...d, to: 'bank' } : d));

  if (s.auction) {
    s.auction.active = s.auction.active.filter((id) => id !== pid);
    if (s.auction.leader === pid) s.auction.leader = null;
    if (s.auction.turn === pid) advanceAuction(s, pid);
  }

  const alive = alivePlayers(s);
  if (alive.length === 1) {
    s.phase = 'over';
    s.winner = alive[0].id;
    s.moving = null;
    s.pending = null;
    s.auction = null;
    s.debts = [];
    addLog(s, `🏆 ${alive[0].name} remporte la partie !`, 'good');
    snapshot(s);
  } else if (pid === s.current) {
    s.moving = null;
    s.pending = null;
    nextTurn(s);
  }
}

function nextTurn(s) {
  snapshot(s);
  let i = s.current;
  do {
    i = (i + 1) % s.players.length;
    if (i === 0) s.turn += 1;
  } while (s.players[i].bankrupt);
  s.current = i;
  s.rolled = false;
  s.canRollAgain = false;
  s.doublesCount = 0;
  const p = s.players[i];
  addLog(s, `Au tour de ${p.name}${p.inJail ? ' (en prison)' : ''}.`, 'turn');
}

/* ------------------------------------------------------------------ */
/* Reducer                                                            */
/* ------------------------------------------------------------------ */

export function reducer(state, action) {
  if (action.type === 'LOAD') return action.state;
  if (action.type === 'RESET') return { phase: 'setup' };
  if (action.type === 'NEW_GAME') return createGame(action.players, action.settings);
  if (state.phase !== 'playing') return state;

  const s = structuredClone(state);
  const p = currentPlayer(s);

  switch (action.type) {
    case 'ROLL': {
      if (!canRoll(state)) return state;
      const d1 = rollDie();
      const d2 = rollDie();
      const total = d1 + d2;
      const dbl = d1 === d2;
      s.dice = [d1, d2];
      s.rollId += 1;
      s.rolled = true;
      s.canRollAgain = false;
      addLog(s, `${p.name} lance ${d1} + ${d2} = ${total}${dbl ? ', double !' : ''}`, 'dice');

      if (p.inJail) {
        if (dbl) {
          p.inJail = false;
          p.jailTurns = 0;
          addLog(s, `${p.name} sort de prison grâce au double.`, 'good');
          s.moving = { steps: total, dir: 1, delay: true };
        } else {
          p.jailTurns += 1;
          if (p.jailTurns >= MAX_JAIL_TURNS) {
            addLog(s, `Troisième essai raté : ${p.name} paie ${fmt(JAIL_FINE)} et sort.`, 'pay');
            p.inJail = false;
            p.jailTurns = 0;
            charge(s, p.id, bankTarget(s), JAIL_FINE, 'Caution');
            s.moving = { steps: total, dir: 1, delay: true };
          } else {
            addLog(s, `${p.name} reste en prison (essai ${p.jailTurns}/${MAX_JAIL_TURNS}).`);
          }
        }
        return s;
      }

      if (dbl) {
        s.doublesCount += 1;
        if (s.doublesCount >= 3) {
          addLog(s, `Trois doubles d’affilée : excès de vitesse !`, 'bad');
          sendToJail(s, p.id);
          return s;
        }
        s.canRollAgain = true;
      }
      s.moving = { steps: total, dir: 1, delay: true };
      return s;
    }

    case 'STEP': {
      if (!s.moving) return state;
      const m = s.moving;
      p.pos = (p.pos + m.dir + 40) % 40;
      m.steps -= 1;
      m.delay = false;
      if (m.dir === 1 && p.pos === 0) {
        p.money += GO_SALARY;
        addLog(s, `${p.name} passe par Départ : +${fmt(GO_SALARY)}.`, 'good');
        if (m.steps === 0 && s.settings.doubleGo) {
          p.money += GO_SALARY;
          addLog(s, `Arrêt pile sur Départ : bonus de ${fmt(GO_SALARY)} !`, 'good');
        }
      }
      if (m.steps <= 0) {
        const opts = m.opts || {};
        s.moving = null;
        land(s, opts);
      }
      return s;
    }

    case 'BUY': {
      if (s.pending?.type !== 'buy') return state;
      const sq = SQUARES[s.pending.square];
      if (p.money < sq.price) return state;
      p.money -= sq.price;
      s.props[sq.id].owner = p.id;
      s.pending = null;
      addLog(s, `${p.name} achète ${sq.name} pour ${fmt(sq.price)}.`, 'good');
      return s;
    }

    case 'DECLINE': {
      if (s.pending?.type !== 'buy') return state;
      const sqId = s.pending.square;
      s.pending = null;
      if (s.settings.auctions) startAuction(s, sqId);
      else addLog(s, `${p.name} laisse passer ${SQUARES[sqId].name}.`);
      return s;
    }

    case 'AUCTION_BID': {
      const a = s.auction;
      if (!a) return state;
      const bidder = s.players[a.turn];
      const bid = a.bid + action.amount;
      if (action.amount <= 0 || bidder.money < bid) return state;
      a.bid = bid;
      a.leader = bidder.id;
      addLog(s, `${bidder.name} enchérit : ${fmt(bid)}.`);
      advanceAuction(s, bidder.id);
      return s;
    }

    case 'AUCTION_PASS': {
      const a = s.auction;
      if (!a) return state;
      const who = a.turn;
      a.active = a.active.filter((id) => id !== who);
      addLog(s, `${s.players[who].name} se retire des enchères.`);
      advanceAuction(s, who);
      return s;
    }

    case 'CARD_OK': {
      if (s.pending?.type !== 'card') return state;
      const { deck, idx } = s.pending;
      s.pending = null;
      applyCard(s, deck, idx);
      return s;
    }

    case 'PAY_JAIL': {
      if (!p.inJail || s.rolled || isBusy(s) || p.money < JAIL_FINE) return state;
      transfer(s, p.id, bankTarget(s), JAIL_FINE);
      p.inJail = false;
      p.jailTurns = 0;
      addLog(s, `${p.name} paie sa caution de ${fmt(JAIL_FINE)}.`, 'pay');
      return s;
    }

    case 'USE_JAIL_CARD': {
      if (!p.inJail || s.rolled || isBusy(s) || !p.jailCards.length) return state;
      const deck = p.jailCards.pop();
      s.decks[deck].push(jailCardIndex(deck));
      p.inJail = false;
      p.jailTurns = 0;
      addLog(s, `${p.name} utilise sa carte « Libéré de prison ».`, 'good');
      return s;
    }

    case 'BUILD': {
      const { pid, sq } = action;
      if (canBuild(s, pid, sq)) return state;
      const pr = s.props[sq];
      const cost = GROUPS[SQUARES[sq].group].house;
      s.players[pid].money -= cost;
      if (pr.houses === 4) {
        s.bankHotels -= 1;
        s.bankHouses += 4;
      } else s.bankHouses -= 1;
      pr.houses += 1;
      addLog(s, `${s.players[pid].name} construit ${pr.houses === 5 ? 'un hôtel' : 'une maison'} sur ${SQUARES[sq].name}.`, 'good');
      return s;
    }

    case 'SELL_HOUSE': {
      const { pid, sq } = action;
      if (canSellHouse(s, pid, sq)) return state;
      const pr = s.props[sq];
      const value = GROUPS[SQUARES[sq].group].house / 2;
      if (pr.houses === 5) {
        s.bankHotels += 1;
        s.bankHouses -= 4;
      } else s.bankHouses += 1;
      pr.houses -= 1;
      s.players[pid].money += value;
      addLog(s, `${s.players[pid].name} revend une construction sur ${SQUARES[sq].name} (+${fmt(value)}).`);
      return s;
    }

    case 'MORTGAGE': {
      const { pid, sq } = action;
      if (canMortgage(s, pid, sq)) return state;
      s.props[sq].mortgaged = true;
      s.players[pid].money += mortgageValue(sq);
      addLog(s, `${s.players[pid].name} hypothèque ${SQUARES[sq].name} (+${fmt(mortgageValue(sq))}).`);
      return s;
    }

    case 'UNMORTGAGE': {
      const { pid, sq } = action;
      if (canUnmortgage(s, pid, sq)) return state;
      s.props[sq].mortgaged = false;
      s.players[pid].money -= unmortgageCost(sq);
      addLog(s, `${s.players[pid].name} lève l’hypothèque de ${SQUARES[sq].name} (−${fmt(unmortgageCost(sq))}).`);
      return s;
    }

    case 'PAY_DEBT': {
      const d = s.debts[0];
      if (!d || s.players[d.debtor].money < d.amount) return state;
      transfer(s, d.debtor, d.to, d.amount);
      s.debts.shift();
      addLog(s, `${s.players[d.debtor].name} règle sa dette de ${fmt(d.amount)}.`, 'pay');
      return s;
    }

    case 'BANKRUPT': {
      const d = s.debts[0];
      if (!d) return state;
      declareBankrupt(s, d.debtor, d.to);
      return s;
    }

    case 'FORFEIT': {
      const pid = action.pid;
      if (s.players[pid]?.bankrupt) return state;
      addLog(s, `${s.players[pid].name} abandonne la partie.`, 'bad');
      declareBankrupt(s, pid, 'bank');
      return s;
    }

    case 'TRADE': {
      const o = action.offer;
      if (validateTrade(s, o)) return state;
      const A = s.players[o.from];
      const B = s.players[o.to];
      o.giveProps.forEach((id) => (s.props[id].owner = B.id));
      o.getProps.forEach((id) => (s.props[id].owner = A.id));
      A.money += o.getMoney - o.giveMoney;
      B.money += o.giveMoney - o.getMoney;
      for (let i = 0; i < o.giveCards; i++) B.jailCards.push(A.jailCards.pop());
      for (let i = 0; i < o.getCards; i++) A.jailCards.push(B.jailCards.pop());
      addLog(s, `Échange conclu entre ${A.name} et ${B.name}.`, 'good');
      return s;
    }

    case 'END_TURN': {
      if (!canEndTurn(state)) return state;
      nextTurn(s);
      return s;
    }

    default:
      return state;
  }
}
