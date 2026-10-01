import { useState } from 'react';
import { TOKENS } from '../data/board.js';
import { loadProfile } from '../net/useOnline.js';

export default function OnlineMenu({ net, onBack }) {
  const params = new URLSearchParams(window.location.search);
  const [profile, setProfile] = useState(loadProfile);
  const [code, setCode] = useState((params.get('salle') || '').toUpperCase());
  const [busy, setBusy] = useState(false);
  const nameOk = profile.name.trim().length > 0;
  const offline = net.status !== 'online';

  const run = async (fn) => {
    setBusy(true);
    net.clearError();
    await fn();
    setBusy(false);
  };

  return (
    <div className="setup">
      <div className="setup-hero">
        <h1 className="setup-title">Magnat</h1>
        <p className="setup-sub">Créez une salle, envoyez le code à vos amis, chacun joue depuis chez lui.</p>
        <div className="mode-switch" role="tablist" aria-label="Mode de jeu">
          <button role="tab" aria-selected="false" onClick={onBack}>Sur cet écran</button>
          <button role="tab" aria-selected="true" className="on">En ligne avec des amis</button>
        </div>
      </div>

      {offline && (
        <p className="notice bad">
          {net.status === 'connecting'
            ? 'Connexion au serveur…'
            : 'Serveur injoignable. En local, lancez « npm run dev » : il démarre le jeu et le serveur ensemble.'}
        </p>
      )}
      {net.error && <p className="notice bad">{net.error}</p>}

      <section className="setup-card">
        <h2>Votre joueur</h2>
        <div className="player-setup solo">
          <span className="ps-token">{profile.token}</span>
          <input
            value={profile.name}
            maxLength={14}
            placeholder="Votre prénom"
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            aria-label="Votre nom"
            autoFocus
          />
          <div className="ps-tokens">
            {TOKENS.map((t) => (
              <button key={t} className={`tok ${profile.token === t ? 'on' : ''}`} onClick={() => setProfile({ ...profile, token: t })} aria-label={`Pion ${t}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="online-choices">
        <section className="setup-card">
          <h2>Créer une salle</h2>
          <p className="muted">Vous serez l’hôte : vous choisissez les règles et lancez la partie.</p>
          <button className="btn primary big" disabled={!nameOk || offline || busy} onClick={() => run(() => net.create(profile))}>
            Créer une salle
          </button>
        </section>
        <section className="setup-card">
          <h2>Rejoindre</h2>
          <p className="muted">Entrez le code à 4 caractères envoyé par l’hôte.</p>
          <div className="join-row">
            <input
              className="code-input"
              value={code}
              maxLength={4}
              placeholder="ABCD"
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              aria-label="Code de la salle"
            />
            <button
              className="btn primary big"
              disabled={!nameOk || code.length !== 4 || offline || busy}
              onClick={() => run(() => net.join(code, profile))}
            >
              Rejoindre
            </button>
          </div>
        </section>
      </div>
      {!nameOk && <p className="setup-note">Entrez votre prénom pour continuer.</p>}
    </div>
  );
}
