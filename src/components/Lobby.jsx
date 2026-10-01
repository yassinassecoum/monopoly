import { useState } from 'react';
import { TOKENS, PLAYER_COLORS } from '../data/board.js';

const RULES = [
  ['auctions', 'Enchères quand un terrain est refusé'],
  ['limitedHouses', 'Stock limité : 32 maisons, 12 hôtels'],
  ['freeParking', 'Cagnotte au Parc gratuit'],
  ['doubleGo', 'Salaire doublé pile sur Départ'],
];

export default function Lobby({ net }) {
  const { room } = net;
  const me = room.seats[room.you];
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}${window.location.pathname}?salle=${room.code}`;
  const humans = room.seats.filter((s) => !s.isBot).length;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      prompt('Copiez ce lien :', link);
    }
  };

  const setSetting = (patch) => net.emit('lobby:settings', { ...room.settings, ...patch });

  return (
    <div className="setup">
      <div className="lobby-head">
        <p className="lobby-label">Code de la salle</p>
        <p className="lobby-code">{room.code}</p>
        <div className="row">
          <button className="btn primary" onClick={copy}>{copied ? 'Lien copié' : 'Copier le lien d’invitation'}</button>
          <button className="btn ghost light" onClick={() => net.leave()}>Quitter la salle</button>
        </div>
      </div>

      {net.error && <p className="notice bad">{net.error}</p>}

      <section className="setup-card">
        <div className="setup-row">
          <h2>Joueurs ({room.seats.length}/4)</h2>
          {room.isHost && room.seats.length < 4 && (
            <button className="btn" onClick={() => net.emit('lobby:addBot')}>Ajouter un ordinateur</button>
          )}
        </div>
        <ul className="lobby-seats">
          {room.seats.map((s, i) => (
            <li key={i} style={{ '--pc': s.color }} className={i === room.you ? 'mine' : ''}>
              <span className="ps-token">{s.token}</span>
              <span className="lobby-name">
                {s.name}
                <small>
                  {s.isBot ? 'Ordinateur' : i === room.you ? 'Vous' : s.connected ? 'Connecté' : 'Déconnecté'}
                  {i === room.hostSeat && ' (hôte)'}
                </small>
              </span>
              {room.isHost && i !== room.you && (
                <button className="linkish small" onClick={() => net.emit('lobby:kick', { seat: i })}>Retirer</button>
              )}
            </li>
          ))}
          {room.seats.length < 4 && <li className="empty">Place libre : partagez le code ou le lien</li>}
        </ul>

        {me && (
          <div className="lobby-me">
            <p className="muted">Votre pion et votre couleur</p>
            <div className="ps-tokens">
              {TOKENS.map((t) => (
                <button
                  key={t}
                  className={`tok ${me.token === t ? 'on' : ''}`}
                  disabled={room.seats.some((s, j) => j !== room.you && s.token === t)}
                  onClick={() => net.emit('lobby:profile', { token: t })}
                  aria-label={`Pion ${t}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="ps-colors">
              {PLAYER_COLORS.map((c) => (
                <button
                  key={c}
                  className={`swatch ${me.color === c ? 'on' : ''}`}
                  style={{ background: c }}
                  disabled={room.seats.some((s, j) => j !== room.you && s.color === c)}
                  onClick={() => net.emit('lobby:profile', { color: c })}
                  aria-label={`Couleur ${c}`}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="setup-card">
        <h2>Règles de la maison</h2>
        {!room.isHost && <p className="muted">Seul l’hôte peut les modifier.</p>}
        <label className="opt">
          <span>Argent de départ</span>
          <select
            value={room.settings.startMoney}
            disabled={!room.isHost}
            onChange={(e) => setSetting({ startMoney: Number(e.target.value) })}
          >
            <option value={1000}>1 000 €</option>
            <option value={1500}>1 500 € (classique)</option>
            <option value={2000}>2 000 €</option>
            <option value={3000}>3 000 €</option>
          </select>
        </label>
        {RULES.map(([key, label]) => (
          <label className="opt check" key={key}>
            <input
              type="checkbox"
              checked={room.settings[key]}
              disabled={!room.isHost}
              onChange={(e) => setSetting({ [key]: e.target.checked })}
            />
            <span>{label}</span>
          </label>
        ))}
      </section>

      <div className="setup-actions">
        <span>{humans < 2 && room.seats.length < 2 ? 'Il faut au moins 2 joueurs.' : ''}</span>
        {room.isHost ? (
          <button className="btn primary big" disabled={room.seats.length < 2} onClick={() => net.emit('lobby:start')}>
            Lancer la partie
          </button>
        ) : (
          <span className="waiting">En attente du lancement par l’hôte…</span>
        )}
      </div>
    </div>
  );
}
