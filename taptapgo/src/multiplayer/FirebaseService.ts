// Service de connexion Firebase pour le multijoueur temps réel

import { FIREBASE_CONFIG, ROOM_CODE_LENGTH, MAX_PLAYERS, PHRASES_TO_WIN } from '../config/constants.js';
import { Room, Player, RoomStatus } from '../types/index.js';

// Types Firebase (pour éviter l'import si non configuré)
type FirebaseApp = ReturnType<typeof import('firebase/app').initializeApp> | null;
type FirebaseDb = ReturnType<typeof import('firebase/database').getDatabase> | null;

export class FirebaseService {
  private app: FirebaseApp = null;
  private db: FirebaseDb = null;
  private initialized: boolean = false;
  private roomRef: any = null;
  private unsubscribers: Array<() => void> = [];

  constructor() {
    console.log('[FirebaseService] Service créé');
  }

  // Vérifie si Firebase est configuré
  isConfigured(): boolean {
    return FIREBASE_CONFIG.apiKey !== '' && FIREBASE_CONFIG.databaseURL !== '';
  }

  // Initialise Firebase
  async init(): Promise<boolean> {
    if (!this.isConfigured()) {
      console.warn('[FirebaseService] Firebase non configuré - mode solo uniquement');
      return false;
    }

    try {
      const { initializeApp } = await import('firebase/app');
      const { getDatabase } = await import('firebase/database');

      this.app = initializeApp(FIREBASE_CONFIG);
      this.db = getDatabase(this.app);
      this.initialized = true;
      console.log('[FirebaseService] Firebase initialisé avec succès');
      return true;
    } catch (e) {
      console.error('[FirebaseService] Erreur initialisation Firebase:', e);
      return false;
    }
  }

  // Génère un code de room aléatoire (format AB12)
  generateRoomCode(): string {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Sans I et O pour éviter la confusion
    const digits = '0123456789';
    let code = '';
    // 2 lettres + 2 chiffres
    for (let i = 0; i < 2; i++) {
      code += letters[Math.floor(Math.random() * letters.length)];
    }
    for (let i = 0; i < 2; i++) {
      code += digits[Math.floor(Math.random() * digits.length)];
    }
    return code;
  }

  // Génère un ID unique pour le joueur
  generatePlayerId(): string {
    return 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
  }

  // Crée une nouvelle room
  async createRoom(player: Player, phrases: string[]): Promise<string | null> {
    if (!this.initialized || !this.db) {
      console.warn('[FirebaseService] Firebase non initialisé - impossible de créer une room');
      console.warn('[FirebaseService] initialized:', this.initialized, 'db:', !!this.db);
      return null;
    }

    try {
      const { ref, set } = await import('firebase/database');
      const code = this.generateRoomCode();
      const roomId = code.toLowerCase();

      const room: Room = {
        code,
        players: [player],
        currentPhrase: phrases[0],
        phraseIndex: 0,
        status: 'waiting',
        createdAt: Date.now(),
      };

      console.log(`[FirebaseService] Tentative création room: ${code} (id: ${roomId})`);
      this.roomRef = ref(this.db, `rooms/${roomId}`);
      await set(this.roomRef, { ...room, phrases });
      console.log(`[FirebaseService] Room créée avec succès: ${code}`);
      return code;
    } catch (e: any) {
      console.error('[FirebaseService] Erreur création room:', e);
      console.error('[FirebaseService] Code erreur:', e?.code || 'inconnu');
      console.error('[FirebaseService] Message:', e?.message || 'pas de message');
      return null;
    }
  }

  // Retourne le dernier message d'erreur
  getLastError(): string {
    return this.lastError;
  }
  private lastError: string = '';

  // Rejoint une room existante
  async joinRoom(code: string, player: Player): Promise<Room | null> {
    this.lastError = '';

    if (!this.initialized || !this.db) {
      this.lastError = 'Firebase non initialisé. Vérifie ta configuration.';
      console.warn('[FirebaseService] Firebase non initialisé');
      return null;
    }

    try {
      const { ref, get, update } = await import('firebase/database');
      const roomId = code.toLowerCase();
      console.log(`[FirebaseService] Recherche room: ${code} (id: ${roomId})`);
      this.roomRef = ref(this.db, `rooms/${roomId}`);

      const snapshot = await get(this.roomRef);
      if (!snapshot.exists()) {
        this.lastError = `Room "${code}" introuvable. Vérifie le code.`;
        console.warn(`[FirebaseService] Room ${code} introuvable dans la base`);
        return null;
      }

      const roomData = snapshot.val();
      console.log(`[FirebaseService] Room trouvée - status: ${roomData.status}, players: ${roomData.players?.length || 0}`);

      if (roomData.status !== 'waiting') {
        this.lastError = `La partie "${code}" a déjà commencé.`;
        console.warn(`[FirebaseService] Room ${code} n'est plus en attente (status: ${roomData.status})`);
        return null;
      }

      if (roomData.players && roomData.players.length >= MAX_PLAYERS) {
        this.lastError = `La room "${code}" est pleine (${MAX_PLAYERS}/${MAX_PLAYERS} joueurs).`;
        console.warn(`[FirebaseService] Room ${code} est pleine`);
        return null;
      }

      // Ajouter le joueur
      const players = [...(roomData.players || []), player];
      const isFull = players.length >= MAX_PLAYERS;
      await update(this.roomRef, {
        players,
        status: isFull ? 'playing' : 'waiting',
      });

      console.log(`[FirebaseService] Rejoint room ${code} avec succès`);
      return {
        ...roomData,
        players,
        status: (isFull ? 'playing' : 'waiting') as RoomStatus,
      };
    } catch (e: any) {
      this.lastError = `Erreur réseau: ${e?.message || 'connexion impossible'}`;
      console.error('[FirebaseService] Erreur join room:', e);
      return null;
    }
  }

  // Écoute les changements de la room
  async onRoomChange(code: string, callback: (room: Room & { phrases?: string[] }) => void): Promise<void> {
    if (!this.initialized || !this.db) return;

    try {
      const { ref, onValue } = await import('firebase/database');
      const roomId = code.toLowerCase();
      const roomRef = ref(this.db, `rooms/${roomId}`);

      const unsub = onValue(roomRef, (snapshot) => {
        if (snapshot.exists()) {
          callback(snapshot.val());
        }
      });

      this.unsubscribers.push(unsub);
    } catch (e) {
      console.error('[FirebaseService] Erreur écoute room:', e);
    }
  }

  // Met à jour la position d'un joueur
  async updatePlayerPosition(code: string, playerId: string, position: number): Promise<void> {
    if (!this.initialized || !this.db) return;

    try {
      const { ref, get, update } = await import('firebase/database');
      const roomId = code.toLowerCase();
      const roomRef = ref(this.db, `rooms/${roomId}`);

      const snapshot = await get(roomRef);
      if (!snapshot.exists()) return;

      const roomData = snapshot.val();
      const players = roomData.players.map((p: Player) =>
        p.id === playerId ? { ...p, position } : p
      );

      const updates: Record<string, any> = { players };

      // Vérifier victoire
      if (position >= PHRASES_TO_WIN) {
        updates.status = 'finished';
        updates.winner = playerId;
      }

      await update(roomRef, updates);
    } catch (e) {
      console.error('[FirebaseService] Erreur update position:', e);
    }
  }

  // Démarre la partie (host uniquement, minimum 2 joueurs)
  async startGame(code: string): Promise<boolean> {
    if (!this.initialized || !this.db) return false;

    try {
      const { ref, get, update } = await import('firebase/database');
      const roomId = code.toLowerCase();
      const roomRef = ref(this.db, `rooms/${roomId}`);

      const snapshot = await get(roomRef);
      if (!snapshot.exists()) return false;

      const roomData = snapshot.val();
      if (roomData.players && roomData.players.length >= 2) {
        await update(roomRef, { status: 'playing' });
        return true;
      }
      return false;
    } catch (e) {
      console.error('[FirebaseService] Erreur démarrage partie:', e);
      return false;
    }
  }

  // Met à jour le status de la room
  async updateRoomStatus(code: string, status: RoomStatus): Promise<void> {
    if (!this.initialized || !this.db) return;

    try {
      const { ref, update } = await import('firebase/database');
      const roomId = code.toLowerCase();
      await update(ref(this.db, `rooms/${roomId}`), { status });
    } catch (e) {
      console.error('[FirebaseService] Erreur update status:', e);
    }
  }

  // Nettoie les listeners
  cleanup(): void {
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
    this.roomRef = null;
    console.log('[FirebaseService] Listeners nettoyés');
  }
}
