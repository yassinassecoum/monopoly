# Magnat — jeu de plateau immobilier (React + Vite)


**https://monopoly-apu8.onrender.com/**

## Lancer le jeu

```bash
npm install
npm run dev
```

Le navigateur s'ouvre sur http://localhost:5173. Pour une version optimisée : `npm run build` puis `npm run preview`.

Nécessite Node.js 18 ou plus récent.

## Ce qui est implémenté

- 2 à 4 joueurs, chacun humain ou ordinateur, avec pion et couleur au choix
- Plateau de 40 cases : 22 rues en 8 quartiers, 4 gares, 2 compagnies, taxes, cartes, prison
- Deux dés animés, déplacement case par case, salaire de 200 € au passage sur Départ
- Doubles : on rejoue, trois doubles d'affilée envoient en prison
- Prison : caution de 50 €, carte « Libéré de prison », ou 3 essais pour faire un double
- Achat des terrains, enchères entre tous les joueurs si l'acheteur refuse
- Loyers officiels : doublés sur quartier complet, maisons, hôtels, gares (25 à 200 €), compagnies (4× ou 10× les dés)
- Construction et revente uniformes, stock limité de 32 maisons et 12 hôtels (optionnel)
- Hypothèques et levée d'hypothèque avec 10 % d'intérêts
- 16 cartes Hasard et 16 cartes Coffre : déplacements, gare la plus proche (loyer double), réparations, anniversaire…
- Dettes : si vous ne pouvez pas payer, vendez ou hypothéquez ; sinon faillite et vos biens vont au créancier
- Échanges entre joueurs : terrains, argent, cartes prison (les bots évaluent l'offre)
- Règles de la maison : cagnotte du Parc gratuit, salaire doublé sur Départ, argent de départ
- Sauvegarde automatique (reprise après fermeture de l'onglet)
- Journal de partie, patrimoine en direct, graphique d'évolution en fin de partie
- Vitesse réglable, raccourci Espace, responsive mobile

## Structure

```
src/
  data/board.js        plateau, quartiers, prix et loyers
  data/cards.js        cartes Hasard et Coffre
  game/logic.js        toutes les règles (reducer pur, sans React)
  game/bot.js          intelligence des joueurs ordinateur
  components/          interface React
  net/useOnline.js     connexion au serveur, reconnexion
  LocalGame.jsx        partie sur un seul écran
  OnlineGame.jsx       partie en ligne
  App.jsx              choix du mode
  styles.css           style
server/
  index.js             serveur Express + Socket.io
  rooms.js             salles, droits des joueurs, déroulement des parties
```

Toute la logique est dans `game/logic.js`, un reducer pur : `reducer(state, action) → nouvel état`.
Le serveur réutilise exactement le même fichier : les règles sont identiques en local et en ligne.

## Jouer en ligne avec des amis

Le jeu a deux modes, au choix sur l'écran d'accueil :
- **Sur cet écran** : tout le monde joue sur le même ordinateur (aucun serveur nécessaire).
- **En ligne avec des amis** : chacun joue depuis chez lui. Un joueur crée une salle, partage le code
  à 4 caractères (ou le lien d'invitation), les autres le rejoignent.

En ligne, c'est le serveur Node (`server/`) qui fait tourner la partie : il applique les règles,
fait jouer les ordinateurs et envoie l'état à chaque joueur. Personne ne peut tricher ou jouer à la place d'un autre.

Fonctions en ligne : salon d'attente, choix du pion et de la couleur, ajout d'ordinateurs, règles réglées par l'hôte,
échanges avec réponse en direct, reconnexion automatique (rechargez la page, vous retrouvez votre place),
remplacement d'un joueur absent par l'ordinateur (et reprise de la main à son retour).

### 1. Tester chez soi

```bash
npm install
npm run dev
```

Cette commande lance le jeu (port 5173) **et** le serveur (port 3001). Ouvrez deux onglets, créez une salle dans l'un,
rejoignez-la dans l'autre.

**Même Wi-Fi** : Vite affiche une adresse « Network » (ex. `http://192.168.1.20:5173`).
Vos amis sur le même réseau peuvent l'ouvrir directement.

### 2. Mettre en ligne (pour jouer à distance)

Le plus simple : héberger le serveur sur Render, qui sert à la fois le jeu et les parties.

1. Créez un dépôt GitHub et poussez-y ce dossier (sans `node_modules`).
2. Sur render.com, créez un compte puis **New > Web Service** et choisissez votre dépôt.
3. Réglages :
   - Build Command : `npm install && npm run build`
   - Start Command : `npm start`
   - Instance : Free
4. Après quelques minutes, Render donne une adresse du type `https://magnat-xxxx.onrender.com`.
   Envoyez-la à vos amis : c'est tout.

Le fichier `render.yaml` permet aussi de tout configurer automatiquement (New > Blueprint).

**À savoir sur l'offre gratuite** : le serveur s'endort après 15 minutes sans activité. La première connexion
après une pause prend alors environ 30 secondes. Pendant une partie, la connexion le garde éveillé.
Si le serveur redémarre en pleine partie, rien n'est perdu : chaque navigateur garde une copie de la partie
et la renvoie au serveur automatiquement à la reconnexion.

N'importe quel hébergeur Node qui accepte les WebSockets fonctionne aussi (Railway, Fly.io, un VPS…) :
mêmes commandes `npm run build` puis `npm start`. Le port est lu dans la variable `PORT`.

### Pour développer

- `npm run dev:client` / `npm run dev:server` lancent chaque partie séparément.
- `VITE_SERVER_URL=https://mon-serveur npm run build` compile un client qui se connecte à un serveur hébergé ailleurs
  (utile si vous mettez le jeu sur Netlify ou Vercel et le serveur ailleurs).
