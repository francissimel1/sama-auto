// Gestionnaire audio du jeu TapTapGO - Utilise Howler.js

import { Howl } from 'howler';

type SoundName = 'correct' | 'wrong' | 'win' | 'lose' | 'tick';

export class SoundManager {
  private sounds: Record<SoundName, Howl>;
  private muted: boolean = false;

  constructor() {
    this.sounds = {
      correct: new Howl({ src: ['/sounds/correct.mp3'], volume: 0.6 }),
      wrong: new Howl({ src: ['/sounds/wrong.mp3'], volume: 0.5 }),
      win: new Howl({ src: ['/sounds/win.mp3'], volume: 0.7 }),
      lose: new Howl({ src: ['/sounds/lose.mp3'], volume: 0.6 }),
      tick: new Howl({ src: ['/sounds/tick.mp3'], volume: 0.4 }),
    };

    // Charger le préférence utilisateur
    this.muted = localStorage.getItem('taptapgo_muted') === 'true';
  }

  play(name: SoundName): void {
    if (this.muted) return;
    this.sounds[name].play();
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    localStorage.setItem('taptapgo_muted', String(this.muted));
    return this.muted;
  }

  isMuted(): boolean {
    return this.muted;
  }
}
