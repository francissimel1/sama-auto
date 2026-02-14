// Intelligence artificielle du bot adversaire

import { BotErrorType } from '../types/index.js';
import { BOT_CONFIG, BOT_PSEUDOS } from '../config/constants.js';

export class BotAI {
  private pseudo: string;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private onAnswer: ((correct: boolean) => void) | null = null;

  constructor() {
    // Choix aléatoire du pseudo du bot
    this.pseudo = BOT_PSEUDOS[Math.floor(Math.random() * BOT_PSEUDOS.length)];
    console.log(`[BotAI] Bot créé avec le pseudo: ${this.pseudo}`);
  }

  getPseudo(): string {
    return this.pseudo;
  }

  // Démarre la simulation de frappe pour une phrase
  startTyping(phrase: string, callback: (correct: boolean) => void): void {
    this.stop(); // Arrête toute simulation en cours
    this.onAnswer = callback;

    // Calcul du temps de réponse
    const baseTime = phrase.length * BOT_CONFIG.msPerChar;
    const randomDelay = BOT_CONFIG.minDelay + Math.random() * (BOT_CONFIG.maxDelay - BOT_CONFIG.minDelay);
    const totalDelay = baseTime + randomDelay;

    console.log(`[BotAI] Va répondre dans ${Math.round(totalDelay)}ms pour "${phrase.substring(0, 30)}..."`);

    this.timeoutId = setTimeout(() => {
      // Déterminer si le bot fait une erreur
      const makesError = Math.random() < BOT_CONFIG.errorRate;

      if (makesError) {
        console.log('[BotAI] Fait une erreur intentionnelle');
        // Le bot soumet une mauvaise réponse, puis réessaie
        if (this.onAnswer) this.onAnswer(false);

        // Réessai après un court délai
        const retryDelay = 1000 + Math.random() * 2000;
        this.timeoutId = setTimeout(() => {
          console.log('[BotAI] Réessai après erreur');
          if (this.onAnswer) this.onAnswer(true);
        }, retryDelay);
      } else {
        console.log('[BotAI] Répond correctement');
        if (this.onAnswer) this.onAnswer(true);
      }
    }, totalDelay);
  }

  // Génère une erreur de frappe réaliste
  static generateTypo(phrase: string): string {
    if (phrase.length < 2) return phrase;

    const errorTypes: BotErrorType[] = ['omit', 'add', 'swap', 'replace'];
    const errorType = errorTypes[Math.floor(Math.random() * errorTypes.length)];
    const pos = Math.floor(Math.random() * phrase.length);
    const chars = phrase.split('');

    switch (errorType) {
      case 'omit':
        // Oubli d'un caractère
        chars.splice(pos, 1);
        break;
      case 'add':
        // Ajout d'un caractère aléatoire
        chars.splice(pos, 0, String.fromCharCode(97 + Math.floor(Math.random() * 26)));
        break;
      case 'swap':
        // Inversion de deux caractères adjacents
        if (pos < chars.length - 1) {
          [chars[pos], chars[pos + 1]] = [chars[pos + 1], chars[pos]];
        }
        break;
      case 'replace':
        // Remplacement par un caractère proche sur le clavier
        chars[pos] = String.fromCharCode(97 + Math.floor(Math.random() * 26));
        break;
    }

    return chars.join('');
  }

  // Arrête le bot
  stop(): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.onAnswer = null;
  }
}
