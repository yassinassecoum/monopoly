import { useState } from 'react';
import { SQUARES, GROUPS } from '../data/board.js';
import { ownedBy, validateTrade, groupHasBuildings } from '../game/logic.js';
import { botAcceptsTrade } from '../game/bot.js';
import Modal from './Modal.jsx';

const fmt = (n) => `${n.toLocaleString('fr-FR')} €`;

function Side({ state, player, selected, toggle, money, setMoney, cards, setCards, title }) {
  const owned = ownedBy(state, player.id);
  return (
    <div className="trade-side" style={{ '--pc': player.color }}>
      <h3>{title}</h3>
      <p className="muted">{player.token} {player.name} · {fmt(player.money)}</p>
      <div className="trade-list">
        {owned.length === 0 && <p className="muted">Aucune propriété.</p>}
        {owned.map((id) => {
          const sq = SQUARES[id];
          const locked = sq.type === 'property' && groupHasBuildings(state, sq.group);
          return (
            <label key={id} className={`trade-item ${locked ? 'locked' : ''}`} title={locked ? 'Le quartier a des constructions' : ''}>
              <input type="checkbox" disabled={locked} checked={selected.includes(id)} onChange={() => toggle(id)} />
              <span className="dot" style={{ background: sq.group ? GROUPS[sq.group].color : '#555' }} />
              <span>{sq.name}{state.props[id].mortgaged && <small> (hyp.)</small>}</span>
            </label>
          );
        })}
      </div>
      <label className="opt">
        <span>Argent</span>
        <input
          type="number"
          min={0}
          max={player.money}
          step={10}
          value={money}
          onChange={(e) => setMoney(Math.max(0, Math.min(player.money, Number(e.target.value) || 0)))}
        />
      </label>
      {player.jailCards.length > 0 && (
        <label className="opt">
          <span>Cartes prison</span>
          <input
            type="number"
            min={0}
            max={player.jailCards.length}
            value={cards}
            onChange={(e) => setCards(Math.max(0, Math.min(player.jailCards.length, Number(e.target.value) || 0)))}
          />
        </label>
      )}
    </div>
  );
}

export default function TradeModal({ state, dispatch, onClose, fromId = state.current, onPropose }) {
  const me = state.players[fromId];
  const partners = state.players.filter((p) => !p.bankrupt && p.id !== me.id);
  const [to, setTo] = useState(partners[0]?.id);
  const [giveProps, setGiveProps] = useState([]);
  const [getProps, setGetProps] = useState([]);
  const [giveMoney, setGiveMoney] = useState(0);
  const [getMoney, setGetMoney] = useState(0);
  const [giveCards, setGiveCards] = useState(0);
  const [getCards, setGetCards] = useState(0);
  const [step, setStep] = useState('edit'); // edit | confirm | refused
  const partner = state.players[to];

  const offer = { from: me.id, to, giveProps, getProps, giveMoney, getMoney, giveCards, getCards };
  const error = partner ? validateTrade(state, offer) : 'Aucun partenaire disponible.';
  const toggle = (setter) => (id) => setter((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));

  const changePartner = (id) => {
    setTo(id);
    setGetProps([]);
    setGetMoney(0);
    setGetCards(0);
    setStep('edit');
  };

  const propose = () => {
    if (error) return;
    if (onPropose) {
      // En ligne : le serveur transmet l'offre, la réponse arrive plus tard
      onPropose(offer);
      onClose();
      return;
    }
    if (partner.isBot) {
      if (botAcceptsTrade(state, offer)) {
        dispatch({ type: 'TRADE', offer });
        onClose();
      } else setStep('refused');
    } else setStep('confirm');
  };

  const summary = (props, money, cards) =>
    [...props.map((id) => SQUARES[id].name), money ? fmt(money) : null, cards ? `${cards} carte(s) prison` : null]
      .filter(Boolean)
      .join(', ') || 'rien';

  return (
    <Modal onClose={onClose} label="Échange" wide>
      <h2 className="modal-title">Proposer un échange</h2>
      {partners.length > 1 && (
        <div className="seg">
          {partners.map((p) => (
            <button key={p.id} className={to === p.id ? 'on' : ''} onClick={() => changePartner(p.id)}>
              {p.token} {p.name}
            </button>
          ))}
        </div>
      )}

      {step === 'confirm' ? (
        <div className="trade-confirm">
          <p>
            <strong>{partner.name}</strong>, {me.name} vous propose :
          </p>
          <p>Vous recevez : {summary(giveProps, giveMoney, giveCards)}</p>
          <p>Vous donnez : {summary(getProps, getMoney, getCards)}</p>
          <div className="row">
            <button className="btn primary" onClick={() => { dispatch({ type: 'TRADE', offer }); onClose(); }}>
              {partner.name} accepte
            </button>
            <button className="btn ghost" onClick={() => setStep('edit')}>{partner.name} refuse</button>
          </div>
        </div>
      ) : (
        <>
          <div className="trade-grid">
            <Side
              state={state} player={me} title="Vous donnez"
              selected={giveProps} toggle={toggle(setGiveProps)}
              money={giveMoney} setMoney={setGiveMoney} cards={giveCards} setCards={setGiveCards}
            />
            {partner && (
              <Side
                state={state} player={partner} title="Vous recevez"
                selected={getProps} toggle={toggle(setGetProps)}
                money={getMoney} setMoney={setGetMoney} cards={getCards} setCards={setGetCards}
              />
            )}
          </div>
          {step === 'refused' && <p className="notice bad">{partner.name} refuse cette offre. Proposez-lui quelque chose de plus intéressant.</p>}
          {error && <p className="notice">{error}</p>}
          <div className="row end">
            <button className="btn ghost" onClick={onClose}>Annuler</button>
            <button className="btn primary" disabled={!!error} onClick={propose}>Proposer l’échange</button>
          </div>
        </>
      )}
    </Modal>
  );
}
