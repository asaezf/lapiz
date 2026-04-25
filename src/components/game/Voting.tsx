"use client";
import { useRef, useState } from "react";
import type { Room, Player } from "@/game/types";
import { useRound } from "@/hooks/useRound";
import { applyScores, toggleVote } from "@/lib/round";

interface Props {
  code: string;
  room: Room;
  userId: string;
  isHost: boolean;
  players: Array<Player & { id: string }>;
}

export function Voting({ code, room, userId, isHost, players }: Props) {
  const roundIdx = room.currentRound;
  const { answers } = useRound(code, roundIdx);
  const appliedRef = useRef(false);
  const [showHelp, setShowHelp] = useState(true);
  const [closing, setClosing] = useState(false);

  const handleVote = (authorId: string, catIdx: number) => {
    const entry = answers.find((a) => a.id === authorId)?.words[catIdx];
    const currentAgainst = entry?.votesAgainst || [];
    toggleVote(code, roundIdx, authorId, catIdx, userId, currentAgainst);
  };

  const handleCloseVoting = async () => {
    if (appliedRef.current) return;
    appliedRef.current = true;
    setClosing(true);
    try {
      await applyScores(code, roundIdx, room, players.map((p) => p.id));
    } catch {
      appliedRef.current = false;
      setClosing(false);
    }
  };

  const eligibleVoters = Math.max(0, players.length - 1);
  const majorityNeeded = Math.floor(eligibleVoters / 2) + 1; // estricto: > mitad

  return (
    <div className="flex flex-col gap-4 flex-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm uppercase text-zinc-500 font-semibold">Votación</h2>
        <span className="text-xs text-zinc-500">
          {players.length} jugadores · {majorityNeeded > 0 ? `${majorityNeeded} 👎 = inválida` : ""}
        </span>
      </div>

      {/* Instrucciones */}
      {showHelp && (
        <div className="bg-panel rounded-xl p-3 border border-zinc-800 text-xs text-zinc-400 relative">
          <button
            onClick={() => setShowHelp(false)}
            className="absolute top-2 right-3 text-zinc-600 hover:text-zinc-300 text-sm"
            aria-label="Cerrar ayuda"
          >
            ✕
          </button>
          <div className="font-bold text-zinc-300 mb-2 text-sm">📋 Cómo votar</div>
          <ul className="list-disc list-inside space-y-1 mb-3">
            <li>Pulsa <span className="text-danger">👎</span> en palabras inventadas, mal usadas o tramposas.</li>
            <li>Si <strong className="text-danger">la mayoría</strong> vota 👎 (más de la mitad de los demás), la palabra queda <strong className="text-danger">inválida (0 pts)</strong>.</li>
            <li>Por defecto, todas las palabras cuentan como válidas. <strong>No hace falta votar a favor.</strong></li>
            <li>No puedes votar tu propia palabra.</li>
          </ul>
          <div className="font-bold text-zinc-300 mb-2 text-sm">💰 Puntuación</div>
          <ul className="list-disc list-inside space-y-1">
            <li>Palabra <strong>única</strong>: 10 pts · <strong>repetida</strong>: 5 pts</li>
            <li>Contiene <strong className="text-good">letra bonus</strong>: +3 pts</li>
            <li>Categoría <strong className="text-accent">×2</strong>: puntos dobles</li>
            <li>Palabra <strong>más larga</strong> válida: +5 pts (Empollón)</li>
            <li>Contiene <strong className="text-danger">letra prohibida</strong>: 0 pts (automático)</li>
          </ul>
        </div>
      )}
      {!showHelp && (
        <button onClick={() => setShowHelp(true)} className="text-xs text-zinc-600 underline self-start">
          Mostrar instrucciones
        </button>
      )}

      {/* Respuestas por categoría */}
      <div className="flex flex-col gap-4">
        {room.categories.map((cat, catIdx) => {
          const isMult = room.config?.multiplierEnabled !== false && catIdx === room.multiplierCategoryIndex;
          return (
            <div key={catIdx} className="bg-panel rounded-xl p-3 border border-zinc-800">
              <div className={"text-xs uppercase mb-2 font-semibold " + (isMult ? "text-accent" : "text-zinc-500")}>
                {cat}{isMult && " ×2"}
              </div>
              <ul className="flex flex-col gap-2">
                {players.map((p) => {
                  const entry = answers.find((a) => a.id === p.id)?.words[catIdx];
                  const word = entry?.word?.trim() || "—";
                  const votesAgainst = entry?.votesAgainst || [];
                  const iVotedAgainst = votesAgainst.includes(userId);
                  const isMine = p.id === userId;
                  const eligible = Math.max(0, players.length - 1);
                  const losing = eligible > 0 && votesAgainst.length > eligible / 2;

                  return (
                    <li key={p.id} className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500 w-16 truncate flex-shrink-0">{p.nickname}</span>
                      <span className={"flex-1 text-sm " + (losing ? "line-through text-zinc-600" : word === "—" ? "text-zinc-600" : "")}>
                        {word}
                      </span>
                      {!isMine && word !== "—" && (
                        <button
                          onClick={() => handleVote(p.id, catIdx)}
                          className={
                            "text-xs px-3 py-1.5 rounded-lg border transition-all flex-shrink-0 " +
                            (iVotedAgainst
                              ? "bg-danger/20 text-danger border-danger/60"
                              : "border-zinc-700 text-zinc-500 hover:border-danger/40")
                          }
                        >
                          👎 {votesAgainst.length > 0 ? votesAgainst.length : ""}
                        </button>
                      )}
                      {isMine && votesAgainst.length > 0 && (
                        <span className="text-xs text-danger flex-shrink-0">👎 {votesAgainst.length}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Acción del host */}
      <div className="sticky bottom-2 mt-2">
        {isHost ? (
          <button
            onClick={handleCloseVoting}
            disabled={closing}
            className="w-full bg-accent text-black font-bold rounded-xl py-4 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-accent/20"
          >
            {closing ? "Calculando…" : "✅ Cerrar votación y calcular puntos"}
          </button>
        ) : (
          <div className="w-full bg-panel border border-zinc-800 rounded-xl py-3 text-center text-zinc-500 text-sm">
            Esperando a que el host cierre la votación…
          </div>
        )}
      </div>
    </div>
  );
}
