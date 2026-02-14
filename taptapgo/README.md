# TapTapGO

Jeu multijoueur PWA de frappe rapide. Deux joueurs s'affrontent en tapant des phrases le plus vite possible. 5 phrases correctes = victoire !

## Stack technique

- **Frontend** : Vite + TypeScript + PixiJS 7.3
- **Backend** : Firebase Realtime Database (optionnel)
- **PWA** : Service Worker + Manifest
- **Stockage local** : localStorage pour les stats

## Fonctionnalités

- Mode solo contre un bot IA intelligent
- Mode multijoueur temps réel via Firebase
- 300 phrases variées (10 thèmes x 30 phrases)
- Statistiques locales persistantes
- Installable sur mobile (PWA)
- Design mobile-first inspiré Duolingo/Kahoot

## Démarrage rapide

```bash
cd taptapgo
npm install
npm run dev
```

Le jeu est jouable immédiatement en mode solo (avec bot). Pour le multijoueur, voir [FIREBASE_SETUP.md](./FIREBASE_SETUP.md).

## Structure du projet

```
taptapgo/
├── src/
│   ├── main.ts              # Point d'entrée
│   ├── types/index.ts        # Types TypeScript
│   ├── config/constants.ts   # Configuration
│   ├── data/phrases.json     # 300 phrases (10 thèmes)
│   ├── game/
│   │   ├── GameEngine.ts     # Moteur principal PixiJS
│   │   ├── PhraseManager.ts  # Gestion des phrases
│   │   ├── StatsManager.ts   # Stats locales (localStorage)
│   │   └── BotAI.ts          # Intelligence du bot
│   ├── multiplayer/
│   │   └── FirebaseService.ts # Service Firebase
│   └── styles/
│       └── main.css          # Styles
├── public/
│   ├── manifest.json         # PWA manifest
│   ├── sw.js                 # Service Worker
│   └── icons/
│       └── generate-icons.html # Générateur d'icônes PWA
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Bot IA

Le bot simule un joueur humain avec :
- Vitesse adaptative (100ms par caractère + délai 2-4s)
- Taux d'erreur de 15%
- 4 types d'erreurs réalistes (oubli, ajout, inversion, remplacement)
- Se connecte automatiquement après 30s en salle d'attente

## Sons (optionnel)

Pour ajouter des effets sonores, placez les fichiers dans `public/sounds/` :
- `correct.mp3` : son de bonne réponse
- `wrong.mp3` : son de mauvaise réponse
- `win.mp3` : son de victoire
- `lose.mp3` : son de défaite
- `tick.mp3` : son de frappe

Puis importez Howler.js dans `GameEngine.ts` pour les jouer.

## Scripts

| Commande | Description |
|----------|-------------|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run preview` | Prévisualisation du build |

## Licence

MIT
