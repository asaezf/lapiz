import type { RoomConfig } from "./types";

export function normalize(w: string): string {
  return w.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export interface RawAnswer {
  word: string;
  votesFor: string[];
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
      // votos: inválida si contras > favores (empate o 0 votos → válida)
      const against = new Set(a.votesAgainst || []).size;
      const favor = new Set(a.votesFor || []).size;
      if (against > favor && (against + favor) > 0) {
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
      let pts = counts[nw] > 1 ? 5 : 10;
      if (nBonus && nw.includes(nBonus)) pts += 3;
      if (config.multiplierEnabled && cat === multiplierCategoryIndex) pts *= 2;
      if (nw.length === maxLen && maxLen > 0) pts += 5;
      perAnswer[pid][cat] = { isValid: true, points: pts };
      scoreDelta[pid] += pts;
    }
  }

  return { perAnswer, scoreDelta };
}
