"use client";
import type { Player, Room } from "@/game/types";
import { useRound } from "@/hooks/useRound";
import { nextRound, restartGame } from "@/lib/round";
import { doc, writeBatch, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Props {
  code: string;
  room: Room;
  isHost: boolean;
  players: Array<Player & { id: string }>;
  isFinished?: boolean;
}

export function Scoreboard({ code, room, isHost, players, isFinished }: Props) {
  const { answers } = useRound(code, room.currentRound);
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const totalRounds = room.config?.totalRounds ?? 5;

  const handleRestart = async () => {
    // Reset all player scores
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
          <p className="text-zinc-500 text-sm mt-1">
            {totalRounds} rondas completadas
          </p>
        </div>
      ) : (
        <div className="text-center">
          <h2 className="text-xl font-semibold">Puntuación</h2>
          <p className="text-xs text-zinc-500 mt-1">
            Ronda {room.currentRound + 1} de {totalRounds}
          </p>
        </div>
      )}

      {/* Ranking */}
      <div className="flex flex-col gap-2">
        {sorted.map((p, i) => {
          const medal = isFinished && i === 0 ? "🥇 " : isFinished && i === 1 ? "🥈 " : isFinished && i === 2 ? "🥉 " : "";
          return (
            <div
              key={p.id}
              className={
                "bg-panel rounded-xl px-4 py-3 flex justify-between border transition-all " +
                (isFinished && i === 0
                  ? "border-accent/60 bg-accent/5"
                  : "border-zinc-800")
              }
            >
              <span className="font-medium">
                {medal}{i + 1}. {p.nickname}
              </span>
              <span className="text-accent font-bold">{p.score} pts</span>
            </div>
          );
        })}
      </div>

      {/* Detalle de la ronda */}
      <details className="text-sm">
        <summary className="text-zinc-500 cursor-pointer hover:text-zinc-300 transition-colors">
          Detalle de la ronda
        </summary>
        <div className="mt-2 flex flex-col gap-2">
          {room.categories.map((cat, ci) => {
            const isMult = room.config?.multiplierEnabled !== false && ci === room.multiplierCategoryIndex;
            return (
              <div key={ci} className="bg-panel rounded-lg p-2 border border-zinc-800">
                <div className={"text-xs uppercase mb-1 " + (isMult ? "text-accent font-bold" : "text-zinc-500")}>
                  {cat}{isMult && " ×2"}
                </div>
                {players.map((p) => {
                  const entry = answers.find((a) => a.id === p.id)?.words[ci];
                  return (
                    <div key={p.id} className="flex justify-between text-xs py-0.5">
                      <span className={entry?.isValid ? "" : "text-zinc-600"}>
                        {p.nickname}: {entry?.word?.trim() || "—"}
                      </span>
                      <span className={entry?.isValid ? "text-good font-bold" : "text-zinc-600"}>
                        {entry?.isValid ? `+${entry.points}` : "0"}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </details>

      {/* Acciones */}
      {isFinished ? (
        isHost ? (
          <button
            onClick={handleRestart}
            className="bg-accent text-black font-semibold rounded-xl py-3 transition-all active:scale-95"
          >
            🔄 Nueva partida
          </button>
        ) : (
          <p className="text-center text-zinc-500">Esperando al host…</p>
        )
      ) : isHost ? (
        <button
          onClick={() => nextRound(code)}
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
