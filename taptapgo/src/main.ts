// Point d'entrée principal de TapTapGO
// =========================================
//
// ⚠️ CONFIGURATION FIREBASE :
// Pour activer le mode multijoueur, modifiez les valeurs dans
// src/config/constants.ts → FIREBASE_CONFIG
// Voir FIREBASE_SETUP.md pour les instructions détaillées.
//
// Sans Firebase, le jeu fonctionne en mode solo avec un bot IA.
// =========================================

import { GameEngine } from './game/GameEngine.js';
import './styles/main.css';

// Enregistrement du Service Worker pour la PWA
async function registerServiceWorker(): Promise<void> {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('./sw.js');
      console.log('[SW] Service Worker enregistré:', registration.scope);
    } catch (error) {
      console.warn('[SW] Échec enregistrement Service Worker:', error);
    }
  }
}

// Démarrage du jeu
async function startGame(): Promise<void> {
  console.log('=================================');
  console.log('  TapTapGO v1.0 - Démarrage...');
  console.log('=================================');

  // Enregistrer le Service Worker
  await registerServiceWorker();

  // Créer et initialiser le moteur de jeu
  const engine = new GameEngine();
  await engine.init();

  console.log('[Main] Jeu démarré avec succès !');
}

// Lancer le jeu au chargement du DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startGame);
} else {
  startGame();
}
