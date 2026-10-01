export default function GameLog({ log }) {
  return (
    <section className="log">
      <h2>Journal</h2>
      <ol>
        {log.map((l) => (
          <li key={l.id} className={`log-${l.kind}`}>{l.msg}</li>
        ))}
      </ol>
    </section>
  );
}
