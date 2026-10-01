import Modal from './Modal.jsx';

const fmt = (n) => `${Math.round(n).toLocaleString('fr-FR')} €`;

function WealthChart({ history, players }) {
  if (history.length < 2) return null;
  const W = 520;
  const H = 180;
  const max = Math.max(1, ...history.flatMap((h) => h.worth));
  const x = (i) => (i / (history.length - 1)) * W;
  const y = (v) => H - (v / max) * (H - 10);
  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Évolution du patrimoine">
        {players.map((p) => (
          <polyline
            key={p.id}
            fill="none"
            stroke={p.color}
            strokeWidth="3"
            strokeLinejoin="round"
            points={history.map((h, i) => `${x(i)},${y(h.worth[p.id] ?? 0)}`).join(' ')}
          />
        ))}
      </svg>
      <figcaption>Patrimoine de chaque joueur au fil des tours</figcaption>
    </figure>
  );
}

export default function GameOver({ state, children }) {
  const winner = state.players[state.winner];
  const order = [...state.players].sort((a, b) => (a.id === state.winner ? -1 : b.id === state.winner ? 1 : 0));
  return (
    <Modal label="Fin de partie" wide>
      <div className="gameover">
        <p className="go-token">{winner.token}</p>
        <h2>{winner.name} remporte la partie</h2>
        <p className="muted">Après {state.turn} tours, avec {fmt(winner.money)} en caisse.</p>
        <WealthChart history={state.history} players={state.players} />
        <ol className="ranking">
          {order.map((p) => (
            <li key={p.id} style={{ '--pc': p.color }}>{p.token} {p.name}{p.bankrupt ? ' — faillite' : ''}</li>
          ))}
        </ol>
        <div className="row">{children}</div>
      </div>
    </Modal>
  );
}
