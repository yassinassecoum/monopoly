import { useState } from 'react';
import { TOKENS, PLAYER_COLORS } from '../data/board.js';

const DEFAULT_NAMES = ['Alice', 'Bruno', 'Chloé', 'David'];

export default function Setup({ saved, onStart, onResume, onDiscard, onRules, onOnline, rules }) {
  const [count, setCount] = useState(2);
  const [players, setPlayers] = useState(
    DEFAULT_NAMES.map((name, i) => ({ name, token: TOKENS[i], color: PLAYER_COLORS[i], isBot: i > 0 }))
  );
  const [settings, setSettings] = useState({
    startMoney: 1500,
    freeParking: false,
    doubleGo: false,
    auctions: true,
    limitedHouses: true,
  });

  const update = (i, patch) => setPlayers((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const active = players.slice(0, count);
  const tokenTaken = (t, i) => active.some((p, j) => j !== i && p.token === t);
  const colorTaken = (c, i) => active.some((p, j) => j !== i && p.color === c);
  const valid = active.every((p) => p.name.trim()) && new Set(active.map((p) => p.token)).size === count;

  const start = () => {
    if (!valid) return;
    onStart(active.map((p) => ({ ...p, name: p.name.trim() })), settings);
  };

  return (
    <div className="setup">
      <div className="setup-hero">
        <h1 className="setup-title">Magnat</h1>
        <p className="setup-sub">Achetez des rues, bâtissez des hôtels, ruinez vos amis. De 2 à 4 joueurs.</p>
        <div className="mode-switch" role="tablist" aria-label="Mode de jeu">
          <button role="tab" aria-selected="true" className="on">Sur cet écran</button>
          <button role="tab" aria-selected="false" onClick={onOnline}>En ligne avec des amis</button>
        </div>
      </div>

      {saved && (
        <div className="resume">
          <span>
            Partie en cours — tour {saved.turn}, {saved.players.filter((p) => !p.bankrupt).length} joueurs en lice.
          </span>
          <div className="row">
            <button className="btn primary" onClick={onResume}>Reprendre la partie</button>
            <button className="btn ghost" onClick={onDiscard}>Effacer</button>
          </div>
        </div>
      )}

      <section className="setup-card">
        <div className="setup-row">
          <h2>Joueurs</h2>
          <div className="seg" role="radiogroup" aria-label="Nombre de joueurs">
            {[2, 3, 4].map((n) => (
              <button key={n} role="radio" aria-checked={count === n} className={count === n ? 'on' : ''} onClick={() => setCount(n)}>
                {n}
              </button>
            ))}
          </div>
        </div>

        {active.map((p, i) => (
          <div className="player-setup" key={i} style={{ '--pc': p.color }}>
            <span className="ps-token">{p.token}</span>
            <input
              value={p.name}
              maxLength={14}
              onChange={(e) => update(i, { name: e.target.value })}
              aria-label={`Nom du joueur ${i + 1}`}
            />
            <div className="ps-tokens">
              {TOKENS.map((t) => (
                <button
                  key={t}
                  className={`tok ${p.token === t ? 'on' : ''}`}
                  disabled={tokenTaken(t, i)}
                  onClick={() => update(i, { token: t })}
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
                  className={`swatch ${p.color === c ? 'on' : ''}`}
                  style={{ background: c }}
                  disabled={colorTaken(c, i)}
                  onClick={() => update(i, { color: c })}
                  aria-label={`Couleur ${c}`}
                />
              ))}
            </div>
            <div className="seg small">
              <button className={!p.isBot ? 'on' : ''} onClick={() => update(i, { isBot: false })}>Humain</button>
              <button className={p.isBot ? 'on' : ''} onClick={() => update(i, { isBot: true })}>Ordinateur</button>
            </div>
          </div>
        ))}
      </section>

      <section className="setup-card">
        <h2>Règles de la maison</h2>
        <label className="opt">
          <span>Argent de départ</span>
          <select value={settings.startMoney} onChange={(e) => setSettings({ ...settings, startMoney: Number(e.target.value) })}>
            <option value={1000}>1 000 €</option>
            <option value={1500}>1 500 € (classique)</option>
            <option value={2000}>2 000 €</option>
            <option value={3000}>3 000 €</option>
          </select>
        </label>
        {[
          ['auctions', 'Enchères quand un terrain est refusé', 'Règle officielle : tous les joueurs peuvent enchérir.'],
          ['limitedHouses', 'Stock limité : 32 maisons, 12 hôtels', 'La pénurie de maisons est une vraie stratégie.'],
          ['freeParking', 'Cagnotte au Parc gratuit', 'Taxes et amendes vont au milieu du plateau.'],
          ['doubleGo', 'Salaire doublé pile sur Départ', 'Tomber exactement sur Départ rapporte 400 €.'],
        ].map(([key, label, hint]) => (
          <label className="opt check" key={key}>
            <input type="checkbox" checked={settings[key]} onChange={(e) => setSettings({ ...settings, [key]: e.target.checked })} />
            <span>
              {label}
              <small>{hint}</small>
            </span>
          </label>
        ))}
      </section>

      <div className="setup-actions">
        <button className="btn ghost" onClick={onRules}>Lire les règles</button>
        <button className="btn primary big" disabled={!valid} onClick={start}>Lancer la partie</button>
      </div>
      {rules}
    </div>
  );
}
