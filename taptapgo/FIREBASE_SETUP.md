# Configuration Firebase - TapTapGO

Guide étape par étape pour activer le mode multijoueur.

## 1. Créer un projet Firebase

1. Rendez-vous sur [console.firebase.google.com](https://console.firebase.google.com)
2. Cliquez sur "Ajouter un projet"
3. Nommez-le (ex: `taptapgo`)
4. Désactivez Google Analytics (optionnel pour ce projet)
5. Cliquez "Créer un projet"

## 2. Activer la Realtime Database

1. Dans le menu latéral, cliquez sur **"Build" → "Realtime Database"**
2. Cliquez **"Créer une base de données"**
3. Choisissez la région la plus proche
4. Sélectionnez **"Mode test"** pour commencer (les règles de sécurité seront ajoutées ensuite)
5. Cliquez **"Activer"**

## 3. Récupérer la configuration

1. Cliquez sur l'icône **engrenage** → **"Paramètres du projet"**
2. Scrollez jusqu'à **"Vos applications"**
3. Cliquez sur l'icône **Web** (`</>`)
4. Nommez l'app (ex: `taptapgo-web`)
5. Copiez l'objet `firebaseConfig`

## 4. Configurer le projet

Ouvrez `src/config/constants.ts` et remplacez les valeurs de `FIREBASE_CONFIG` :

```typescript
export const FIREBASE_CONFIG = {
  apiKey: 'VOTRE_API_KEY',
  authDomain: 'votre-projet.firebaseapp.com',
  databaseURL: 'https://votre-projet-default-rtdb.firebaseio.com',
  projectId: 'votre-projet',
  storageBucket: 'votre-projet.appspot.com',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:abcdef',
};
```

## 5. Règles de sécurité (production)

Dans la console Firebase → Realtime Database → Règles, remplacez par :

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": true,
        ".write": true,
        ".validate": "newData.hasChildren(['code', 'players', 'status'])",
        "players": {
          ".validate": "newData.val().length <= 2"
        }
      }
    }
  }
}
```

Pour la production, ajoutez une validation plus stricte et un nettoyage automatique des rooms expirées.

## 6. Tester

```bash
npm run dev
```

1. Ouvrez le jeu dans un navigateur → "Créer une partie"
2. Notez le code affiché (ex: `AB12`)
3. Ouvrez un second onglet/navigateur → "Rejoindre une partie" → entrez le code
4. La partie démarre automatiquement

## Structure Firebase

```
rooms/
  {roomId}/
    code: "AB12"
    players: [{id, pseudo, position, isBot}, ...]
    currentPhrase: "La phrase courante"
    phraseIndex: 0
    phrases: ["phrase1", "phrase2", ...]
    status: "waiting" | "playing" | "finished"
    createdAt: 1700000000000
    winner: "player_id" (optionnel)
```

## Dépannage

| Problème | Solution |
|----------|----------|
| "Firebase non configuré" | Vérifiez que `apiKey` et `databaseURL` ne sont pas vides |
| Room introuvable | Le code est sensible à la casse (toujours en majuscules) |
| Pas de synchronisation | Vérifiez les règles de sécurité de la base de données |
| Erreur CORS | Ajoutez votre domaine aux domaines autorisés dans Firebase |
