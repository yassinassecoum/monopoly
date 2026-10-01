import { useEffect, useRef } from 'react';

// Disposition des points sur une grille 3×3
const PIPS = {
  1: [5],
  2: [3, 7],
  3: [3, 5, 7],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
};

// Rotation du cube qui amène chaque face devant la caméra
const FACE_ROT = { 1: [0, 0], 2: [-90, 0], 3: [0, -90], 4: [0, 90], 5: [90, 0], 6: [0, 180] };
const FACES = [
  ['front', 1],
  ['back', 6],
  ['right', 3],
  ['left', 4],
  ['top', 2],
  ['bottom', 5],
];

function Face({ side, value }) {
  return (
    <div className={`face face-${side} ${value === 1 ? 'one' : ''}`}>
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className={PIPS[value].includes(i + 1) ? 'pip' : ''} />
      ))}
    </div>
  );
}

function Die({ value, rollId, index }) {
  const turns = useRef({ id: rollId, x: 0, y: 0, z: 0 });
  // À chaque nouveau lancer, on ajoute quelques tours complets : le dé tourbillonne
  // puis s'arrête exactement sur la bonne face.
  if (turns.current.id !== rollId) {
    const r = () => 2 + Math.floor(Math.random() * 2);
    turns.current = {
      id: rollId,
      x: turns.current.x + r(),
      y: turns.current.y + r(),
      z: turns.current.z + (Math.random() < 0.5 ? 1 : -1),
    };
  }
  const [bx, by] = FACE_ROT[value];
  const { x, y, z } = turns.current;
  const transform = `rotateX(${bx + x * 360}deg) rotateY(${by + y * 360}deg) rotateZ(${z * 360}deg)`;

  const wrapRef = useRef(null);
  const shadowRef = useRef(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const dx = index === 0 ? -70 : 70;
    wrapRef.current?.animate(
      [
        { transform: `translate(${dx}px, -110px)` },
        { transform: `translate(${dx * 0.3}px, 0)`, offset: 0.45 },
        { transform: `translate(${dx * 0.12}px, -26px)`, offset: 0.62 },
        { transform: 'translate(0, 0)', offset: 0.78 },
        { transform: 'translate(0, -6px)', offset: 0.88 },
        { transform: 'translate(0, 0)' },
      ],
      { duration: 1150, easing: 'ease-out' }
    );
    shadowRef.current?.animate(
      [
        { transform: `translateX(${dx}px) scale(0.4)`, opacity: 0.15 },
        { transform: `translateX(${dx * 0.3}px) scale(1)`, opacity: 0.45, offset: 0.45 },
        { transform: `translateX(${dx * 0.12}px) scale(0.8)`, opacity: 0.3, offset: 0.62 },
        { transform: 'translateX(0) scale(1)', opacity: 0.45 },
      ],
      { duration: 1150, easing: 'ease-out' }
    );
  }, [rollId, index]);

  return (
    <div className="die3d-slot">
      <div className="die3d-shadow" ref={shadowRef} />
      <div className="die3d-wrap" ref={wrapRef}>
        <div className="die3d" style={{ transform }} aria-hidden="true">
          <div className="die3d-core" />
          {FACES.map(([side, v]) => (
            <Face key={side} side={side} value={v} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Dice3D({ dice, rollId }) {
  const dbl = dice[0] === dice[1] && rollId > 0;
  return (
    <div
      className={`dice3d ${dbl ? 'double' : ''}`}
      role="img"
      aria-label={rollId > 0 ? `Dés : ${dice[0]} et ${dice[1]}` : 'Dés'}
    >
      <Die value={dice[0]} rollId={rollId} index={0} />
      <Die value={dice[1]} rollId={rollId} index={1} />
      {dbl && <span className="double-tag" key={rollId}>Double !</span>}
    </div>
  );
}
