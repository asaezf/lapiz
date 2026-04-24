import {
  doc, setDoc, updateDoc, serverTimestamp, collection, getDocs,
  writeBatch, increment, Timestamp, runTransaction,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Room, Round, AnswerEntry, RoomConfig, Player } from "@/game/types";
import { generateRoundLetters, pickMultiplierIndex, pickRoundCategories } from "@/game/letters";
import { calculateScores, type RawAnswer } from "@/game/scoring";

export const FINISH_TIMER_SECONDS = 20;
export const FINISH_TIMER_SUBTRACT = 4;
export const FINISH_TIMER_MIN = 3;
export const VOTING_SECONDS = 90;

function roomRef(code: string) { return doc(db, "rooms", code); }
function roundRef(code: string, idx: number) {
  return doc(db, "rooms", code, "rounds", `round_${idx}`);
}

/** Host abre la fase de setup_custom. Calcula el turnOrder si es la primera vez. */
export async function openCustomSetup(code: string, players: Array<Player & { id: string }>) {
  const rRef = roomRef(code);
  const sorted = [...players].sort((a, b) => {
    const aMs = a.joinedAt?.toMillis?.() ?? 0;
    const bMs = b.joinedAt?.toMillis?.() ?? 0;
    return aMs - bMs;
  });
  const turnOrder = sorted.map((p) => p.id);

  await updateDoc(rRef, {
    status: "setup_custom",
    customCategoryTurnOrder: turnOrder,
    customCategoryCurrentIdx: 0,
  });
}

export async function startRound(code: string, roundIdx: number, customCategory: string, config: RoomConfig) {
  const categories = pickRoundCategories(customCategory, config.categoriesPerRound);
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

// Jugador pulsa "¡Hecho!" — transaction para evitar race conditions en el timer.
export async function playerDone(code: string, playerId: string, _totalPlayers: number) {
  const rRef = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(rRef);
    const data = snap.data() as Room;
    if (data.status !== "playing") return;
    const finished: string[] = data.playersFinished || [];
    if (finished.includes(playerId)) return;

    const newFinished = [...finished, playerId];
    let endsAt: Timestamp;
    if (finished.length === 0) {
      endsAt = Timestamp.fromMillis(Date.now() + FINISH_TIMER_SECONDS * 1000);
    } else {
      const current = (data.finishTimerEndsAt as Timestamp).toMillis();
      endsAt = Timestamp.fromMillis(Math.max(current - FINISH_TIMER_SUBTRACT * 1000, Date.now() + FINISH_TIMER_MIN * 1000));
    }
    tx.update(rRef, {
      playersFinished: newFinished,
      finishTimerEndsAt: endsAt,
      ...(finished.length === 0 ? { stopCalledBy: playerId } : {}),
    });
  });
}

export async function moveToVoting(code: string, roundIdx: number) {
  const endsAt = Timestamp.fromMillis(Date.now() + VOTING_SECONDS * 1000);
  await updateDoc(roomRef(code), { status: "voting", votingEndsAt: endsAt });
  await updateDoc(roundRef(code, roundIdx), { stoppedBy: "" });
}

export async function toggleVote(
  code: string, roundIdx: number, authorId: string, categoryIndex: number,
  voterId: string, currentFor: string[], currentAgainst: string[], voteType: "for" | "against"
) {
  const ref = doc(db, "rooms", code, "rounds", `round_${roundIdx}`, "answers", authorId);
  // Quitar de ambas listas primero, luego toggle en la elegida
  let newFor = currentFor.filter((v) => v !== voterId);
  let newAgainst = currentAgainst.filter((v) => v !== voterId);
  if (voteType === "for" && !currentFor.includes(voterId)) {
    newFor = [...newFor, voterId];
  } else if (voteType === "against" && !currentAgainst.includes(voterId)) {
    newAgainst = [...newAgainst, voterId];
  }
  await setDoc(ref, { words: { [categoryIndex]: { votesFor: newFor, votesAgainst: newAgainst } } }, { merge: true });
}

export async function applyScores(code: string, roundIdx: number, room: Room, playerIds: string[]) {
  const answersSnap = await getDocs(collection(db, "rooms", code, "rounds", `round_${roundIdx}`, "answers"));
  const rawAnswers: Record<string, Record<number, RawAnswer>> = {};
  for (const pid of playerIds) rawAnswers[pid] = {};
  answersSnap.forEach((d) => {
    const data = d.data() as { words?: Record<number, AnswerEntry> };
    const obj: Record<number, RawAnswer> = {};
    for (const [k, v] of Object.entries(data.words || {})) {
      obj[Number(k)] = { word: v.word || "", votesFor: v.votesFor || [], votesAgainst: v.votesAgainst || [] };
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

  const batch = writeBatch(db);
  for (const pid of playerIds) {
    const answerRef = doc(db, "rooms", code, "rounds", `round_${roundIdx}`, "answers", pid);
    const words: Record<string, Partial<AnswerEntry>> = {};
    for (const [ci, scored] of Object.entries(result.perAnswer[pid] || {})) {
      words[ci] = { isValid: scored.isValid, points: scored.points };
    }
    batch.set(answerRef, { words }, { merge: true });
    const delta = result.scoreDelta[pid] || 0;
    if (delta > 0) batch.update(doc(db, "rooms", code, "players", pid), { score: increment(delta) });
  }
  batch.update(roundRef(code, roundIdx), { scoresApplied: true });

  // ¿Fin de partida? currentRound es 0-indexed, totalRounds es el total (e.g. 5)
  const isLastRound = room.currentRound >= (room.config?.totalRounds ?? 5) - 1;
  batch.update(roomRef(code), { status: isLastRound ? "finished" : "scoreboard" });
  await batch.commit();
}

export async function nextRound(code: string) {
  await updateDoc(roomRef(code), {
    status: "setup_custom",
    customCategoryCurrentIdx: increment(1),
  });
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
  });
  // Reset all player scores
}
