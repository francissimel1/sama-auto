// Gestionnaire des statistiques locales (localStorage)

import { PlayerStats } from '../types/index.js';
import { STATS_KEY, PSEUDO_KEY } from '../config/constants.js';

export class StatsManager {
  private stats: PlayerStats;

  constructor() {
    this.stats = this.loadStats();
    console.log('[StatsManager] Stats chargées:', this.stats);
  }

  // Charge les stats depuis localStorage
  private loadStats(): PlayerStats {
    try {
      const raw = localStorage.getItem(STATS_KEY);
      if (raw) {
        return JSON.parse(raw) as PlayerStats;
      }
    } catch (e) {
      console.warn('[StatsManager] Erreur lecture localStorage:', e);
    }
    return this.getDefaultStats();
  }

  // Stats par défaut
  private getDefaultStats(): PlayerStats {
    return {
      pseudo: '',
      gamesPlayed: 0,
      victories: 0,
      bestTime: 0,
      totalAccuracy: 0,
      totalAttempts: 0,
    };
  }

  // Sauvegarde les stats dans localStorage
  private saveStats(): void {
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(this.stats));
      console.log('[StatsManager] Stats sauvegardées');
    } catch (e) {
      console.warn('[StatsManager] Erreur écriture localStorage:', e);
    }
  }

  // Récupère le pseudo sauvegardé
  getPseudo(): string {
    try {
      return localStorage.getItem(PSEUDO_KEY) || '';
    } catch {
      return '';
    }
  }

  // Sauvegarde le pseudo
  setPseudo(pseudo: string): void {
    try {
      localStorage.setItem(PSEUDO_KEY, pseudo);
      this.stats.pseudo = pseudo;
      this.saveStats();
      console.log('[StatsManager] Pseudo sauvegardé:', pseudo);
    } catch (e) {
      console.warn('[StatsManager] Erreur sauvegarde pseudo:', e);
    }
  }

  // Vérifie si le pseudo existe
  hasPseudo(): boolean {
    return this.getPseudo().length > 0;
  }

  // Enregistre le résultat d'une partie
  recordGame(won: boolean, timeMs: number, accuracy: number): void {
    this.stats.gamesPlayed++;
    if (won) {
      this.stats.victories++;
    }
    if (timeMs > 0 && (this.stats.bestTime === 0 || timeMs < this.stats.bestTime)) {
      this.stats.bestTime = timeMs;
    }
    this.stats.totalAccuracy += accuracy;
    this.stats.totalAttempts++;
    this.saveStats();
    console.log('[StatsManager] Partie enregistrée:', { won, timeMs, accuracy });
  }

  // Récupère les stats
  getStats(): PlayerStats {
    return { ...this.stats };
  }

  // Calcule le taux de victoire en pourcentage
  getWinRate(): number {
    if (this.stats.gamesPlayed === 0) return 0;
    return Math.round((this.stats.victories / this.stats.gamesPlayed) * 100);
  }

  // Calcule la précision moyenne en pourcentage
  getAverageAccuracy(): number {
    if (this.stats.totalAttempts === 0) return 0;
    return Math.round((this.stats.totalAccuracy / this.stats.totalAttempts) * 100);
  }

  // Formate le meilleur temps pour l'affichage
  getFormattedBestTime(): string {
    if (this.stats.bestTime === 0) return '--';
    const seconds = Math.floor(this.stats.bestTime / 1000);
    const ms = this.stats.bestTime % 1000;
    return `${seconds}.${String(ms).padStart(3, '0')}s`;
  }
}
