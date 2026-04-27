import {
  doc, setDoc, updateDoc, serverTimestamp, collection, getDocs,
  writeBatch, increment, Timestamp, runTransaction,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Room, Round, AnswerEntry, RoomConfig, Player } from "@/game/types";
import { generateRoundLetters, pickMultiplierIndex, pickRoundCategories, STANDARD_CATEGORIES } from "@/game/letters";
import { calculateScores, type RawAnswer } from "@/game/scoring";

export const FINISH_TIMER_SECONDS = 20;
export const FINISH_TIMER_SUBTRACT = 4;
export const FINISH_TIMER_MIN = 3;

function roomRef(code: string) { return doc(db, "rooms", code); }
function roundRef(code: string, idx: number) {
  return doc(db, "rooms", code, "rounds", `round_${idx}`);
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Host pulsa "Empezar partida". Elige un jugador aleatorio para proponer
 * la categoría y decide:
 *  - Si hay categoría inventada → status "setup_custom".
 *  - Si no → arranca la ronda 1 directamente (status "playing").
 */
export async function startGame(
  code: string,
  players: Array<Player & { id: string }>,
  config: RoomConfig
) {
  const rRef = roomRef(code);
  const playerIds = players.map((p) => p.id);
  const randomPlayer = pickRandom(playerIds);

  await updateDoc(rRef, {
    customCategoryTurnOrder: playerIds,
    customCategoryCurrentIdx: 0,
    customCategoryCurrentPlayer: randomPlayer,
  });

  if (config.customCategoryEnabled) {
    // Establecemos currentRound:1 para que el header muestre "1/N" durante setup
    await updateDoc(rRef, { status: "setup_custom", currentRound: 1 });
  } else {
    await startRound(code, 1, "", config);
  }
}

/** @deprecated usa `startGame`. Mantenido por compat. */
export async function openCustomSetup(code: string, players: Array<Player & { id: string }>) {
  return startGame(code, players, { ...({} as RoomConfig), customCategoryEnabled: true } as RoomConfig);
}

export async function startRound(code: string, roundIdx: number, customCategory: string, config: RoomConfig) {
  const maxAllowed = STANDARD_CATEGORIES.length + (config.customCategoryEnabled ? 1 : 0);
  const total = Math.max(5, Math.min(config.categoriesPerRound ?? 5, maxAllowed));
  const customForPick = config.customCategoryEnabled ? customCategory : "";
  const categories = pickRoundCategories(customForPick, total);
  const { letter, forbiddenLetter, bonusLetter } = generateRoundLetters(config);
  const multiplierCategoryIndex = config.multiplierEnabled ? pickMultiplierIndex(categories.length) : -1;

  const round: Omit<Round, "startedAt"> & { startedAt: ReturnType<typeof serverTimestamp> } = {
    letter, forbiddenLetter, bonusLetter, categories, multiplierCategoryIndex,
    stoppedBy: "", startedAt: serverTimestamp(), scoresApplied: false,
  };
  await setDoc(roundRef(code, roundIdx), round);
  await updateDoc(roomRef(code), {
    status: "playing",
    currentRound: roundIdx,
    currentLetter: letter,
    forbiddenLetter,
    bonusLetter,
    categories,
    multiplierCategoryIndex,
    finishTimerEndsAt: null,
    playersFinished: [],
    stopCalledBy: null,
    stopCalledAt: null,
    votingEndsAt: null,
  });
}

export async function saveAnswer(code: string, roundIdx: number, playerId: string, categoryIndex: number, word: string) {
  const ref = doc(db, "rooms", code, "rounds", `round_${roundIdx}`, "answers", playerId);
  const entry: AnswerEntry = { word, votesFor: [], votesAgainst: [], isValid: false, points: 0 };
  await setDoc(ref, { words: { [categoryIndex]: entry } }, { merge: true });
}

export async function playerDone(code: string, playerId: string, _totalPlayers: number) {
  const rRef = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(rRef);
    const data = snap.data() as Room;
    if (data.status !== "playing") return;
    const finished: string[] = data.playersFinished || [];
    if (finished.includes(playerId)) return;

    const newFinished = [...finished, playerId];
    const mode = data.config?.gameMode ?? "dynamic";

    const update: Record<string, unknown> = { playersFinished: newFinished };
    if (finished.length === 0) update.stopCalledBy = playerId;

    if (mode === "dynamic") {
      let endsAt: Timestamp;
      if (finished.length === 0) {
        endsAt = Timestamp.fromMillis(Date.now() + FINISH_TIMER_SECONDS * 1000);
      } else {
        const current = (data.finishTimerEndsAt as Timestamp).toMillis();
        endsAt = Timestamp.fromMillis(Math.max(current - FINISH_TIMER_SUBTRACT * 1000, Date.now() + FINISH_TIMER_MIN * 1000));
      }
      update.finishTimerEndsAt = endsAt;
    }
    tx.update(rRef, update);
  });
}

export async function moveToVoting(code: string, roundIdx: number) {
  await updateDoc(roomRef(code), { status: "voting", votingEndsAt: null });
  await updateDoc(roundRef(code, roundIdx), { stoppedBy: "" });
}

export async function toggleVote(
  code: string, roundIdx: number, authorId: string, categoryIndex: number,
  voterId: string, currentAgainst: string[]
) {
  const ref = doc(db, "rooms", code, "rounds", `round_${roundIdx}`, "answers", authorId);
  const has = currentAgainst.includes(voterId);
  const next = has ? currentAgainst.filter((v) => v !== voterId) : [...currentAgainst, voterId];
  await setDoc(ref, { words: { [categoryIndex]: { votesAgainst: next } } }, { merge: true });
}

export async function applyScores(code: string, roundIdx: number, room: Room, playerIds: string[]) {
  const answersSnap = await getDocs(collection(db, "rooms", code, "rounds", `round_${roundIdx}`, "answers"));
  const rawAnswers: Record<string, Record<number, RawAnswer>> = {};
  for (const pid of playerIds) rawAnswers[pid] = {};
  answersSnap.forEach((d) => {
    const data = d.data() as { words?: Record<number, AnswerEntry> };
    const obj: Record<number, RawAnswer> = {};
    for (const [k, v] of Object.entries(data.words || {})) {
      obj[Number(k)] = { word: v.word || "", votesAgainst: v.votesAgainst || [] };
    }
    rawAnswers[d.id] = obj;
  });

  const result = calculateScores({
    letter: room.currentLetter || "",
    forbiddenLetter: room.forbiddenLetter || "",
    bonusLetter: room.bonusLetter || "",
    multiplierCategoryIndex: room.multiplierCategoryIndex ?? 0,
    totalCategories: room.categories.length,
    playerIds,
    config: room.config,
    answers: rawAnswers,
  });

  // Bonus por orden de finalización (modo dinámico): +2 al 1º, +1 al 2º.
  const finishBonus: Record<string, number> = {};
  const mode = room.config?.gameMode ?? "dynamic";
  if (mode === "dynamic") {
    const finished = room.playersFinished || [];
    if (finished[0]) finishBonus[finished[0]] = 2;
    if (finished[1]) finishBonus[finished[1]] = (finishBonus[finished[1]] || 0) + 1;
  }

  const batch = writeBatch(db);
  for (const pid of playerIds) {
    const answerRef = doc(db, "rooms", code, "rounds", `round_${roundIdx}`, "answers", pid);
    const words: Record<string, Partial<AnswerEntry>> = {};
    for (const [ci, scored] of Object.entries(result.perAnswer[pid] || {})) {
      words[ci] = { isValid: scored.isValid, points: scored.points };
    }
    batch.set(answerRef, { words }, { merge: true });
    const delta = (result.scoreDelta[pid] || 0) + (finishBonus[pid] || 0);
    if (delta > 0) batch.update(doc(db, "rooms", code, "players", pid), { score: increment(delta) });
  }
  if (Object.keys(finishBonus).length > 0) {
    batch.update(roundRef(code, roundIdx), { finishBonus });
  }
  batch.update(roundRef(code, roundIdx), { scoresApplied: true });

  // Fin de partida: currentRound (1-indexed) >= totalRounds
  const isLastRound = room.currentRound >= (room.config?.totalRounds ?? 5);
  batch.update(roomRef(code), { status: isLastRound ? "finished" : "scoreboard" });
  await batch.commit();
}

/**
 * Avanza a la siguiente ronda con un proposer aleatorio para categoría custom.
 * playerIds: lista de todos los UIDs de la sala.
 */
export async function nextRound(
  code: string,
  config: RoomConfig,
  nextRoundIdx: number,
  playerIds: string[]
) {
  const randomPlayer = pickRandom(playerIds);
  await updateDoc(roomRef(code), {
    customCategoryCurrentIdx: increment(1),
    customCategoryCurrentPlayer: randomPlayer,
  });
  if (config.customCategoryEnabled) {
    await updateDoc(roomRef(code), { status: "setup_custom", currentRound: nextRoundIdx });
  } else {
    await startRound(code, nextRoundIdx, "", config);
  }
}

export async function restartGame(code: string) {
  await updateDoc(roomRef(code), {
    status: "lobby",
    currentRound: 0,
    currentLetter: null,
    forbiddenLetter: null,
    bonusLetter: null,
    categories: [],
    multiplierCategoryIndex: null,
    finishTimerEndsAt: null,
    playersFinished: [],
    stopCalledBy: null,
    stopCalledAt: null,
    votingEndsAt: null,
    customCategoryCurrentIdx: 0,
    customCategoryCurrentPlayer: null,
  });
}
