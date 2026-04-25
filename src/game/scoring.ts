import type { RoomConfig } from "./types";

export function normalize(w: string): string {
  return w.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export interface RawAnswer {
  word: string;
  votesAgainst: string[];
}

export interface ScoredAnswer {
  isValid: boolean;
  points: number;
}

export interface ScoringInput {
  letter: string;
  forbiddenLetter: string;
  bonusLetter: string;
  multiplierCategoryIndex: number;
  totalCategories: number;
  playerIds: string[];
  config: RoomConfig;
  answers: Record<string, Record<number, RawAnswer>>;
}

export interface ScoringResult {
  perAnswer: Record<string, Record<number, ScoredAnswer>>;
  scoreDelta: Record<string, number>;
}

export function calculateScores(input: ScoringInput): ScoringResult {
  const { letter, forbiddenLetter, bonusLetter, multiplierCategoryIndex, totalCategories, playerIds, answers, config } = input;
  const nLetter = normalize(letter);
  const nForbidden = config.forbiddenLetterEnabled ? normalize(forbiddenLetter) : "";
  const nBonus = config.bonusLetterEnabled ? normalize(bonusLetter) : "";

  const perAnswer: Record<string, Record<number, ScoredAnswer>> = {};
  const scoreDelta: Record<string, number> = {};
  playerIds.forEach((p) => { perAnswer[p] = {}; scoreDelta[p] = 0; });

  for (let cat = 0; cat < totalCategories; cat++) {
    const validByPlayer: Record<string, string> = {};

    for (const pid of playerIds) {
      const a = answers[pid]?.[cat];
      if (!a?.word?.trim()) { perAnswer[pid][cat] = { isValid: false, points: 0 }; continue; }
      const nw = normalize(a.word);
      if (!nw.startsWith(nLetter)) { perAnswer[pid][cat] = { isValid: false, points: 0 }; continue; }
      if (nForbidden && nw.includes(nForbidden)) { perAnswer[pid][cat] = { isValid: false, points: 0 }; continue; }
      // Inválida si MAYORÍA de votantes elegibles (todos menos el autor) vota 👎.
      // eligibleVoters = jugadores totales - 1 (el autor).
      const against = new Set(a.votesAgainst || []).size;
      const eligibleVoters = playerIds.length - 1;
      if (eligibleVoters > 0 && against > eligibleVoters / 2) {
        perAnswer[pid][cat] = { isValid: false, points: 0 }; continue;
      }
      validByPlayer[pid] = nw;
    }

    const counts: Record<string, number> = {};
    for (const w of Object.values(validByPlayer)) counts[w] = (counts[w] || 0) + 1;
    let maxLen = 0;
    for (const w of Object.values(validByPlayer)) if (w.length > maxLen) maxLen = w.length;

    for (const pid of playerIds) {
      const nw = validByPlayer[pid];
      if (!nw) continue;
      // Base: 2 si única, 1 si repetida (entre las válidas)
      let pts = counts[nw] > 1 ? 1 : 2;
      // +1 si contiene la letra bonus (configurable)
      if (nBonus && nw.includes(nBonus)) pts += 1;
      // +1 si es la palabra válida más larga de la categoría (configurable)
      if (config.longestWordBonusEnabled && nw.length === maxLen && maxLen > 0) pts += 1;
      // ×2 si esta categoría es la multiplicadora (configurable)
      if (config.multiplierEnabled && cat === multiplierCategoryIndex) pts *= 2;
      perAnswer[pid][cat] = { isValid: true, points: pts };
      scoreDelta[pid] += pts;
    }
  }

  return { perAnswer, scoreDelta };
}
