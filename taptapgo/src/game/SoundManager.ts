// Gestionnaire audio du jeu TapTapGO - Utilise Howler.js

import { Howl } from 'howler';

type SoundName = 'correct' | 'wrong' | 'win' | 'lose' | 'tick';

export class SoundManager {
  private sounds: Record<SoundName, Howl>;
  private bgMusic: Howl;
  private muted: boolean = false;

  constructor() {
    this.sounds = {
      correct: new Howl({ src: ['/sounds/correct.mp3'], volume: 0.6 }),
      wrong: new Howl({ src: ['/sounds/wrong.mp3'], volume: 0.5 }),
      win: new Howl({ src: ['/sounds/win.mp3'], volume: 0.7 }),
      lose: new Howl({ src: ['/sounds/lose.mp3'], volume: 0.6 }),
      tick: new Howl({ src: ['/sounds/tick.mp3'], volume: 0.4 }),
    };

    this.bgMusic = new Howl({
      src: ['/sounds/bgm.wav'],
      volume: 0.3,
      loop: true,
    });

    // Charger le préférence utilisateur
    this.muted = localStorage.getItem('taptapgo_muted') === 'true';
  }

  play(name: SoundName): void {
    if (this.muted) return;
    this.sounds[name].play();
  }

  startBgMusic(): void {
    if (this.muted) return;
    if (!this.bgMusic.playing()) {
      this.bgMusic.play();
    }
  }

  stopBgMusic(): void {
    this.bgMusic.fade(this.bgMusic.volume(), 0, 500);
    setTimeout(() => this.bgMusic.stop(), 500);
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    localStorage.setItem('taptapgo_muted', String(this.muted));
    if (this.muted) {
      this.bgMusic.pause();
    } else if (this.bgMusic.seek() > 0) {
      this.bgMusic.play();
    }
    return this.muted;
  }

  isMuted(): boolean {
    return this.muted;
  }
}
