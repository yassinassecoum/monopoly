// Plateau de 40 cases. Les prix et loyers suivent l'équilibre classique du jeu.
// rent = [terrain nu, 1 maison, 2, 3, 4, hôtel]

export const GROUPS = {
  brown:     { name: 'Les Tanneries',   color: '#7a4a2a', house: 50 },
  lightblue: { name: 'Les Lavoirs',     color: '#8fd3e8', house: 50 },
  pink:      { name: 'Les Ateliers',    color: '#d6589f', house: 100 },
  orange:    { name: 'Le Port',         color: '#f08a24', house: 100 },
  red:       { name: 'Les Théâtres',    color: '#d7263d', house: 150 },
  yellow:    { name: 'Les Arcades',     color: '#f2c913', house: 150 },
  green:     { name: 'La Bourse',       color: '#1f9d55', house: 200 },
  darkblue:  { name: 'Les Hauteurs',    color: '#2340a0', house: 200 },
};

const P = (name, group, price, rent) => ({ type: 'property', name, group, price, rent });
const S = (name) => ({ type: 'station', name, price: 200 });
const U = (name, icon) => ({ type: 'utility', name, price: 150, icon });

const RAW = [
  { type: 'go', name: 'Départ' },
  P('Ruelle des Tanneurs', 'brown', 60, [2, 10, 30, 90, 160, 250]),
  { type: 'community', name: 'Coffre' },
  P('Impasse du Vieux Puits', 'brown', 60, [4, 20, 60, 180, 320, 450]),
  { type: 'tax', name: 'Impôt sur le revenu', amount: 200 },
  S('Gare du Nord'),
  P('Rue des Lavandières', 'lightblue', 100, [6, 30, 90, 270, 400, 550]),
  { type: 'chance', name: 'Hasard' },
  P('Allée des Tilleuls', 'lightblue', 100, [6, 30, 90, 270, 400, 550]),
  P('Place aux Herbes', 'lightblue', 120, [8, 40, 100, 300, 450, 600]),
  { type: 'jail', name: 'Prison' },
  P('Boulevard des Artisans', 'pink', 140, [10, 50, 150, 450, 625, 750]),
  U('Centrale Électrique', '⚡'),
  P('Rue de la Forge', 'pink', 140, [10, 50, 150, 450, 625, 750]),
  P('Avenue des Horlogers', 'pink', 160, [12, 60, 180, 500, 700, 900]),
  S("Gare de l'Est"),
  P('Quai des Bateliers', 'orange', 180, [14, 70, 200, 550, 750, 950]),
  { type: 'community', name: 'Coffre' },
  P('Rue du Phare', 'orange', 180, [14, 70, 200, 550, 750, 950]),
  P('Place de la Criée', 'orange', 200, [16, 80, 220, 600, 800, 1000]),
  { type: 'parking', name: 'Parc gratuit' },
  P('Avenue des Coulisses', 'red', 220, [18, 90, 250, 700, 875, 1050]),
  { type: 'chance', name: 'Hasard' },
  P("Rue de l'Opéra", 'red', 220, [18, 90, 250, 700, 875, 1050]),
  P('Boulevard des Lumières', 'red', 240, [20, 100, 300, 750, 925, 1100]),
  S('Gare du Sud'),
  P('Cours des Mécènes', 'yellow', 260, [22, 110, 330, 800, 975, 1150]),
  P('Rue des Joailliers', 'yellow', 260, [22, 110, 330, 800, 975, 1150]),
  U('Compagnie des Eaux', '💧'),
  P('Place des Arcades', 'yellow', 280, [24, 120, 360, 850, 1025, 1200]),
  { type: 'gotojail', name: 'Allez en prison' },
  P('Avenue du Parlement', 'green', 300, [26, 130, 390, 900, 1100, 1275]),
  P('Rue des Banquiers', 'green', 300, [26, 130, 390, 900, 1100, 1275]),
  { type: 'community', name: 'Coffre' },
  P('Place de la Bourse', 'green', 320, [28, 150, 450, 1000, 1200, 1400]),
  S("Gare de l'Ouest"),
  { type: 'chance', name: 'Hasard' },
  P('Promenade du Belvédère', 'darkblue', 350, [35, 175, 500, 1100, 1300, 1500]),
  { type: 'tax', name: 'Taxe de luxe', amount: 100 },
  P('Avenue des Palais', 'darkblue', 400, [50, 200, 600, 1400, 1700, 2000]),
];

export const SQUARES = RAW.map((sq, id) => ({ ...sq, id }));

export const GROUP_MEMBERS = Object.fromEntries(
  Object.keys(GROUPS).map((g) => [g, SQUARES.filter((s) => s.group === g).map((s) => s.id)])
);
export const STATIONS = SQUARES.filter((s) => s.type === 'station').map((s) => s.id);
export const UTILITIES = SQUARES.filter((s) => s.type === 'utility').map((s) => s.id);

export const isOwnable = (sq) => sq.type === 'property' || sq.type === 'station' || sq.type === 'utility';

export const TOKENS = ['🎩', '🚗', '🐕', '⛵', '🦖', '🚀', '🐈', '🎸'];
export const PLAYER_COLORS = ['#e4572e', '#3a86ff', '#2bb673', '#a259ff', '#ffb000', '#ff4f9a'];
