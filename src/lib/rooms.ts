import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Room, Player, RoomConfig } from "@/game/types";
import { DEFAULT_CONFIG } from "@/game/types";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < 5; i++) code += LETTERS[Math.floor(Math.random() * LETTERS.length)];
  return code;
}

export async function createRoom(hostId: string, nickname: string): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateRoomCode();
    const roomRef = doc(db, "rooms", code);
    const existing = await getDoc(roomRef);
    if (existing.exists()) continue;

    const room = {
      code,
      hostId,
      status: "lobby" as const,
      currentRound: 0,
      currentLetter: null,
      forbiddenLetter: null,
      bonusLetter: null,
      categories: [] as string[],
      multiplierCategoryIndex: null,
      // timer dinámico
      finishTimerEndsAt: null,
      playersFinished: [] as string[],
      stopCalledBy: null,
      // legado
      stopCalledAt: null,
      votingEndsAt: null,
      // rotación categoría custom
      customCategoryTurnOrder: [] as string[],
      customCategoryCurrentIdx: 0,
      // config
      config: DEFAULT_CONFIG,
      createdAt: serverTimestamp(),
    };
    await setDoc(roomRef, room);
    await addPlayer(code, hostId, nickname);
    return code;
  }
  throw new Error("No se pudo generar código único");
}

export async function addPlayer(roomCode: string, playerId: string, nickname: string) {
  const playerRef = doc(db, "rooms", roomCode, "players", playerId);
  const player: Omit<Player, "joinedAt"> & { joinedAt: ReturnType<typeof serverTimestamp> } = {
    nickname,
    score: 0,
    isReady: false,
    joinedAt: serverTimestamp(),
  };
  await setDoc(playerRef, player, { merge: true });
}

export async function joinRoom(code: string, playerId: string, nickname: string): Promise<void> {
  const roomRef = doc(db, "rooms", code);
  const snap = await getDoc(roomRef);
  if (!snap.exists()) throw new Error("Sala no encontrada");
  const room = snap.data() as Room;
  if (room.status !== "lobby") throw new Error("La partida ya empezó");
  await addPlayer(code, playerId, nickname);
}

export async function updateRoomConfig(code: string, config: Partial<RoomConfig>) {
  const roomRef = doc(db, "rooms", code);
  const updates: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(config)) {
    updates[`config.${k}`] = v;
  }
  const { updateDoc } = await import("firebase/firestore");
  await updateDoc(roomRef, updates);
}
