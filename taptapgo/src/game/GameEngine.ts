// Moteur principal du jeu TapTapGO - Gestion PixiJS + Overlays HTML

import * as PIXI from 'pixi.js';
import { GameScreen, Player, GameResult } from '../types/index.js';
import { COLORS, CSS_COLORS, CANVAS, PHRASES_TO_WIN, SPLASH_DURATION, BOT_JOIN_DELAY, MAX_PLAYERS, PLAYER_COLORS } from '../config/constants.js';
import { StatsManager } from './StatsManager.js';
import { PhraseManager } from './PhraseManager.js';
import { BotAI } from './BotAI.js';
import { FirebaseService } from '../multiplayer/FirebaseService.js';
import { SoundManager } from './SoundManager.js';

export class GameEngine {
  private app!: PIXI.Application;
  private statsManager: StatsManager;
  private phraseManager: PhraseManager;
  private botAI: BotAI | null = null;
  private firebaseService: FirebaseService;
  private soundManager: SoundManager;

  private currentScreen: GameScreen = 'splash';
  private overlay!: HTMLDivElement;

  // État du jeu
  private myPlayer: Player | null = null;
  private opponents: Player[] = [];
  private roomCode: string = '';
  private isHost: boolean = false;
  private gameStartTime: number = 0;
  private correctAnswers: number = 0;
  private totalAttempts: number = 0;
  private botJoinTimeout: ReturnType<typeof setTimeout> | null = null;
  private isUsingBot: boolean = false;

  // PixiJS containers
  private splashContainer!: PIXI.Container;
  private trackContainer!: PIXI.Container;

  constructor() {
    this.statsManager = new StatsManager();
    this.phraseManager = new PhraseManager();
    this.firebaseService = new FirebaseService();
    this.soundManager = new SoundManager();
    console.log('[GameEngine] Moteur initialisé');
  }

  // Initialisation principale
  async init(): Promise<void> {
    // Créer l'application PixiJS
    this.app = new PIXI.Application({
      width: CANVAS.width,
      height: CANVAS.height,
      backgroundColor: COLORS.background,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      antialias: true,
    });

    // Ajouter le canvas au DOM
    const container = document.getElementById('game-container');
    if (container) {
      container.appendChild(this.app.view as HTMLCanvasElement);
    }

    // Rendre le canvas responsive
    this.setupResponsive();

    // Créer l'overlay HTML (pour les inputs)
    this.createOverlay();

    // Tenter l'initialisation Firebase
    await this.firebaseService.init();

    // Démarrer le splash screen
    this.showSplash();
  }

  // Configuration responsive du canvas
  private setupResponsive(): void {
    const canvas = this.app.view as HTMLCanvasElement;
    const resize = () => {
      const w = Math.min(window.innerWidth, 500);
      const h = window.innerHeight;
      const scale = Math.min(w / CANVAS.width, h / CANVAS.height);
      canvas.style.width = `${CANVAS.width * scale}px`;
      canvas.style.height = `${CANVAS.height * scale}px`;
    };
    window.addEventListener('resize', resize);
    resize();
  }

  // Crée l'overlay HTML pour les écrans interactifs
  private createOverlay(): void {
    this.overlay = document.getElementById('overlay') as HTMLDivElement;
    if (!this.overlay) {
      this.overlay = document.createElement('div');
      this.overlay.id = 'overlay';
      document.body.appendChild(this.overlay);
    }
  }

  // Affiche/cache l'overlay
  private showOverlay(html: string): void {
    this.overlay.innerHTML = html;
    this.overlay.style.display = 'flex';
    this.overlay.style.background = '';
  }

  private hideOverlay(): void {
    this.overlay.style.display = 'none';
    this.overlay.innerHTML = '';
  }

  // ==========================================
  // ÉCRAN 1 : SPLASH SCREEN
  // ==========================================
  private showSplash(): void {
    this.currentScreen = 'splash';
    console.log('[GameEngine] Écran: Splash');

    // Nettoyer le stage
    this.app.stage.removeChildren();

    this.splashContainer = new PIXI.Container();
    this.app.stage.addChild(this.splashContainer);

    // Fond avec dégradé simulé
    const bg = new PIXI.Graphics();
    bg.beginFill(COLORS.background);
    bg.drawRect(0, 0, CANVAS.width, CANVAS.height);
    bg.endFill();
    this.splashContainer.addChild(bg);

    // Logo "TapTapGO"
    const title = new PIXI.Text('TapTapGO', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: 56,
      fill: [0xFF6B35, 0xF7B801], // Dégradé orange → jaune
      fontWeight: 'bold',
      dropShadow: true,
      dropShadowColor: 0x000000,
      dropShadowDistance: 3,
      dropShadowAngle: Math.PI / 4,
      dropShadowBlur: 4,
    });
    title.anchor.set(0.5);
    title.x = CANVAS.width / 2;
    title.y = CANVAS.height / 2 - 40;
    this.splashContainer.addChild(title);

    // Sous-titre
    const subtitle = new PIXI.Text('Tape plus vite que ton adversaire !', {
      fontFamily: 'Arial, sans-serif',
      fontSize: 16,
      fill: COLORS.text,
      fontWeight: 'normal',
    });
    subtitle.anchor.set(0.5);
    subtitle.x = CANVAS.width / 2;
    subtitle.y = CANVAS.height / 2 + 20;
    this.splashContainer.addChild(subtitle);

    // Animation du logo (pulsation)
    let scale = 1;
    let growing = true;
    const ticker = () => {
      if (growing) {
        scale += 0.005;
        if (scale >= 1.08) growing = false;
      } else {
        scale -= 0.005;
        if (scale <= 1) growing = true;
      }
      title.scale.set(scale);
    };
    this.app.ticker.add(ticker);

    // Indicateur de chargement
    const loading = new PIXI.Text('Chargement...', {
      fontFamily: 'Arial, sans-serif',
      fontSize: 14,
      fill: 0x888888,
    });
    loading.anchor.set(0.5);
    loading.x = CANVAS.width / 2;
    loading.y = CANVAS.height - 80;
    this.splashContainer.addChild(loading);

    // Transition vers l'écran suivant
    setTimeout(() => {
      this.app.ticker.remove(ticker);
      if (this.statsManager.hasPseudo()) {
        this.showMenu();
      } else {
        this.showPseudoScreen();
      }
    }, SPLASH_DURATION);
  }

  // ==========================================
  // ÉCRAN 2 : CRÉATION PSEUDO
  // ==========================================
  private showPseudoScreen(): void {
    this.currentScreen = 'pseudo';
    console.log('[GameEngine] Écran: Pseudo');

    this.app.stage.removeChildren();

    // Fond PixiJS
    const bg = new PIXI.Graphics();
    bg.beginFill(COLORS.background);
    bg.drawRect(0, 0, CANVAS.width, CANVAS.height);
    bg.endFill();
    this.app.stage.addChild(bg);

    // Overlay HTML pour le formulaire
    this.showOverlay(`
      <div class="screen-content">
        <h1 class="title" style="color: ${CSS_COLORS.primary};">TapTapGO</h1>
        <p class="subtitle">Choisis ton pseudo</p>
        <div class="input-group">
          <input type="text" id="pseudo-input" placeholder="Ton pseudo..." maxlength="15" autocomplete="off" />
          <button id="pseudo-btn" class="btn btn-primary">C'est parti !</button>
        </div>
        <p class="hint" id="pseudo-error" style="color: ${CSS_COLORS.error}; display: none;">
          Le pseudo doit faire entre 2 et 15 caractères
        </p>
      </div>
    `);

    // Gestion du bouton (CRITIQUE : doit fonctionner)
    const btn = document.getElementById('pseudo-btn') as HTMLButtonElement;
    const input = document.getElementById('pseudo-input') as HTMLInputElement;
    const error = document.getElementById('pseudo-error') as HTMLParagraphElement;

    if (!btn || !input) {
      console.error('[GameEngine] Éléments pseudo non trouvés !');
      return;
    }

    const validatePseudo = () => {
      const pseudo = input.value.trim();
      console.log('[GameEngine] Tentative validation pseudo:', pseudo);

      if (pseudo.length < 2 || pseudo.length > 15) {
        error.style.display = 'block';
        input.focus();
        return;
      }

      error.style.display = 'none';
      this.statsManager.setPseudo(pseudo);
      this.hideOverlay();
      this.showMenu();
    };

    // Écouter le clic ET la touche Entrée
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      validatePseudo();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        validatePseudo();
      }
    });

    // Focus automatique
    setTimeout(() => input.focus(), 100);
  }

  // ==========================================
  // ÉCRAN 3 : MENU PRINCIPAL
  // ==========================================
  private showMenu(): void {
    this.currentScreen = 'menu';
    console.log('[GameEngine] Écran: Menu');

    this.app.stage.removeChildren();

    const bg = new PIXI.Graphics();
    bg.beginFill(COLORS.background);
    bg.drawRect(0, 0, CANVAS.width, CANVAS.height);
    bg.endFill();
    this.app.stage.addChild(bg);

    const pseudo = this.statsManager.getPseudo();
    const firebaseStatus = this.firebaseService.isConfigured()
      ? '<span style="color: #2ECC71;">En ligne</span>'
      : '<span style="color: #F7B801;">Mode solo (Firebase non configuré)</span>';

    this.showOverlay(`
      <div class="screen-content">
        <h1 class="title" style="color: ${CSS_COLORS.primary};">TapTapGO</h1>
        <p class="welcome">Salut, <strong>${this.escapeHtml(pseudo)}</strong> !</p>
        <p class="status-line">${firebaseStatus}</p>

        <div class="menu-buttons">
          <button id="btn-create" class="btn btn-primary btn-large">
            Créer une partie
          </button>
          <button id="btn-join" class="btn btn-secondary btn-large" ${!this.firebaseService.isConfigured() ? 'disabled style="opacity:0.5"' : ''}>
            Rejoindre une partie
          </button>
          <button id="btn-solo" class="btn btn-accent btn-large">
            Jouer contre le Bot
          </button>
          <button id="btn-stats" class="btn btn-outline btn-large">
            Mes statistiques
          </button>
        </div>
      </div>
    `);

    document.getElementById('btn-create')?.addEventListener('click', () => {
      this.hideOverlay();
      if (this.firebaseService.isConfigured()) {
        this.createRoom();
      } else {
        // Montrer la salle d'attente même sans Firebase (bot rejoindra automatiquement)
        this.showWaitingRoomOffline();
      }
    });

    document.getElementById('btn-join')?.addEventListener('click', () => {
      this.hideOverlay();
      this.showJoinScreen();
    });

    document.getElementById('btn-solo')?.addEventListener('click', () => {
      this.hideOverlay();
      this.startSoloGame();
    });

    document.getElementById('btn-stats')?.addEventListener('click', () => {
      this.hideOverlay();
      this.showLeaderboard();
    });
  }

  // ==========================================
  // ÉCRAN : REJOINDRE UNE PARTIE
  // ==========================================
  private showJoinScreen(): void {
    console.log('[GameEngine] Écran: Rejoindre');

    this.showOverlay(`
      <div class="screen-content">
        <h2 class="title" style="color: ${CSS_COLORS.primary}; font-size: 28px;">Rejoindre</h2>
        <p class="subtitle">Entre le code de la room</p>
        <div class="input-group">
          <input type="text" id="room-code-input" placeholder="Ex: AB12" maxlength="4"
                 style="text-transform: uppercase; text-align: center; font-size: 28px; letter-spacing: 8px;"
                 autocomplete="off" />
          <button id="btn-join-room" class="btn btn-primary">Rejoindre</button>
        </div>
        <p id="join-error" class="hint" style="color: ${CSS_COLORS.error}; display: none;"></p>
        <button id="btn-back-menu" class="btn btn-outline" style="margin-top: 20px;">Retour</button>
      </div>
    `);

    const input = document.getElementById('room-code-input') as HTMLInputElement;
    const errorEl = document.getElementById('join-error') as HTMLParagraphElement;

    document.getElementById('btn-join-room')?.addEventListener('click', async () => {
      const code = input.value.trim().toUpperCase();
      if (code.length !== 4) {
        errorEl.textContent = 'Le code doit faire 4 caractères';
        errorEl.style.display = 'block';
        return;
      }

      errorEl.textContent = 'Connexion en cours...';
      errorEl.style.color = CSS_COLORS.accent;
      errorEl.style.display = 'block';

      const playerId = this.firebaseService.generatePlayerId();
      this.myPlayer = {
        id: playerId,
        pseudo: this.statsManager.getPseudo(),
        position: 0,
        isBot: false,
      };

      const room = await this.firebaseService.joinRoom(code, this.myPlayer);
      if (room) {
        this.roomCode = code;
        this.isHost = false;
        this.isUsingBot = false;

        // Trouver les adversaires
        this.opponents = room.players.filter(p => p.id !== playerId);

        this.hideOverlay();
        if (room.status === 'playing') {
          // Room pleine, on lance directement
          this.startMultiplayerGame(code);
        } else {
          // En attente que l'hôte démarre
          this.showWaitingRoomJoiner(code);
        }
      } else {
        const errorMsg = this.firebaseService.getLastError() || 'Room introuvable ou pleine';
        errorEl.textContent = errorMsg;
        errorEl.style.color = CSS_COLORS.error;
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        document.getElementById('btn-join-room')?.click();
      }
    });

    document.getElementById('btn-back-menu')?.addEventListener('click', () => {
      this.hideOverlay();
      this.showMenu();
    });

    setTimeout(() => input.focus(), 100);
  }

  // ==========================================
  // CRÉATION DE ROOM (multijoueur)
  // ==========================================
  private async createRoom(): Promise<void> {
    const phrases = this.phraseManager.generateGamePhrases();
    const playerId = this.firebaseService.generatePlayerId();

    this.myPlayer = {
      id: playerId,
      pseudo: this.statsManager.getPseudo(),
      position: 0,
      isBot: false,
    };

    this.isHost = true;

    // Afficher un écran de chargement pendant la création
    this.showOverlay(`
      <div class="screen-content">
        <h2 class="title" style="color: ${CSS_COLORS.primary}; font-size: 28px;">Création...</h2>
        <div class="waiting-dots">
          <span class="dot dot-1"></span>
          <span class="dot dot-2"></span>
          <span class="dot dot-3"></span>
        </div>
        <p class="hint">Connexion au serveur...</p>
      </div>
    `);

    const code = await this.firebaseService.createRoom(this.myPlayer, phrases);

    if (code) {
      this.roomCode = code;
      this.hideOverlay();
      this.showWaitingRoom(code);
    } else {
      // Firebase configuré mais erreur → afficher erreur avec options
      console.warn('[GameEngine] Échec création room Firebase');
      this.showCreateRoomError();
    }
  }

  // Affiche une erreur quand la création de room échoue
  private showCreateRoomError(): void {
    this.showOverlay(`
      <div class="screen-content">
        <h2 class="title" style="color: ${CSS_COLORS.error}; font-size: 24px;">Erreur de connexion</h2>
        <p class="subtitle">Impossible de créer la room sur le serveur.</p>
        <p class="hint" style="color: ${CSS_COLORS.accent};">Vérifie ta connexion internet et la configuration Firebase.</p>
        <div class="menu-buttons">
          <button id="btn-retry-create" class="btn btn-primary btn-large">Réessayer</button>
          <button id="btn-solo-fallback" class="btn btn-accent btn-large">Jouer contre le Bot</button>
          <button id="btn-error-back" class="btn btn-outline btn-large">Retour au menu</button>
        </div>
      </div>
    `);

    document.getElementById('btn-retry-create')?.addEventListener('click', () => {
      this.hideOverlay();
      this.createRoom();
    });

    document.getElementById('btn-solo-fallback')?.addEventListener('click', () => {
      this.hideOverlay();
      this.startSoloGame();
    });

    document.getElementById('btn-error-back')?.addEventListener('click', () => {
      this.hideOverlay();
      this.showMenu();
    });
  }

  // ==========================================
  // ÉCRAN 4 : SALLE D'ATTENTE
  // ==========================================
  private showWaitingRoom(code: string): void {
    this.currentScreen = 'waiting';
    console.log(`[GameEngine] Écran: Salle d'attente - Code: ${code}`);

    this.showOverlay(`
      <div class="screen-content">
        <h2 class="title" style="color: ${CSS_COLORS.primary}; font-size: 28px;">En attente...</h2>
        <p class="subtitle">Partage ce code avec ton adversaire</p>
        <div class="room-code">${code}</div>
        <div class="waiting-dots">
          <span class="dot dot-1"></span>
          <span class="dot dot-2"></span>
          <span class="dot dot-3"></span>
        </div>
        <p class="hint" id="waiting-players">Joueurs : 1/${MAX_PLAYERS}</p>
        <p class="hint" id="waiting-hint">Un bot rejoindra automatiquement dans <span id="bot-countdown">30</span>s</p>
        <button id="btn-start-game" class="btn btn-primary btn-large" style="margin-top: 12px; display: none;">D\u00e9marrer la partie</button>
        <button id="btn-cancel-wait" class="btn btn-outline" style="margin-top: 8px;">Annuler</button>
      </div>
    `);

    // Compte à rebours pour le bot
    let countdown = 30;
    const countdownEl = document.getElementById('bot-countdown');
    const countdownInterval = setInterval(() => {
      countdown--;
      if (countdownEl) countdownEl.textContent = String(countdown);
      if (countdown <= 5) this.soundManager.play('tick');
      if (countdown <= 0) clearInterval(countdownInterval);
    }, 1000);

    let gameStarted = false;

    // Écouter l'arrivée des joueurs via Firebase
    this.firebaseService.onRoomChange(code, (room) => {
      if (gameStarted) return;

      // Mettre à jour le compteur de joueurs
      const playerCount = room.players?.length || 1;
      const waitingPlayersEl = document.getElementById('waiting-players');
      if (waitingPlayersEl) waitingPlayersEl.textContent = `Joueurs : ${playerCount}/${MAX_PLAYERS}`;

      // Afficher le bouton "Démarrer" dès 2 joueurs (hôte uniquement)
      const startBtn = document.getElementById('btn-start-game');
      if (startBtn && playerCount >= 2) {
        startBtn.style.display = '';
      }

      // La partie démarre (room pleine ou démarrage manuel par l'hôte)
      if (room.status === 'playing' && room.players && room.players.length >= 2) {
        gameStarted = true;
        clearInterval(countdownInterval);
        if (this.botJoinTimeout) {
          clearTimeout(this.botJoinTimeout);
          this.botJoinTimeout = null;
        }
        this.opponents = room.players.filter(p => p.id !== this.myPlayer?.id);
        this.isUsingBot = false;
        this.hideOverlay();
        this.startMultiplayerGame(code);
      }
    });

    // Bouton "Démarrer la partie" (hôte)
    document.getElementById('btn-start-game')?.addEventListener('click', async () => {
      const btn = document.getElementById('btn-start-game') as HTMLButtonElement;
      if (btn) { btn.disabled = true; btn.textContent = 'Lancement...'; }
      await this.firebaseService.startGame(code);
    });

    // Timer pour le bot (30s)
    this.botJoinTimeout = setTimeout(() => {
      if (gameStarted) return;
      clearInterval(countdownInterval);
      console.log('[GameEngine] Timeout - Bot rejoint la partie');
      this.firebaseService.cleanup();
      this.hideOverlay();
      this.startSoloGame();
    }, BOT_JOIN_DELAY);

    document.getElementById('btn-cancel-wait')?.addEventListener('click', () => {
      clearInterval(countdownInterval);
      if (this.botJoinTimeout) {
        clearTimeout(this.botJoinTimeout);
        this.botJoinTimeout = null;
      }
      this.firebaseService.cleanup();
      this.hideOverlay();
      this.showMenu();
    });
  }

  // ==========================================
  // SALLE D'ATTENTE JOUEUR (non-hôte)
  // ==========================================
  private showWaitingRoomJoiner(code: string): void {
    this.currentScreen = 'waiting';
    console.log(`[GameEngine] Écran: Salle d'attente joueur - Code: ${code}`);

    this.showOverlay(`
      <div class="screen-content">
        <h2 class="title" style="color: ${CSS_COLORS.primary}; font-size: 28px;">Room ${this.escapeHtml(code)}</h2>
        <p class="subtitle">En attente du lancement par l'h&ocirc;te...</p>
        <div class="waiting-dots">
          <span class="dot dot-1"></span>
          <span class="dot dot-2"></span>
          <span class="dot dot-3"></span>
        </div>
        <p class="hint" id="waiting-players-joiner">Joueurs : ${1 + this.opponents.length}/${MAX_PLAYERS}</p>
        <button id="btn-cancel-wait-joiner" class="btn btn-outline" style="margin-top: 20px;">Quitter</button>
      </div>
    `);

    this.firebaseService.onRoomChange(code, (room) => {
      // Mettre à jour le compteur
      const playerCount = room.players?.length || 1;
      const el = document.getElementById('waiting-players-joiner');
      if (el) el.textContent = `Joueurs : ${playerCount}/${MAX_PLAYERS}`;

      // Mettre à jour la liste d'adversaires
      if (room.players) {
        this.opponents = room.players.filter((p: Player) => p.id !== this.myPlayer?.id);
      }

      // L'hôte a lancé la partie
      if (room.status === 'playing' && room.players && room.players.length >= 2) {
        this.hideOverlay();
        this.startMultiplayerGame(code);
      }
    });

    document.getElementById('btn-cancel-wait-joiner')?.addEventListener('click', () => {
      this.firebaseService.cleanup();
      this.hideOverlay();
      this.showMenu();
    });
  }

  // ==========================================
  // SALLE D'ATTENTE HORS LIGNE (sans Firebase)
  // ==========================================
  private showWaitingRoomOffline(): void {
    this.currentScreen = 'waiting';
    console.log('[GameEngine] Écran: Salle d\'attente (offline)');

    this.app.stage.removeChildren();
    const bg = new PIXI.Graphics();
    bg.beginFill(COLORS.background);
    bg.drawRect(0, 0, CANVAS.width, CANVAS.height);
    bg.endFill();
    this.app.stage.addChild(bg);

    this.showOverlay(`
      <div class="screen-content">
        <h2 class="title" style="color: ${CSS_COLORS.primary}; font-size: 28px;">Recherche...</h2>
        <p class="subtitle">Recherche d'un adversaire</p>
        <div class="waiting-dots">
          <span class="dot dot-1"></span>
          <span class="dot dot-2"></span>
          <span class="dot dot-3"></span>
        </div>
        <p class="hint" style="color: ${CSS_COLORS.accent};">Mode hors-ligne : un bot rejoindra dans <span id="bot-countdown-offline">10</span>s</p>
        <p class="hint" style="font-size: 11px; margin-top: 8px;">Pour jouer en multijoueur, configure Firebase dans les paramètres</p>
        <button id="btn-cancel-wait-offline" class="btn btn-outline" style="margin-top: 20px;">Annuler</button>
      </div>
    `);

    let countdown = 10;
    const countdownEl = document.getElementById('bot-countdown-offline');
    const countdownInterval = setInterval(() => {
      countdown--;
      if (countdownEl) countdownEl.textContent = String(countdown);
      if (countdown <= 5) this.soundManager.play('tick');
      if (countdown <= 0) clearInterval(countdownInterval);
    }, 1000);

    this.botJoinTimeout = setTimeout(() => {
      clearInterval(countdownInterval);
      console.log('[GameEngine] Bot rejoint la partie (mode offline)');
      this.hideOverlay();
      this.startSoloGame();
    }, 10000);

    document.getElementById('btn-cancel-wait-offline')?.addEventListener('click', () => {
      clearInterval(countdownInterval);
      if (this.botJoinTimeout) {
        clearTimeout(this.botJoinTimeout);
        this.botJoinTimeout = null;
      }
      this.hideOverlay();
      this.showMenu();
    });
  }

  // ==========================================
  // DÉMARRAGE PARTIE SOLO (avec bot)
  // ==========================================
  private startSoloGame(): void {
    console.log('[GameEngine] Démarrage partie solo avec bot');

    this.isUsingBot = true;
    this.botAI = new BotAI();

    const playerId = this.firebaseService.generatePlayerId();
    this.myPlayer = {
      id: playerId,
      pseudo: this.statsManager.getPseudo(),
      position: 0,
      isBot: false,
    };

    this.opponents = [{
      id: 'bot_' + Date.now(),
      pseudo: this.botAI.getPseudo(),
      position: 0,
      isBot: true,
    }];

    // Générer les phrases
    this.phraseManager.generateGamePhrases();
    this.correctAnswers = 0;
    this.totalAttempts = 0;
    this.gameStartTime = Date.now();

    this.showGameScreen();

    // Démarrer le bot sur la première phrase
    this.startBotForCurrentPhrase();
  }

  // ==========================================
  // DÉMARRAGE PARTIE MULTIJOUEUR
  // ==========================================
  private startMultiplayerGame(code: string): void {
    console.log(`[GameEngine] Démarrage partie multijoueur - Room: ${code}`);

    this.isUsingBot = false;
    this.correctAnswers = 0;
    this.totalAttempts = 0;
    this.gameStartTime = Date.now();

    // Fonction commune pour mettre à jour les positions des adversaires
    const updateOpponents = (room: any) => {
      if (room.players) {
        const otherPlayers = room.players.filter((p: Player) => p.id !== this.myPlayer?.id);
        for (const other of otherPlayers) {
          const existing = this.opponents.find(o => o.id === other.id);
          if (existing) {
            existing.position = other.position;
          } else {
            this.opponents.push(other);
          }
        }
        this.updateTrack();
        this.updateScores();
      }

      // Vérifier si un adversaire a gagné
      if (room.status === 'finished' && room.winner && room.winner !== this.myPlayer?.id) {
        this.endGame(false);
      }
    };

    // Si on est le joueur qui rejoint, récupérer les phrases AVANT d'afficher l'écran
    if (!this.isHost) {
      let phrasesLoaded = false;
      this.firebaseService.onRoomChange(code, (room) => {
        // Synchroniser les phrases une seule fois
        if (room.phrases && !phrasesLoaded) {
          phrasesLoaded = true;
          this.phraseManager.setGamePhrases(room.phrases);
          console.log('[GameEngine] Phrases reçues de Firebase, affichage écran de jeu');
          this.showGameScreen();
        }

        updateOpponents(room);

        // Mettre à jour l'affichage de la phrase si elle a changé (pour le joueur qui rejoint)
        if (phrasesLoaded) {
          const phraseDisplay = document.getElementById('phrase-display');
          const currentPhrase = this.phraseManager.getCurrentPhrase();
          if (phraseDisplay && currentPhrase && !phraseDisplay.textContent) {
            phraseDisplay.textContent = currentPhrase;
          }
        }
      });
    } else {
      // Pour l'hôte, écouter les mises à jour de la room
      this.firebaseService.onRoomChange(code, (room) => {
        updateOpponents(room);
      });

      this.showGameScreen();
    }
  }

  // ==========================================
  // ÉCRAN 5 : JEU
  // ==========================================
  private showGameScreen(): void {
    this.currentScreen = 'game';
    console.log('[GameEngine] Écran: Jeu');

    this.app.stage.removeChildren();

    // Dessiner la piste d'athlétisme
    this.drawTrack();

    // Overlay pour la phrase et l'input
    const currentPhrase = this.phraseManager.getCurrentPhrase();
    const phraseIndex = this.phraseManager.getCurrentIndex();

    const opponentScoresHtml = this.opponents.map((op, i) =>
      `<span class="game-score" id="opponent-score-${i}">${this.escapeHtml(op.pseudo)}: ${op.position || 0}/${PHRASES_TO_WIN}</span>`
    ).join('');

    this.showOverlay(`
      <div class="game-overlay">
        <div class="game-header game-header-multi">
          <span class="game-score game-score-me" id="my-score">${this.myPlayer?.pseudo}: ${this.myPlayer?.position || 0}/${PHRASES_TO_WIN}</span>
          ${opponentScoresHtml}
        </div>
        <div class="phrase-counter">Phrase ${phraseIndex + 1}/${PHRASES_TO_WIN}</div>
        <div class="phrase-display" id="phrase-display">${this.escapeHtml(currentPhrase)}</div>
        <div class="input-area">
          <input type="text" id="game-input" placeholder="Tape la phrase ici..." autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" />
          <button id="btn-submit" class="btn btn-primary">Valider</button>
        </div>
        <div class="feedback" id="game-feedback"></div>
      </div>
    `);

    // Lancer la musique de fond
    this.soundManager.startBgMusic();

    // Rendre l'overlay transparent pendant le jeu pour voir la piste PixiJS
    this.overlay.style.background = 'transparent';

    const input = document.getElementById('game-input') as HTMLInputElement;
    const feedback = document.getElementById('game-feedback') as HTMLDivElement;

    const submitAnswer = () => {
      const answer = input.value;
      this.totalAttempts++;

      if (this.phraseManager.checkAnswer(answer)) {
        // Bonne réponse
        this.correctAnswers++;
        if (this.myPlayer) this.myPlayer.position++;

        // Feedback positif
        this.soundManager.play('correct');
        feedback.textContent = 'Correct !';
        feedback.className = 'feedback feedback-success';

        // Mettre à jour Firebase si multijoueur
        if (!this.isUsingBot && this.myPlayer) {
          this.firebaseService.updatePlayerPosition(this.roomCode, this.myPlayer.id, this.myPlayer.position);
        }

        this.updateTrack();
        this.updateScores();

        // Vérifier victoire
        if (this.myPlayer && this.myPlayer.position >= PHRASES_TO_WIN) {
          this.endGame(true);
          return;
        }

        // Phrase suivante
        this.phraseManager.nextPhrase();
        const nextPhrase = this.phraseManager.getCurrentPhrase();
        const nextIndex = this.phraseManager.getCurrentIndex();

        const phraseDisplay = document.getElementById('phrase-display');
        if (phraseDisplay) phraseDisplay.textContent = nextPhrase;

        const counter = document.querySelector('.phrase-counter');
        if (counter) counter.textContent = `Phrase ${nextIndex + 1}/${PHRASES_TO_WIN}`;

        input.value = '';

        // Relancer le bot sur la nouvelle phrase
        if (this.isUsingBot) {
          this.startBotForCurrentPhrase();
        }
      } else {
        // Mauvaise réponse
        this.soundManager.play('wrong');
        feedback.textContent = 'Incorrect, réessaie !';
        feedback.className = 'feedback feedback-error';
        input.select();
      }

      // Effacer le feedback après un délai
      setTimeout(() => {
        feedback.textContent = '';
        feedback.className = 'feedback';
      }, 1500);
    };

    document.getElementById('btn-submit')?.addEventListener('click', (e) => {
      e.preventDefault();
      submitAnswer();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitAnswer();
      }
    });

    setTimeout(() => input.focus(), 100);
  }

  // Dessine la piste d'athlétisme réaliste
  private drawTrack(): void {
    if (this.trackContainer) {
      this.app.stage.removeChild(this.trackContainer);
    }

    this.trackContainer = new PIXI.Container();
    this.app.stage.addChild(this.trackContainer);

    // Nombre total de couloirs (moi + adversaires)
    const totalLanes = 1 + this.opponents.length;

    // Dimensions de la piste (adaptatives)
    const trackX = 15;
    const trackY = 30;
    const trackWidth = CANVAS.width - 30;
    const laneHeight = totalLanes <= 2 ? 50 : 38;
    const laneGap = 4;
    const headerHeight = 45;
    const lanesBlockHeight = totalLanes * laneHeight + (totalLanes - 1) * laneGap;
    const trackHeight = headerHeight + lanesBlockHeight + 15;
    const cornerRadius = 28;

    // === FOND TERRAIN (vert gazon) ===
    const field = new PIXI.Graphics();
    field.beginFill(0x1B5E20, 0.35);
    field.drawRoundedRect(trackX - 5, trackY - 5, trackWidth + 10, trackHeight + 10, cornerRadius + 5);
    field.endFill();
    this.trackContainer.addChild(field);

    // === SURFACE DE LA PISTE (rouge brique) ===
    const trackSurface = new PIXI.Graphics();
    trackSurface.beginFill(0xD32F2F, 1);
    trackSurface.drawRoundedRect(trackX, trackY, trackWidth, trackHeight, cornerRadius);
    trackSurface.endFill();
    this.trackContainer.addChild(trackSurface);

    // === BORDURE EXTÉRIEURE ===
    const outerBorder = new PIXI.Graphics();
    outerBorder.lineStyle(3, 0xFFFFFF, 0.85);
    outerBorder.drawRoundedRect(trackX + 2, trackY + 2, trackWidth - 4, trackHeight - 4, cornerRadius - 2);
    this.trackContainer.addChild(outerBorder);

    // === ZONE INTÉRIEURE (gazon central) ===
    const innerField = new PIXI.Graphics();
    innerField.beginFill(0x388E3C, 0.5);
    innerField.drawRoundedRect(trackX + 12, trackY + 12, trackWidth - 24, 32, 10);
    innerField.endFill();
    this.trackContainer.addChild(innerField);

    // === TITRE de la piste ===
    const trackTitle = new PIXI.Text('COURSE TapTapGO', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: 13,
      fill: 0xFFFFFF,
      fontWeight: 'bold',
      letterSpacing: 2,
    });
    trackTitle.anchor.set(0.5);
    trackTitle.x = CANVAS.width / 2;
    trackTitle.y = trackY + 28;
    this.trackContainer.addChild(trackTitle);

    // === COULOIRS (lanes) ===
    const firstLaneY = trackY + headerHeight;
    const laneYPositions: number[] = [];
    for (let lane = 0; lane < totalLanes; lane++) {
      const laneY = firstLaneY + lane * (laneHeight + laneGap);
      laneYPositions.push(laneY);
      const laneColor = lane % 2 === 0 ? 0xD32F2F : 0xB71C1C;

      // Fond du couloir
      const laneBg = new PIXI.Graphics();
      laneBg.beginFill(laneColor, 0.9);
      laneBg.drawRoundedRect(trackX + 8, laneY, trackWidth - 16, laneHeight, 8);
      laneBg.endFill();
      this.trackContainer.addChild(laneBg);

      // Bordure blanche du couloir
      const laneBorder = new PIXI.Graphics();
      laneBorder.lineStyle(2, 0xFFFFFF, 0.6);
      laneBorder.drawRoundedRect(trackX + 8, laneY, trackWidth - 16, laneHeight, 8);
      this.trackContainer.addChild(laneBorder);

      // Numéro du couloir
      const laneNum = new PIXI.Text(`${lane + 1}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: totalLanes <= 2 ? 16 : 12,
        fill: 0xFFFFFF,
        fontWeight: 'bold',
      });
      laneNum.anchor.set(0.5);
      laneNum.alpha = 0.7;
      laneNum.x = trackX + 20;
      laneNum.y = laneY + laneHeight / 2;
      this.trackContainer.addChild(laneNum);
    }

    const lastLaneY = laneYPositions[laneYPositions.length - 1];

    // === MARQUAGES DE DISTANCE (lignes verticales) ===
    const runAreaX = trackX + 35;
    const runAreaWidth = trackWidth - 55;

    for (let i = 0; i <= PHRASES_TO_WIN; i++) {
      const x = runAreaX + (runAreaWidth / PHRASES_TO_WIN) * i;
      const isFinish = i === PHRASES_TO_WIN;

      const line = new PIXI.Graphics();
      if (isFinish) {
        line.lineStyle(3, COLORS.accent, 1);
      } else {
        line.lineStyle(1.5, 0xFFFFFF, i === 0 ? 0.9 : 0.5);
      }
      line.moveTo(x, firstLaneY - 2);
      line.lineTo(x, lastLaneY + laneHeight + 2);
      this.trackContainer.addChild(line);

      // Labels de distance (en mètres simulés)
      if (i > 0) {
        const distLabel = new PIXI.Text(isFinish ? '🏁' : `${i * 20}m`, {
          fontFamily: 'Arial, sans-serif',
          fontSize: isFinish ? 14 : 10,
          fill: isFinish ? COLORS.accent : 0xFFFFFF,
          fontWeight: isFinish ? 'bold' : 'normal',
        });
        distLabel.anchor.set(0.5);
        distLabel.alpha = isFinish ? 1 : 0.75;
        distLabel.x = x;
        distLabel.y = firstLaneY - 12;
        this.trackContainer.addChild(distLabel);
      }
    }

    // === LIGNE DE DÉPART ===
    const startLine = new PIXI.Graphics();
    startLine.lineStyle(2, 0xFFFFFF, 0.8);
    startLine.moveTo(runAreaX, firstLaneY - 2);
    startLine.lineTo(runAreaX, lastLaneY + laneHeight + 2);
    this.trackContainer.addChild(startLine);

    const startLabel = new PIXI.Text('START', {
      fontFamily: 'Arial, sans-serif',
      fontSize: 9,
      fill: 0xFFFFFF,
      fontWeight: 'bold',
      letterSpacing: 1,
    });
    startLabel.anchor.set(0.5);
    startLabel.alpha = 0.6;
    startLabel.x = runAreaX;
    startLabel.y = lastLaneY + laneHeight + 14;
    this.trackContainer.addChild(startLabel);

    // === DAMIER D'ARRIVÉE ===
    const finishX = runAreaX + runAreaWidth;
    this.drawCheckerboard(finishX - 4, firstLaneY - 2, 8, lanesBlockHeight + 4);

    const finishLabel = new PIXI.Text('FINISH', {
      fontFamily: 'Arial, sans-serif',
      fontSize: 9,
      fill: COLORS.accent,
      fontWeight: 'bold',
      letterSpacing: 1,
    });
    finishLabel.anchor.set(0.5);
    finishLabel.x = finishX;
    finishLabel.y = lastLaneY + laneHeight + 14;
    this.trackContainer.addChild(finishLabel);

    // === AVATARS DES JOUEURS ===
    // Couloir 1 : mon joueur
    this.drawPlayerOnTrack(
      this.myPlayer?.pseudo || 'Moi',
      this.myPlayer?.position || 0,
      runAreaX,
      laneYPositions[0],
      runAreaWidth,
      laneHeight,
      PLAYER_COLORS[0],
      true,
    );

    // Couloirs suivants : adversaires
    for (let i = 0; i < this.opponents.length; i++) {
      const op = this.opponents[i];
      this.drawPlayerOnTrack(
        op.pseudo || 'Adversaire',
        op.position || 0,
        runAreaX,
        laneYPositions[i + 1],
        runAreaWidth,
        laneHeight,
        op.isBot ? 0x2ECC71 : PLAYER_COLORS[(i + 1) % PLAYER_COLORS.length],
        false,
      );
    }
  }

  // Dessine un motif damier (ligne d'arrivée)
  private drawCheckerboard(x: number, y: number, width: number, height: number): void {
    const cellSize = 6;
    const cols = Math.ceil(width / cellSize);
    const rows = Math.ceil(height / cellSize);
    const checker = new PIXI.Graphics();

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const isBlack = (row + col) % 2 === 0;
        checker.beginFill(isBlack ? 0x000000 : 0xFFFFFF, isBlack ? 0.8 : 0.9);
        checker.drawRect(
          x + col * cellSize,
          y + row * cellSize,
          cellSize,
          cellSize
        );
        checker.endFill();
      }
    }
    this.trackContainer.addChild(checker);
  }

  // Dessine un joueur (avatar coureur) sur la piste
  private drawPlayerOnTrack(
    name: string,
    position: number,
    runAreaX: number,
    laneY: number,
    runAreaWidth: number,
    laneHeight: number,
    color: number,
    isPlayer: boolean,
  ): void {
    const stepWidth = runAreaWidth / PHRASES_TO_WIN;
    const playerX = runAreaX + stepWidth * position + 18;
    const centerY = laneY + laneHeight / 2;

    // Ombre au sol
    const shadow = new PIXI.Graphics();
    shadow.beginFill(0x000000, 0.35);
    shadow.drawEllipse(playerX, centerY + 16, 14, 5);
    shadow.endFill();
    this.trackContainer.addChild(shadow);

    // Corps du coureur (silhouette stylisée)
    const runner = new PIXI.Graphics();

    // Jambes (en mouvement)
    const legAngle = position > 0 ? Math.sin(position * 1.5) * 0.3 : 0;
    runner.lineStyle(4, color, 1);
    // Jambe arrière
    runner.moveTo(playerX, centerY + 4);
    runner.lineTo(playerX - 6 - legAngle * 10, centerY + 16);
    // Jambe avant
    runner.moveTo(playerX, centerY + 4);
    runner.lineTo(playerX + 6 + legAngle * 10, centerY + 16);

    // Bras (en mouvement)
    runner.lineStyle(3, color, 1);
    // Bras arrière
    runner.moveTo(playerX, centerY - 4);
    runner.lineTo(playerX - 7 + legAngle * 8, centerY + 3);
    // Bras avant
    runner.moveTo(playerX, centerY - 4);
    runner.lineTo(playerX + 7 - legAngle * 8, centerY + 3);
    this.trackContainer.addChild(runner);

    // Tête (cercle avec initiale)
    const headRadius = 13;
    const headY = centerY - 14;

    // Contour lumineux autour de la tête (glow plus visible)
    const glow = new PIXI.Graphics();
    glow.beginFill(color, 0.35);
    glow.drawCircle(playerX, headY, headRadius + 6);
    glow.endFill();
    this.trackContainer.addChild(glow);

    // Cercle de la tête
    const head = new PIXI.Graphics();
    head.beginFill(color);
    head.lineStyle(3, 0xFFFFFF, 0.95);
    head.drawCircle(playerX, headY, headRadius);
    head.endFill();
    this.trackContainer.addChild(head);

    // Initiale dans la tête
    const initial = new PIXI.Text(name.charAt(0).toUpperCase(), {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: 15,
      fill: 0xFFFFFF,
      fontWeight: 'bold',
    });
    initial.anchor.set(0.5);
    initial.x = playerX;
    initial.y = headY;
    this.trackContainer.addChild(initial);

    // Nom du joueur (badge sous le coureur)
    const labelBg = new PIXI.Graphics();
    const labelWidth = Math.max(name.length * 7 + 12, 46);
    labelBg.beginFill(color, 0.95);
    labelBg.lineStyle(1, 0xFFFFFF, 0.5);
    labelBg.drawRoundedRect(playerX - labelWidth / 2, centerY + 19, labelWidth, 18, 5);
    labelBg.endFill();
    this.trackContainer.addChild(labelBg);

    const label = new PIXI.Text(name, {
      fontFamily: 'Arial, sans-serif',
      fontSize: 10,
      fill: 0xFFFFFF,
      fontWeight: 'bold',
    });
    label.anchor.set(0.5);
    label.x = playerX;
    label.y = centerY + 28;
    this.trackContainer.addChild(label);

    // Indicateur de position (score)
    if (position > 0) {
      const scoreBadge = new PIXI.Graphics();
      scoreBadge.beginFill(COLORS.accent);
      scoreBadge.drawRoundedRect(playerX + headRadius + 2, headY - 8, 16, 16, 4);
      scoreBadge.endFill();
      this.trackContainer.addChild(scoreBadge);

      const scoreText = new PIXI.Text(`${position}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: 10,
        fill: 0x000000,
        fontWeight: 'bold',
      });
      scoreText.anchor.set(0.5);
      scoreText.x = playerX + headRadius + 10;
      scoreText.y = headY;
      this.trackContainer.addChild(scoreText);
    }
  }

  // Met à jour la piste
  private updateTrack(): void {
    this.drawTrack();
  }

  // Met à jour les scores affichés
  private updateScores(): void {
    const myScore = document.getElementById('my-score');
    if (myScore && this.myPlayer) {
      myScore.textContent = `${this.myPlayer.pseudo}: ${this.myPlayer.position}/${PHRASES_TO_WIN}`;
    }
    for (let i = 0; i < this.opponents.length; i++) {
      const opScore = document.getElementById(`opponent-score-${i}`);
      if (opScore) {
        opScore.textContent = `${this.opponents[i].pseudo}: ${this.opponents[i].position}/${PHRASES_TO_WIN}`;
      }
    }
  }

  // Démarre le bot pour la phrase courante
  private startBotForCurrentPhrase(): void {
    if (!this.botAI || !this.isUsingBot) return;

    const phrase = this.phraseManager.getCurrentPhrase();
    if (!phrase) return;

    const botPlayer = this.opponents[0];
    this.botAI.startTyping(phrase, (correct: boolean) => {
      if (!botPlayer || this.currentScreen !== 'game') return;

      if (correct) {
        botPlayer.position++;
        this.updateTrack();
        this.updateScores();

        // Le bot a gagné ?
        if (botPlayer.position >= PHRASES_TO_WIN) {
          this.endGame(false);
          return;
        }

        // Le bot continue sur la phrase suivante si la partie n'est pas finie
        if (this.currentScreen === 'game') {
          const nextPhrase = this.phraseManager.getGamePhrases()[botPlayer.position];
          if (nextPhrase) {
            this.botAI?.startTyping(nextPhrase, arguments.callee.bind(this) as (correct: boolean) => void);
          }
        }
      }
      // Si incorrect, le bot réessaie (géré dans BotAI.startTyping)
    });
  }

  // ==========================================
  // ÉCRAN 6 : RÉSULTATS
  // ==========================================
  private endGame(won: boolean): void {
    this.currentScreen = 'results';
    const totalTime = Date.now() - this.gameStartTime;
    const accuracy = this.totalAttempts > 0 ? this.correctAnswers / this.totalAttempts : 0;

    console.log(`[GameEngine] Fin de partie - ${won ? 'Victoire' : 'Défaite'}`);

    // Arrêter la musique de fond et jouer le son de fin
    this.soundManager.stopBgMusic();
    this.soundManager.play(won ? 'win' : 'lose');

    // Arrêter le bot
    if (this.botAI) {
      this.botAI.stop();
    }

    // Enregistrer les stats
    this.statsManager.recordGame(won, totalTime, accuracy);

    // Nettoyer Firebase
    if (!this.isUsingBot) {
      this.firebaseService.cleanup();
    }

    const resultEmoji = won ? '&#127942;' : '&#128546;';
    const resultText = won ? 'VICTOIRE !' : 'DÉFAITE...';
    const resultColor = won ? CSS_COLORS.success : CSS_COLORS.error;

    const minutes = Math.floor(totalTime / 60000);
    const seconds = Math.floor((totalTime % 60000) / 1000);
    const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

    this.showOverlay(`
      <div class="screen-content results-screen">
        <div class="result-icon">${resultEmoji}</div>
        <h1 class="result-title" style="color: ${resultColor};">${resultText}</h1>

        <div class="result-stats">
          <div class="stat-row">
            <span class="stat-label">Temps</span>
            <span class="stat-value">${timeStr}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Précision</span>
            <span class="stat-value">${Math.round(accuracy * 100)}%</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Mon score</span>
            <span class="stat-value">${this.myPlayer?.position || 0}/${PHRASES_TO_WIN}</span>
          </div>
          ${this.opponents.map(op => `
          <div class="stat-row">
            <span class="stat-label">${this.escapeHtml(op.pseudo)}</span>
            <span class="stat-value">${op.position || 0}/${PHRASES_TO_WIN}</span>
          </div>`).join('')}
        </div>

        <div class="menu-buttons">
          <button id="btn-replay" class="btn btn-primary btn-large">Rejouer</button>
          <button id="btn-menu-back" class="btn btn-outline btn-large">Menu principal</button>
        </div>
      </div>
    `);

    document.getElementById('btn-replay')?.addEventListener('click', () => {
      this.hideOverlay();
      this.startSoloGame();
    });

    document.getElementById('btn-menu-back')?.addEventListener('click', () => {
      this.hideOverlay();
      this.showMenu();
    });
  }

  // ==========================================
  // ÉCRAN 7 : LEADERBOARD / STATS
  // ==========================================
  private showLeaderboard(): void {
    this.currentScreen = 'leaderboard';
    console.log('[GameEngine] Écran: Leaderboard');

    const stats = this.statsManager.getStats();
    const winRate = this.statsManager.getWinRate();
    const avgAccuracy = this.statsManager.getAverageAccuracy();
    const bestTime = this.statsManager.getFormattedBestTime();

    this.showOverlay(`
      <div class="screen-content">
        <h2 class="title" style="color: ${CSS_COLORS.primary}; font-size: 28px;">Mes Stats</h2>
        <p class="subtitle">${this.escapeHtml(stats.pseudo)}</p>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-card-value">${stats.gamesPlayed}</div>
            <div class="stat-card-label">Parties jouées</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-value">${stats.victories}</div>
            <div class="stat-card-label">Victoires</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-value">${winRate}%</div>
            <div class="stat-card-label">Taux victoire</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-value">${avgAccuracy}%</div>
            <div class="stat-card-label">Précision moy.</div>
          </div>
          <div class="stat-card stat-card-wide">
            <div class="stat-card-value">${bestTime}</div>
            <div class="stat-card-label">Meilleur temps</div>
          </div>
        </div>

        <button id="btn-stats-back" class="btn btn-outline btn-large" style="margin-top: 20px;">Retour au menu</button>
      </div>
    `);

    document.getElementById('btn-stats-back')?.addEventListener('click', () => {
      this.hideOverlay();
      this.showMenu();
    });
  }

  // Utilitaire : échappe le HTML pour éviter l'injection
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
