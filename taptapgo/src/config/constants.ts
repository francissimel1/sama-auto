// Configuration et constantes du jeu TapTapGO

// Nombre de phrases pour gagner
export const PHRASES_TO_WIN = 5;

// Temps d'affichage du splash screen (ms)
export const SPLASH_DURATION = 2000;

// Délai avant que le bot rejoigne (ms)
export const BOT_JOIN_DELAY = 30000;

// Nombre max de joueurs en multijoueur
export const MAX_PLAYERS = 4;

// Configuration du bot
export const BOT_CONFIG = {
  // Temps par caractère (ms)
  msPerChar: 100,
  // Délai minimum aléatoire (ms)
  minDelay: 2000,
  // Délai maximum aléatoire (ms)
  maxDelay: 4000,
  // Taux d'erreur (0 à 1)
  errorRate: 0.15,
};

// Palette de couleurs
export const COLORS = {
  background: 0x1A1A2E,
  primary: 0xFF6B35,
  secondary: 0x004E89,
  accent: 0xF7B801,
  text: 0xEAEAEA,
  success: 0x2ECC71,
  error: 0xE74C3C,
  trackGray: 0x2D2D4A,
  trackLine: 0x3D3D5A,
};

// Couleurs CSS (pour les overlays HTML)
export const CSS_COLORS = {
  background: '#1A1A2E',
  primary: '#FF6B35',
  secondary: '#004E89',
  accent: '#F7B801',
  text: '#EAEAEA',
  success: '#2ECC71',
  error: '#E74C3C',
};

// Couleurs des joueurs (jusqu'à 4)
export const PLAYER_COLORS = [0xFF6B35, 0x004E89, 0x9B59B6, 0x2ECC71];

// Dimensions du canvas (responsive)
export const CANVAS = {
  width: 400,
  height: 700,
};

// Longueur du code de room
export const ROOM_CODE_LENGTH = 4;

// Pseudos possibles pour le bot
export const BOT_PSEUDOS = [
  'RoboTyper',
  'SpeedBot',
  'FlashKeys',
  'TurboType',
  'CyberFingers',
  'QuickBot',
  'TypeMaster',
  'NeonTyper',
];

// Clé localStorage pour les stats
export const STATS_KEY = 'taptapgo_stats';
export const PSEUDO_KEY = 'taptapgo_pseudo';

// Configuration Firebase (placeholder - à remplir par l'utilisateur)
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyC4bAed6NFXdPHs8DCxJa8m_E59xsZmtkQ',
  authDomain: 'taptap-f7f94.firebaseapp.com',
  databaseURL: 'https://taptap-f7f94-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'taptap-f7f94',
  storageBucket: 'taptap-f7f94.firebasestorage.app',
  messagingSenderId: '364908386765',
  appId: '1:364908386765:web:7e188fcf080bd54f7acc84',
};
