// Types d'effets :
// money (amount +/-), moveTo (target), moveBack (n), nearest (kind), jail, jailCard,
// repairs (house, hotel), payEach (amount), collectEach (amount)

export const CHANCE = [
  { text: 'Avancez jusqu’à la case Départ.', type: 'moveTo', target: 0 },
  { text: 'Rendez-vous Boulevard des Lumières. Si vous passez par Départ, touchez 200 €.', type: 'moveTo', target: 24 },
  { text: 'Rendez-vous Boulevard des Artisans. Si vous passez par Départ, touchez 200 €.', type: 'moveTo', target: 11 },
  { text: 'Filez à la gare la plus proche. Si elle appartient à quelqu’un, payez-lui le double du loyer.', type: 'nearest', kind: 'station' },
  { text: 'Filez à la gare la plus proche. Si elle appartient à quelqu’un, payez-lui le double du loyer.', type: 'nearest', kind: 'station' },
  { text: 'Allez à la compagnie la plus proche. Si elle appartient à quelqu’un, payez 10 fois le total des dés.', type: 'nearest', kind: 'utility' },
  { text: 'Vos placements rapportent : la banque vous verse 50 €.', type: 'money', amount: 50 },
  { text: 'Libéré de prison. Gardez cette carte jusqu’à ce que vous en ayez besoin.', type: 'jailCard' },
  { text: 'Vous avez oublié vos clés : reculez de 3 cases.', type: 'moveBack', n: 3 },
  { text: 'Contrôle fiscal surprise : allez directement en prison, sans passer par Départ.', type: 'jail' },
  { text: 'Ravalement de façades : payez 25 € par maison et 100 € par hôtel.', type: 'repairs', house: 25, hotel: 100 },
  { text: 'Flashé en trottinette : amende de 15 €.', type: 'money', amount: -15 },
  { text: 'Prenez le train à la Gare du Nord. Si vous passez par Départ, touchez 200 €.', type: 'moveTo', target: 5 },
  { text: 'Une soirée sur l’Avenue des Palais vous attend.', type: 'moveTo', target: 39 },
  { text: 'Vous êtes élu président du club : versez 50 € à chaque joueur.', type: 'payEach', amount: 50 },
  { text: 'Votre prêt immobilier arrive à échéance : touchez 150 €.', type: 'money', amount: 150 },
];

export const COMMUNITY = [
  { text: 'Avancez jusqu’à la case Départ.', type: 'moveTo', target: 0 },
  { text: 'La banque s’est trompée en votre faveur : touchez 200 €.', type: 'money', amount: 200 },
  { text: 'Visite chez le dentiste : payez 50 €.', type: 'money', amount: -50 },
  { text: 'Vous revendez quelques actions : touchez 50 €.', type: 'money', amount: 50 },
  { text: 'Libéré de prison. Gardez cette carte jusqu’à ce que vous en ayez besoin.', type: 'jailCard' },
  { text: 'Fraude au parcmètre : allez directement en prison, sans passer par Départ.', type: 'jail' },
  { text: 'Votre épargne vacances arrive à terme : touchez 100 €.', type: 'money', amount: 100 },
  { text: 'Remboursement d’impôts : touchez 20 €.', type: 'money', amount: 20 },
  { text: 'C’est votre anniversaire : chaque joueur vous offre 10 €.', type: 'collectEach', amount: 10 },
  { text: 'Votre assurance vie vous verse 100 €.', type: 'money', amount: 100 },
  { text: 'Frais d’hospitalisation : payez 100 €.', type: 'money', amount: -100 },
  { text: 'Inscription à l’école de cuisine : payez 50 €.', type: 'money', amount: -50 },
  { text: 'Mission de conseil réussie : touchez 25 €.', type: 'money', amount: 25 },
  { text: 'Travaux de voirie : payez 40 € par maison et 115 € par hôtel.', type: 'repairs', house: 40, hotel: 115 },
  { text: 'Deuxième prix au concours de jardinage : touchez 10 €.', type: 'money', amount: 10 },
  { text: 'Un oncle lointain vous lègue 100 €.', type: 'money', amount: 100 },
];

export const DECKS = { chance: CHANCE, community: COMMUNITY };
export const DECK_NAMES = { chance: 'Hasard', community: 'Coffre' };
