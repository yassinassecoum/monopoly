import { SQUARES, GROUPS } from '../data/board.js';
import GameCard from './GameCard.jsx';
import { canRoll, canEndTurn, liquidationValue, JAIL_FINE } from '../game/logic.js';

const fmt = (n) => `${n.toLocaleString('fr-FR')} €`;

function Who({ p }) {
  return (
    <span className="who" style={{ '--pc': p.color }}>
      {p.token} {p.name}
    </span>
  );
}

const waitFor = (p, botText) => (p.isBot ? botText : `En attente de ${p.name}…`);

export default function ActionPanel({ state, dispatch, onTrade, onSelect, canControl = (pid) => !state.players[pid].isBot }) {
  const s = state;
  const p = s.players[s.current];
  if (s.phase !== 'playing') return null;

  /* Dette à régler */
  if (s.debts.length) {
    const d = s.debts[0];
    const debtor = s.players[d.debtor];
    const toName = typeof d.to === 'number' ? s.players[d.to].name : d.to === 'jackpot' ? 'la cagnotte' : 'la banque';
    const canPay = debtor.money >= d.amount;
    const hopeless = liquidationValue(s, debtor.id) < d.amount;
    return (
      <div className="panel panel-debt">
        <p>
          <Who p={debtor} /> doit <strong>{fmt(d.amount)}</strong> à {toName}.
        </p>
        <p className="muted">
          Disponible : {fmt(debtor.money)}.{' '}
          {!canPay && (hopeless
            ? 'Même en vendant tout, ce ne sera pas suffisant.'
            : 'Ouvrez vos titres pour vendre des maisons ou hypothéquer.')}
        </p>
        {!canControl(debtor.id) ? (
          <p className="muted thinking">{waitFor(debtor, `${debtor.name} cherche des fonds…`)}</p>
        ) : (
          <div className="row">
            <button className="btn primary" disabled={!canPay} onClick={() => dispatch({ type: 'PAY_DEBT' })}>
              Payer {fmt(d.amount)}
            </button>
            <button
              className="btn danger"
              onClick={() => confirm(`${debtor.name}, déclarer faillite ? Vous serez éliminé.`) && dispatch({ type: 'BANKRUPT' })}
            >
              Déclarer faillite
            </button>
          </div>
        )}
      </div>
    );
  }

  /* Enchères */
  if (s.auction) {
    const a = s.auction;
    const sq = SQUARES[a.square];
    const bidder = s.players[a.turn];
    const leader = a.leader != null ? s.players[a.leader] : null;
    return (
      <div className="panel panel-auction">
        <p className="panel-title">Enchères : {sq.name}</p>
        <p>
          Prix affiché {fmt(sq.price)} · Meilleure offre{' '}
          <strong>{a.bid ? fmt(a.bid) : 'aucune'}</strong>
          {leader && <> par <Who p={leader} /></>}
        </p>
        <p className="muted">
          En lice : {a.active.map((id) => s.players[id].name).join(', ')}
        </p>
        {!canControl(bidder.id) ? (
          <p className="muted thinking">{waitFor(bidder, `${bidder.name} réfléchit…`)}</p>
        ) : (
          <>
            <p>À <Who p={bidder} /> de jouer ({fmt(bidder.money)})</p>
            <div className="row wrap">
              {[1, 10, 50, 100].map((inc) => (
                <button
                  key={inc}
                  className="btn"
                  disabled={bidder.money < a.bid + inc}
                  onClick={() => dispatch({ type: 'AUCTION_BID', amount: inc })}
                >
                  +{inc} €
                </button>
              ))}
              <button className="btn ghost" onClick={() => dispatch({ type: 'AUCTION_PASS' })}>Passer</button>
            </div>
          </>
        )}
      </div>
    );
  }

  /* Carte piochée */
  if (s.pending?.type === 'card') {
    return (
      <GameCard
        deck={s.pending.deck}
        idx={s.pending.idx}
        drawId={s.pending.drawId}
        canConfirm={canControl(p.id)}
        onOk={() => dispatch({ type: 'CARD_OK' })}
      />
    );
  }

  /* Achat possible */
  if (s.pending?.type === 'buy') {
    const sq = SQUARES[s.pending.square];
    const color = sq.group ? GROUPS[sq.group].color : 'var(--ink)';
    return (
      <div className="panel panel-buy" style={{ '--band': color }}>
        <p className="panel-title">
          <button className="linkish" onClick={() => onSelect(sq.id)}>{sq.name}</button> est à vendre
        </p>
        <p>
          Prix : <strong>{fmt(sq.price)}</strong> · Vous avez {fmt(p.money)}
        </p>
        {!canControl(p.id) ? (
          <p className="muted thinking">{waitFor(p, `${p.name} réfléchit…`)}</p>
        ) : (
          <div className="row">
            <button className="btn primary" disabled={p.money < sq.price} onClick={() => dispatch({ type: 'BUY' })} autoFocus>
              Acheter
            </button>
            <button className="btn ghost" onClick={() => dispatch({ type: 'DECLINE' })}>
              {s.settings.auctions ? 'Mettre aux enchères' : 'Refuser'}
            </button>
          </div>
        )}
      </div>
    );
  }

  /* Tour normal */
  const rollable = canRoll(s);
  const endable = canEndTurn(s);
  return (
    <div className="panel panel-turn">
      <p className="turn-who">
        <Who p={p} />
        <span className="turn-money">{fmt(p.money)}</span>
      </p>
      {!canControl(p.id) ? (
        <p className="muted thinking">{s.moving ? 'En route…' : waitFor(p, 'Joue son tour…')}</p>
      ) : (
        <>
          {p.inJail && !s.rolled && (
            <div className="jail-box">
              <p>En prison, essai {p.jailTurns + 1} sur 3. Faites un double pour sortir, ou :</p>
              <div className="row">
                <button className="btn" disabled={p.money < JAIL_FINE} onClick={() => dispatch({ type: 'PAY_JAIL' })}>
                  Payer {JAIL_FINE} €
                </button>
                <button className="btn" disabled={!p.jailCards.length} onClick={() => dispatch({ type: 'USE_JAIL_CARD' })}>
                  Utiliser une carte ({p.jailCards.length})
                </button>
              </div>
            </div>
          )}
          <div className="row">
            {rollable && (
              <button className="btn primary big" onClick={() => dispatch({ type: 'ROLL' })}>
                {s.canRollAgain ? 'Relancer (double)' : 'Lancer les dés'}
              </button>
            )}
            {endable && (
              <button className="btn primary big" onClick={() => dispatch({ type: 'END_TURN' })}>
                Finir le tour
              </button>
            )}
            {s.moving && <span className="muted">En route…</span>}
          </div>
          <div className="row">
            <button className="btn ghost" disabled={!!s.moving} onClick={onTrade}>Proposer un échange</button>
          </div>
          <p className="hint">Espace : lancer / finir · Cliquez une case pour voir sa fiche</p>
        </>
      )}
    </div>
  );
}
