const MAIN_LETTERS = "ABCDEFGHIJLMNOPRSTUV".split("");
const ANY_LETTERS = "ABCDEFGHIJLMNOPQRSTUVZ".split("");

export const STANDARD_CATEGORIES = [
  "Nombre",
  "Apellido",
  "Animal",
  "Ciudad",
  "País",
  "Comida",
  "Bebida",
  "Objeto",
  "Marca",
  "Película",
  "Serie",
  "Cantante o Grupo",
  "Profesión",
  "Parte del cuerpo",
  "Famoso",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Devuelve `totalCount` categorías para la ronda. Si `customCategory` no está vacía,
 * la última posición es la custom y se cogen `totalCount - 1` del banco.
 * Si está vacía, se cogen `totalCount` enteras del banco.
 */
export function pickRoundCategories(customCategory: string, totalCount: number): string[] {
  const pool = [...STANDARD_CATEGORIES];
  const hasCustom = customCategory.trim().length > 0;
  const standardCount = hasCustom ? Math.max(0, totalCount - 1) : totalCount;
  const chosen: string[] = [];
  const n = Math.min(standardCount, pool.length);
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    chosen.push(pool.splice(idx, 1)[0]);
  }
  if (hasCustom) chosen.push(customCategory.trim());
  return chosen;
}

export function generateRoundLetters(config: { forbiddenLetterEnabled: boolean; bonusLetterEnabled: boolean }): {
  letter: string;
  forbiddenLetter: string;
  bonusLetter: string;
} {
  const letter = pick(MAIN_LETTERS);
  let forbiddenLetter = config.forbiddenLetterEnabled ? pick(ANY_LETTERS) : "";
  while (forbiddenLetter === letter) forbiddenLetter = pick(ANY_LETTERS);
  let bonusLetter = config.bonusLetterEnabled ? pick(ANY_LETTERS) : "";
  while (bonusLetter === letter || bonusLetter === forbiddenLetter) bonusLetter = pick(ANY_LETTERS);
  return { letter, forbiddenLetter, bonusLetter };
}

export function pickMultiplierIndex(totalCategories: number): number {
  return Math.floor(Math.random() * totalCategories);
}
