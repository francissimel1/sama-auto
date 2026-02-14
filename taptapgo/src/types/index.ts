// Types principaux pour TapTapGO

export type GameScreen = 'splash' | 'pseudo' | 'menu' | 'waiting' | 'game' | 'results' | 'leaderboard';

export type RoomStatus = 'waiting' | 'playing' | 'finished';

export interface Player {
  id: string;
  pseudo: string;
  position: number; // 0 à 5 (nombre de phrases réussies)
  isBot: boolean;
}

export interface Room {
  code: string;
  players: Player[];
  currentPhrase: string;
  phraseIndex: number;
  status: RoomStatus;
  createdAt: number;
  winner?: string; // player id
}

export interface PlayerStats {
  pseudo: string;
  gamesPlayed: number;
  victories: number;
  bestTime: number; // en ms, 0 = pas encore de temps
  totalAccuracy: number; // somme des précisions
  totalAttempts: number; // nombre total de tentatives pour calculer la moyenne
}

export interface PhraseSet {
  theme: string;
  phrases: string[];
}

export type BotErrorType = 'omit' | 'add' | 'swap' | 'replace';

export interface GameResult {
  won: boolean;
  myScore: number;
  opponentScore: number;
  totalTime: number; // en ms
  accuracy: number; // 0 à 1
  opponentPseudo: string;
}
