// Service de connexion Firebase pour le multijoueur temps réel

import { FIREBASE_CONFIG, ROOM_CODE_LENGTH } from '../config/constants.js';
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
      console.warn('[FirebaseService] Firebase non initialisé');
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

      this.roomRef = ref(this.db, `rooms/${roomId}`);
      await set(this.roomRef, { ...room, phrases });
      console.log(`[FirebaseService] Room créée: ${code}`);
      return code;
    } catch (e) {
      console.error('[FirebaseService] Erreur création room:', e);
      return null;
    }
  }

  // Rejoint une room existante
  async joinRoom(code: string, player: Player): Promise<Room | null> {
    if (!this.initialized || !this.db) {
      console.warn('[FirebaseService] Firebase non initialisé');
      return null;
    }

    try {
      const { ref, get, update } = await import('firebase/database');
      const roomId = code.toLowerCase();
      this.roomRef = ref(this.db, `rooms/${roomId}`);

      const snapshot = await get(this.roomRef);
      if (!snapshot.exists()) {
        console.warn(`[FirebaseService] Room ${code} introuvable`);
        return null;
      }

      const roomData = snapshot.val();
      if (roomData.status !== 'waiting') {
        console.warn(`[FirebaseService] Room ${code} n'est plus en attente`);
        return null;
      }

      if (roomData.players && roomData.players.length >= 2) {
        console.warn(`[FirebaseService] Room ${code} est pleine`);
        return null;
      }

      // Ajouter le joueur
      const players = [...(roomData.players || []), player];
      await update(this.roomRef, {
        players,
        status: 'playing',
      });

      console.log(`[FirebaseService] Rejoint room ${code}`);
      return {
        ...roomData,
        players,
        status: 'playing' as RoomStatus,
      };
    } catch (e) {
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
      if (position >= 5) {
        updates.status = 'finished';
        updates.winner = playerId;
      }

      await update(roomRef, updates);
    } catch (e) {
      console.error('[FirebaseService] Erreur update position:', e);
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
