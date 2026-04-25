import type { Timestamp } from "firebase/firestore";

export type RoomStatus =
  | "lobby"
  | "setup_custom"
  | "playing"
  | "voting"
  | "scoreboard"
  | "finished";

export type GameMode = "dynamic" | "classic";

export interface RoomConfig {
  forbiddenLetterEnabled: boolean;
  bonusLetterEnabled: boolean;
  multiplierEnabled: boolean;
  longestWordBonusEnabled: boolean;
  customCategoryEnabled: boolean;
  totalRounds: number;        // 3-10
  categoriesPerRound: number; // 5 a (banco + 1 si custom)
  gameMode: GameMode;
}

export const DEFAULT_CONFIG: RoomConfig = {
  forbiddenLetterEnabled: true,
  bonusLetterEnabled: true,
  multiplierEnabled: true,
  longestWordBonusEnabled: true,
  customCategoryEnabled: true,
  totalRounds: 5,
  categoriesPerRound: 5,
  gameMode: "dynamic",
};

export interface Room {
  code: string;
  hostId: string;
  status: RoomStatus;
  currentRound: number;
  currentLetter: string | null;
  forbiddenLetter: string | null;
  bonusLetter: string | null;
  categories: string[];
  multiplierCategoryIndex: number | null;
  // timer dinámico
  finishTimerEndsAt: Timestamp | null;
  playersFinished: string[];
  stopCalledBy: string | null;        // primer jugador en acabar (confeti)
  // legado (no se usa activo pero se mantiene para compat)
  stopCalledAt: Timestamp | null;
  votingEndsAt: Timestamp | null;
  // rotación categoría custom
  customCategoryTurnOrder: string[];  // uids en orden joinedAt
  customCategoryCurrentIdx: number;
  // config
  config: RoomConfig;
  createdAt: Timestamp;
}

export interface Player {
  nickname: string;
  score: number;
  isReady: boolean;
  joinedAt: Timestamp;
}

export interface AnswerEntry {
  word: string;
  votesFor?: string[]; // legado, ya no se usa
  votesAgainst: string[];
  isValid: boolean;
  points: number;
}

export interface PlayerAnswers {
  words: Record<number, AnswerEntry>;
}

export interface Round {
  letter: string;
  forbiddenLetter: string;
  bonusLetter: string;
  categories: string[];
  multiplierCategoryIndex: number;
  stoppedBy: string;
  startedAt: Timestamp;
  scoresApplied: boolean;
}
