// Gestion des salles de jeu en ligne. Aucune dépendance réseau ici :
// index.js branche ces méthodes sur Socket.io.
import { reducer, createGame, validateTrade } from '../src/game/logic.js';
import { botAction, botAcceptsTrade } from '../src/game/bot.js';
import { TOKENS, PLAYER_COLORS } from '../src/data/board.js';

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const MAX_PLAYERS = 4;
const DEFAULT_SETTINGS = { startMoney: 1500, freeParking: false, doubleGo: false, auctions: true, limitedHouses: true };
const BOT_NAMES = ['Robotine', 'Cyber Max', 'Bip-Bop', 'Calculette'];

export class GameError extends Error {}
const fail = (msg) => { throw new GameError(msg); };

function cleanName(name) {
  const n = String(name || '').trim().slice(0, 14);
  return n || 'Joueur';
}

export class RoomManager {
  /**
   * @param {object} opts
   * @param {(room) => void} opts.onChange  appelé à chaque changement à diffuser
   */
  constructor({ onChange, setTimer = setTimeout, clearTimer = clearTimeout }) {
    this.rooms = new Map();
    this.onChange = onChange;
    this.setTimer = (fn, ms) => setTimer(fn, ms);
    this.clearTimer = (t) => clearTimer(t);
  }

  /* ---------------- Utilitaires ---------------- */

  newCode() {
    let code;
    do {
      code = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
    } while (this.rooms.has(code));
    return code;
  }

  get(code) {
    const room = this.rooms.get(String(code || '').toUpperCase());
    if (!room) fail('Salle introuvable. Vérifiez le code.');
    return room;
  }

  seatOf(room, clientId) {
    return room.seats.findIndex((s) => s.clientId === clientId);
  }

  requireHost(room, clientId) {
    if (room.host !== clientId) fail('Seul l’hôte peut faire ça.');
  }

  freeToken(room) {
    return TOKENS.find((t) => !room.seats.some((s) => s.token === t));
  }

  freeColor(room) {
    return PLAYER_COLORS.find((c) => !room.seats.some((s) => s.color === c));
  }

  touch(room) {
    room.lastActive = Date.now();
    this.onChange(room);
  }

  /** Ce que chaque client reçoit (les identifiants secrets ne sortent pas). */
  view(room, clientId) {
    return {
      code: room.code,
      phase: room.phase,
      isHost: room.host === clientId,
      hostSeat: this.seatOf(room, room.host),
      you: this.seatOf(room, clientId),
      seats: room.seats.map((s) => ({
        name: s.name,
        token: s.token,
        color: s.color,
        isBot: s.isBot,
        connected: s.isBot || s.connected,
        open: !s.isBot && !s.clientId,
      })),
      settings: room.settings,
      game: room.game,
      trade: room.trade,
      tradeResult: room.tradeResult,
    };
  }

  /* ---------------- Salon ---------------- */

  create(clientId, profile = {}) {
    const code = this.newCode();
    const room = {
      code,
      host: clientId,
      phase: 'lobby',
      seats: [],
      settings: { ...DEFAULT_SETTINGS },
      game: null,
      trade: null,
      tradeResult: null,
      timer: null,
      lastActive: Date.now(),
    };
    room.seats.push({
      clientId,
      name: cleanName(profile.name),
      token: TOKENS.includes(profile.token) ? profile.token : TOKENS[0],
      color: PLAYER_COLORS[0],
      isBot: false,
      connected: true,
    });
    this.rooms.set(code, room);
    this.touch(room);
    return room;
  }

  join(code, clientId, profile = {}) {
    const room = this.get(code);
    let seat = this.seatOf(room, clientId);
    if (seat >= 0) {
      room.seats[seat].connected = true; // reconnexion
    } else if (room.phase === 'lobby') {
      if (room.seats.length >= MAX_PLAYERS) fail('La salle est pleine (4 joueurs maximum).');
      const token = TOKENS.includes(profile.token) && !room.seats.some((s) => s.token === profile.token)
        ? profile.token : this.freeToken(room);
      room.seats.push({ clientId, name: cleanName(profile.name), token, color: this.freeColor(room), isBot: false, connected: true });
      seat = room.seats.length - 1;
    } else {
      // Partie en cours : on peut reprendre une place libre (après un redémarrage du serveur)
      const name = cleanName(profile.name).toLowerCase();
      const open = room.seats.map((s, i) => ({ s, i })).filter(({ s }) => !s.isBot && !s.clientId);
      const pick = open.find(({ s }) => s.name.toLowerCase() === name) || open[0];
      if (!pick) fail('La partie a déjà commencé et toutes les places sont prises.');
      seat = pick.i;
      room.seats[seat].clientId = clientId;
      room.seats[seat].connected = true;
    }
    if (!room.host || !room.seats.some((s) => s.clientId === room.host)) room.host = clientId;
    this.touch(room);
    return room;
  }

  leave(code, clientId) {
    const room = this.get(code);
    const seat = this.seatOf(room, clientId);
    if (seat < 0) return;
    if (room.phase === 'lobby') {
      room.seats.splice(seat, 1);
      if (room.host === clientId) room.host = room.seats.find((s) => s.clientId)?.clientId || null;
      if (!room.seats.some((s) => s.clientId)) {
        this.destroy(room);
        return;
      }
    } else {
      room.seats[seat].connected = false;
    }
    this.touch(room);
  }

  setConnected(clientId, connected) {
    for (const room of this.rooms.values()) {
      const seat = this.seatOf(room, clientId);
      if (seat >= 0 && room.seats[seat].connected !== connected) {
        room.seats[seat].connected = connected;
        this.touch(room);
      }
    }
  }

  updateProfile(code, clientId, patch) {
    const room = this.get(code);
    if (room.phase !== 'lobby') fail('La partie a commencé.');
    const s = room.seats[this.seatOf(room, clientId)];
    if (!s) fail('Vous n’êtes pas dans cette salle.');
    if (patch.name != null) s.name = cleanName(patch.name);
    if (patch.token && TOKENS.includes(patch.token) && !room.seats.some((o) => o !== s && o.token === patch.token)) s.token = patch.token;
    if (patch.color && PLAYER_COLORS.includes(patch.color) && !room.seats.some((o) => o !== s && o.color === patch.color)) s.color = patch.color;
    this.touch(room);
  }

  addBot(code, clientId) {
    const room = this.get(code);
    this.requireHost(room, clientId);
    if (room.phase !== 'lobby') fail('La partie a commencé.');
    if (room.seats.length >= MAX_PLAYERS) fail('La salle est pleine.');
    const name = BOT_NAMES.find((n) => !room.seats.some((s) => s.name === n)) || 'Ordinateur';
    room.seats.push({ clientId: null, name, token: this.freeToken(room), color: this.freeColor(room), isBot: true, connected: true });
    this.touch(room);
  }

  kick(code, clientId, seatIndex) {
    const room = this.get(code);
    this.requireHost(room, clientId);
    if (room.phase !== 'lobby') fail('La partie a commencé.');
    const s = room.seats[seatIndex];
    if (!s || s.clientId === clientId) return;
    room.seats.splice(seatIndex, 1);
    this.touch(room);
    return s.clientId;
  }

  setSettings(code, clientId, settings) {
    const room = this.get(code);
    this.requireHost(room, clientId);
    if (room.phase !== 'lobby') fail('La partie a commencé.');
    const s = room.settings;
    if ([1000, 1500, 2000, 3000].includes(settings.startMoney)) s.startMoney = settings.startMoney;
    for (const k of ['freeParking', 'doubleGo', 'auctions', 'limitedHouses']) {
      if (typeof settings[k] === 'boolean') s[k] = settings[k];
    }
    this.touch(room);
  }

  start(code, clientId) {
    const room = this.get(code);
    this.requireHost(room, clientId);
    if (room.phase !== 'lobby') fail('La partie a déjà commencé.');
    if (room.seats.length < 2) fail('Il faut au moins 2 joueurs.');
    room.game = createGame(
      room.seats.map((s) => ({ name: s.name, token: s.token, color: s.color, isBot: s.isBot })),
      room.settings
    );
    room.phase = 'game';
    room.trade = null;
    room.tradeResult = null;
    this.touch(room);
    this.schedule(room);
  }

  backToLobby(code, clientId) {
    const room = this.get(code);
    this.requireHost(room, clientId);
    this.clearTimer(room.timer);
    room.phase = 'lobby';
    room.game = null;
    room.trade = null;
    room.seats = room.seats.filter((s) => s.isBot || s.clientId);
    this.touch(room);
  }

  /** L'hôte confie la place d'un joueur absent à l'ordinateur. */
  botify(code, clientId, seatIndex) {
    const room = this.get(code);
    this.requireHost(room, clientId);
    this.setBot(room, seatIndex, true);
  }

  /** Un joueur reprend la main sur sa place jouée par l'ordinateur. */
  takeBack(code, clientId) {
    const room = this.get(code);
    const seat = this.seatOf(room, clientId);
    if (seat < 0) fail('Vous n’êtes pas dans cette salle.');
    this.setBot(room, seat, false);
  }

  setBot(room, seatIndex, isBot) {
    const s = room.seats[seatIndex];
    if (!s || room.phase !== 'game') return;
    s.isBot = isBot;
    room.game = {
      ...room.game,
      players: room.game.players.map((p) => (p.id === seatIndex ? { ...p, isBot } : p)),
    };
    this.touch(room);
    this.schedule(room);
  }

  /** Recrée une salle perdue (redémarrage du serveur) à partir de la copie d'un joueur. */
  restore(clientId, snap) {
    if (!snap || typeof snap.code !== 'string' || !Array.isArray(snap.seats)) fail('Sauvegarde invalide.');
    const code = snap.code.toUpperCase();
    if (this.rooms.has(code)) return this.join(code, clientId, { name: snap.seats[snap.you]?.name });
    if (snap.you == null || snap.you < 0 || !snap.seats[snap.you]) fail('Sauvegarde invalide.');
    const room = {
      code,
      host: clientId,
      phase: snap.game && snap.game.phase !== 'setup' ? 'game' : 'lobby',
      seats: snap.seats.slice(0, MAX_PLAYERS).map((s, i) => ({
        clientId: i === snap.you ? clientId : null,
        name: cleanName(s.name),
        token: s.token,
        color: s.color,
        isBot: !!s.isBot,
        connected: i === snap.you,
      })),
      settings: { ...DEFAULT_SETTINGS, ...(snap.settings || {}) },
      game: snap.game || null,
      trade: null,
      tradeResult: null,
      timer: null,
      lastActive: Date.now(),
    };
    if (room.phase === 'lobby') room.seats = room.seats.filter((s) => s.isBot || s.clientId);
    this.rooms.set(code, room);
    this.touch(room);
    this.schedule(room);
    return room;
  }

  destroy(room) {
    this.clearTimer(room.timer);
    this.rooms.delete(room.code);
  }

  /** Supprime les salles abandonnées. */
  sweep(maxIdleMs = 2 * 60 * 60 * 1000) {
    const now = Date.now();
    for (const room of [...this.rooms.values()]) {
      const anyone = room.seats.some((s) => s.clientId && s.connected);
      if (!anyone && now - room.lastActive > maxIdleMs) this.destroy(room);
    }
  }

  /* ---------------- Partie ---------------- */

  /** Vérifie qu'un joueur a le droit d'envoyer cette action. */
  allowed(game, seat, action) {
    if (seat < 0 || !game || game.players[seat]?.bankrupt) return false;
    switch (action.type) {
      case 'ROLL':
      case 'END_TURN':
      case 'BUY':
      case 'DECLINE':
      case 'CARD_OK':
      case 'PAY_JAIL':
      case 'USE_JAIL_CARD':
        return game.current === seat && !game.debts.length && !game.auction;
      case 'AUCTION_BID':
      case 'AUCTION_PASS':
        return game.auction?.turn === seat;
      case 'PAY_DEBT':
      case 'BANKRUPT':
        return game.debts[0]?.debtor === seat;
      case 'BUILD':
      case 'SELL_HOUSE':
      case 'MORTGAGE':
      case 'UNMORTGAGE':
      case 'FORFEIT':
        return action.pid === seat;
      default:
        return false; // STEP, LOAD, NEW_GAME, TRADE… ne viennent jamais d'un client
    }
  }

  action(code, clientId, action) {
    const room = this.get(code);
    if (room.phase !== 'game') fail('Aucune partie en cours.');
    const seat = this.seatOf(room, clientId);
    if (!action || typeof action.type !== 'string' || !this.allowed(room.game, seat, action)) {
      fail('Ce n’est pas à vous de jouer.');
    }
    if (room.game.players[seat].isBot) fail('L’ordinateur joue à votre place. Reprenez la main d’abord.');
    this.apply(room, action);
  }

  apply(room, action) {
    const next = reducer(room.game, action);
    if (next !== room.game) {
      room.game = next;
      if (room.trade && validateTrade(next, room.trade.offer)) room.trade = null; // l'offre n'est plus valable
      this.touch(room);
    }
    this.schedule(room);
  }

  /** Programme la prochaine étape automatique : animation du pion ou coup d'un bot. */
  schedule(room) {
    this.clearTimer(room.timer);
    room.timer = null;
    const s = room.game;
    if (room.phase !== 'game' || !s || s.phase !== 'playing') return;
    let action;
    let delay;
    if (s.moving) {
      action = { type: 'STEP' };
      delay = s.moving.delay ? 1200 : 170;
    } else {
      action = botAction(s);
      if (!action) return;
      delay = action.type === 'CARD_OK' ? 2200 : 800;
    }
    room.timer = this.setTimer(() => this.apply(room, action), delay);
  }

  /* ---------------- Échanges ---------------- */

  proposeTrade(code, clientId, offer) {
    const room = this.get(code);
    if (room.phase !== 'game') fail('Aucune partie en cours.');
    const seat = this.seatOf(room, clientId);
    if (!offer || offer.from !== seat) fail('Offre invalide.');
    if (room.trade) fail('Un échange est déjà en attente de réponse.');
    const clean = {
      from: seat,
      to: Number(offer.to),
      giveProps: (offer.giveProps || []).map(Number),
      getProps: (offer.getProps || []).map(Number),
      giveMoney: Math.max(0, Math.floor(Number(offer.giveMoney) || 0)),
      getMoney: Math.max(0, Math.floor(Number(offer.getMoney) || 0)),
      giveCards: Math.max(0, Math.floor(Number(offer.giveCards) || 0)),
      getCards: Math.max(0, Math.floor(Number(offer.getCards) || 0)),
    };
    const err = validateTrade(room.game, clean);
    if (err) fail(err);
    const target = room.game.players[clean.to];
    if (target.isBot) {
      const accepted = botAcceptsTrade(room.game, clean);
      if (accepted) room.game = reducer(room.game, { type: 'TRADE', offer: clean });
      room.tradeResult = { id: Date.now(), from: seat, to: clean.to, accepted };
      this.touch(room);
      this.schedule(room);
      return;
    }
    room.trade = { id: Date.now(), offer: clean };
    this.touch(room);
  }

  answerTrade(code, clientId, accept) {
    const room = this.get(code);
    const t = room.trade;
    if (!t) fail('Cette offre n’existe plus.');
    const seat = this.seatOf(room, clientId);
    if (seat !== t.offer.to) fail('Cette offre ne vous est pas adressée.');
    room.trade = null;
    let accepted = false;
    if (accept && !validateTrade(room.game, t.offer)) {
      room.game = reducer(room.game, { type: 'TRADE', offer: t.offer });
      accepted = true;
    }
    room.tradeResult = { id: Date.now(), from: t.offer.from, to: t.offer.to, accepted };
    this.touch(room);
    this.schedule(room);
  }

  cancelTrade(code, clientId) {
    const room = this.get(code);
    if (room.trade && room.trade.offer.from === this.seatOf(room, clientId)) {
      room.trade = null;
      this.touch(room);
    }
  }
}
