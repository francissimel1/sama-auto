# Démarrage rapide - TapTapGO

## Prérequis

- Node.js 18+
- npm 9+

## Installation

```bash
cd taptapgo
npm install
npm run dev
```

Le jeu s'ouvre automatiquement dans votre navigateur sur `http://localhost:3000`.

## Premier lancement

1. **Splash screen** (2 secondes) → se ferme automatiquement
2. **Choix du pseudo** → entrez votre pseudo et cliquez "C'est parti !"
3. **Menu principal** → 3 options :
   - **Créer une partie** : crée une room (mode solo si Firebase non configuré)
   - **Rejoindre une partie** : entrez un code de room (nécessite Firebase)
   - **Jouer contre le Bot** : partie solo immédiate
4. **Jouez !** → tapez les phrases affichées et validez avec Entrée
5. **5 phrases correctes** = victoire

## Mode solo (sans Firebase)

Le jeu fonctionne parfaitement sans Firebase. Un bot IA jouera contre vous avec :
- Temps de réponse adapté à la longueur de la phrase
- 15% de chance de faire une erreur
- Comportement réaliste (simule un vrai joueur)

## Mode multijoueur (avec Firebase)

Voir [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) pour la configuration.

## Build de production

```bash
npm run build
```

Les fichiers optimisés sont générés dans le dossier `dist/`.

## Icônes PWA

Ouvrez `public/icons/generate-icons.html` dans votre navigateur pour générer les icônes 192x192 et 512x512.
