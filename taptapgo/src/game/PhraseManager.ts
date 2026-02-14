// Gestionnaire des phrases du jeu

import phrasesData from '../data/phrases.json';
import { PhraseSet } from '../types/index.js';
import { PHRASES_TO_WIN } from '../config/constants.js';

export class PhraseManager {
  private allPhrases: PhraseSet[];
  private currentPhrases: string[] = [];
  private currentIndex: number = 0;

  constructor() {
    this.allPhrases = phrasesData as PhraseSet[];
    console.log(`[PhraseManager] ${this.getTotalPhraseCount()} phrases chargées depuis ${this.allPhrases.length} thèmes`);
  }

  // Nombre total de phrases disponibles
  getTotalPhraseCount(): number {
    return this.allPhrases.reduce((sum, set) => sum + set.phrases.length, 0);
  }

  // Sélectionne un ensemble aléatoire de phrases pour une partie
  generateGamePhrases(): string[] {
    // Mélange toutes les phrases puis en prend PHRASES_TO_WIN
    const all = this.allPhrases.flatMap(set => set.phrases);
    const shuffled = this.shuffle([...all]);
    this.currentPhrases = shuffled.slice(0, PHRASES_TO_WIN);
    this.currentIndex = 0;
    console.log('[PhraseManager] Phrases sélectionnées:', this.currentPhrases);
    return [...this.currentPhrases];
  }

  // Récupère la phrase courante
  getCurrentPhrase(): string {
    if (this.currentIndex >= this.currentPhrases.length) {
      return '';
    }
    return this.currentPhrases[this.currentIndex];
  }

  // Passe à la phrase suivante et retourne true si la partie continue
  nextPhrase(): boolean {
    this.currentIndex++;
    const hasMore = this.currentIndex < this.currentPhrases.length;
    console.log(`[PhraseManager] Phrase suivante: ${this.currentIndex}/${this.currentPhrases.length}`);
    return hasMore;
  }

  // Index courant
  getCurrentIndex(): number {
    return this.currentIndex;
  }

  // Vérifie si la réponse est correcte (insensible à la casse)
  checkAnswer(input: string): boolean {
    const current = this.getCurrentPhrase();
    if (!current) return false;
    return input.trim().toLowerCase() === current.trim().toLowerCase();
  }

  // Récupère les phrases de la partie en cours
  getGamePhrases(): string[] {
    return [...this.currentPhrases];
  }

  // Définit les phrases (pour synchronisation multijoueur)
  setGamePhrases(phrases: string[]): void {
    this.currentPhrases = [...phrases];
    this.currentIndex = 0;
    console.log('[PhraseManager] Phrases définies depuis Firebase:', this.currentPhrases);
  }

  // Mélange un tableau (Fisher-Yates)
  private shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}
