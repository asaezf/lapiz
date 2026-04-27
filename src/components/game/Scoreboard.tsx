"use client";
import type { Player, Room, AnswerEntry } from "@/game/types";
import { DEFAULT_CONFIG } from "@/game/types";
import { useRound, type PlayerAnswersDoc } from "@/hooks/useRound";
import { nextRound, restartGame } from "@/lib/round";
import { doc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { normalize } from "@/game/scoring";

interface Props {
  code: string;
  room: Room;
  isHost: boolean;
  players: Array<Player & { id: string }>;
  isFinished?: boolean;
}

/** Calcula cuántos puntos ganó un jugador esta ronda (suma de .points en sus respuestas válidas) */
function calcRoundDelta(pid: string, answers: PlayerAnswersDoc[], finishBonus: Record<string, number>): number {
  const ans = answers.find((a) => a.id === pid);
  const base = ans ? Object.values(ans.words).reduce((s, e) => s + (e.isValid && e.points ? e.points : 0), 0) : 0;
  return base + (finishBonus[pid] || 0);
}

/** Construye una explicación de la puntuación de una palabra */
function buildBreakdown(
  entry: AnswerEntry,
  word: string,
  catIdx: number,
  answers: PlayerAnswersDoc[],
  room: Room
): string {
  if (!entry.isValid || !word.trim()) return "";
  const config = room.config || DEFAULT_CONFIG;
  const nw = normalize(word);
  const nBonus = config.bonusLetterEnabled ? normalize(room.bonusLetter || "") : "";
  const isMult = config.multiplierEnabled && catIdx === room.multiplierCategoryIndex;
  const isLongest = config.longestWordBonusEnabled;

  // Contar cuántos tienen la misma palabra válida
  const sameCount = answers.filter((a) => {
    const e = a.words[catIdx];
    return e?.isValid && normalize(e.word || "") === nw;
  }).length;

  // Palabra más larga válida en esta categoría
  const maxLen = Math.max(...answers.map((a) => {
    const e = a.words[catIdx];
    return e?.isValid ? normalize(e.word || "").length : 0;
  }));

  const parts: string[] = [];
  const base = sameCount > 1 ? 1 : 2;
  parts.push(sameCount > 1 ? `1pt (repetida)` : `2pt (única)`);
  if (nBonus && nw.includes(nBonus)) parts.push("+1 bonus");
  if (isLongest && nw.length === maxLen && maxLen > 0) parts.push("+1 más larga");
  if (isMult) parts.push("×2");
  return parts.join(" · ");
}

export function Scoreboard({ code, room, isHost, players, isFinished }: Props) {
  const { answers, round } = useRound(code, room.currentRound);
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const totalRounds = room.config?.totalRounds ?? 5;
  const finishBonus: Record<string, number> = (round as any)?.finishBonus || {};

  const handleRestart = async () => {
    const batch = writeBatch(db);
    for (const p of players) {
      batch.update(doc(db, "rooms", code, "players", p.id), { score: 0 });
    }
    await batch.commit();
    await restartGame(code);
  };

  return (
    <div className="flex flex-col gap-4 flex-1">
      {isFinished ? (
        <div className="text-center py-4">
          <div className="text-4xl mb-2">🏆</div>
          <h2 className="text-2xl font-bold text-accent">¡Partida terminada!</h2>
          <p className="text-zinc-500 text-sm mt-1">{totalRounds} rondas completadas</p>
        </div>
      ) : (
        <div className="text-center">
          <h2 className="text-xl font-semibold">Puntuación</h2>
          <p className="text-xs text-zinc-500 mt-1">Ronda {room.currentRound} de {totalRounds}</p>
        </div>
      )}

      {/* Ranking */}
      <div className="flex flex-col gap-2">
        {sorted.map((p, i) => {
          const medal = isFinished && i === 0 ? "🥇 " : isFinished && i === 1 ? "🥈 " : isFinished && i === 2 ? "🥉 " : "";
          const delta = calcRoundDelta(p.id, answers, finishBonus);
          return (
            <div
              key={p.id}
              className={"bg-panel rounded-xl px-4 py-3 flex items-center justify-between border transition-all " + (isFinished && i === 0 ? "border-accent/60 bg-accent/5" : "border-zinc-800")}
            >
              <span className="font-medium flex-1">{medal}{i + 1}. {p.nickname}</span>
              <div className="text-right">
                <div className="text-accent font-bold">{p.score} pts</div>
                {!isFinished && delta > 0 && (
                  <div className="text-good text-xs font-semibold">+{delta} esta ronda</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detalle de la ronda */}
      {!isFinished && (
        <details className="text-sm">
          <summary className="text-zinc-500 cursor-pointer hover:text-zinc-300 transition-colors select-none">
            Ver detalle de la ronda
          </summary>
          <div className="mt-2 flex flex-col gap-2">
            {room.categories.map((cat, ci) => {
              const isMult = room.config?.multiplierEnabled !== false && ci === room.multiplierCategoryIndex;
              return (
                <div key={ci} className="bg-panel rounded-lg p-3 border border-zinc-800">
                  <div className={"text-xs uppercase mb-2 font-semibold " + (isMult ? "text-accent" : "text-zinc-500")}>
                    {cat}{isMult && " ×2"}
                  </div>
                  <div className="flex flex-col gap-1">
                    {players.map((p) => {
                      const entry = answers.find((a) => a.id === p.id)?.words[ci];
                      const word = entry?.word?.trim() || "";
                      const breakdown = entry ? buildBreakdown(entry, word, ci, answers, room) : "";
                      return (
                        <div key={p.id} className="grid grid-cols-[3.5rem_1fr_2.5rem_5rem] gap-x-1 text-xs py-0.5 items-baseline">
                          <span className="text-zinc-500 truncate">{p.nickname}</span>
                          <span className={entry?.isValid ? "text-zinc-200" : "text-zinc-600 line-through"}>
                            {word || "—"}
                          </span>
                          <span className={"text-center font-bold " + (entry?.isValid ? "text-good" : "text-zinc-600")}>
                            {entry?.isValid ? `+${entry.points}` : "0"}
                          </span>
                          <span className="text-[10px] text-zinc-500 leading-tight break-words">
                            {breakdown}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Bonus de finalización */}
            {Object.keys(finishBonus).length > 0 && (
              <div className="bg-good/5 border border-good/20 rounded-lg p-3">
                <div className="text-xs uppercase text-good font-semibold mb-1">⚡ Bonus finalización</div>
                {Object.entries(finishBonus).map(([pid, pts]) => {
                  const name = players.find((p) => p.id === pid)?.nickname || pid;
                  return (
                    <div key={pid} className="flex justify-between text-xs py-0.5">
                      <span className="text-zinc-400">{name}</span>
                      <span className="text-good font-bold">+{pts}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </details>
      )}

      {/* Acciones */}
      {isFinished ? (
        isHost ? (
          <button onClick={handleRestart} className="bg-accent text-black font-semibold rounded-xl py-3 transition-all active:scale-95">
            🔄 Nueva partida
          </button>
        ) : (
          <p className="text-center text-zinc-500">Esperando al host…</p>
        )
      ) : isHost ? (
        <button
          onClick={() => nextRound(code, room.config || DEFAULT_CONFIG, room.currentRound + 1, players.map(p => p.id))}
          className="bg-accent text-black font-semibold rounded-xl py-3 transition-all active:scale-95"
        >
          Siguiente ronda →
        </button>
      ) : (
        <p className="text-center text-zinc-500">Esperando al host…</p>
      )}
    </div>
  );
}
