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

export function pickRoundCategories(customCategory: string, count: number): string[] {
  const pool = [...STANDARD_CATEGORIES];
  const chosen: string[] = [];
  for (let i = 0; i < Math.min(count, pool.length); i++) {
    const idx = Math.floor(Math.random() * pool.length);
    chosen.push(pool.splice(idx, 1)[0]);
  }
  chosen.push(customCategory.trim());
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
