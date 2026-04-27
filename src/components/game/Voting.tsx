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
  const majorityNeeded = Math.floor(eligibleVoters / 2) + 1;

  return (
    <div className="flex flex-col gap-4 flex-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm uppercase text-zinc-500 font-semibold">Votación</h2>
        <span className="text-xs text-zinc-500">
          {majorityNeeded > 0 ? `${majorityNeeded} 👎 = inválida` : ""}
        </span>
      </div>

      {/* Instrucciones */}
      {showHelp && (
        <div className="bg-panel rounded-xl p-3 border border-zinc-800 text-xs text-zinc-400 relative">
          <button onClick={() => setShowHelp(false)} className="absolute top-2 right-3 text-zinc-600 hover:text-zinc-300 text-sm" aria-label="Cerrar">✕</button>
          <div className="font-bold text-zinc-300 mb-1 text-sm">📋 Votación</div>
          <ul className="list-disc list-inside space-y-0.5">
            <li>👎 en palabras tramposas o incorrectas.</li>
            <li>Si <strong className="text-danger">la mayoría</strong> vota 👎 → palabra <strong className="text-danger">inválida (0 pts)</strong>.</li>
            <li>No puedes votar tu propia palabra.</li>
          </ul>
        </div>
      )}
      {!showHelp && (
        <button onClick={() => setShowHelp(true)} className="text-xs text-zinc-600 underline self-start">Mostrar instrucciones</button>
      )}

      {/* Respuestas por categoría */}
      <div className="flex flex-col gap-4">
        {room.categories.map((cat, catIdx) => {
          const isMult = room.config?.multiplierEnabled !== false && catIdx === room.multiplierCategoryIndex;
          return (
            <div key={catIdx} className="bg-panel rounded-xl p-3 border border-zinc-800">
              <div className={"text-xs uppercase mb-3 font-semibold " + (isMult ? "text-accent" : "text-zinc-500")}>
                {cat}{isMult && " ×2"}
              </div>
              <ul className="flex flex-col gap-3">
                {players.map((p) => {
                  const entry = answers.find((a) => a.id === p.id)?.words[catIdx];
                  const word = entry?.word?.trim() || "—";
                  const votesAgainst = entry?.votesAgainst || [];
                  const iVotedAgainst = votesAgainst.includes(userId);
                  const isMine = p.id === userId;
                  const eligible = Math.max(0, players.length - 1);
                  const losing = eligible > 0 && votesAgainst.length > eligible / 2;
                  // Fill: 0→1 de votos actuales hacia la mayoría necesaria
                  const fillPct = Math.min(100, Math.round((votesAgainst.length / Math.max(1, majorityNeeded)) * 100));
                  const voterNames = votesAgainst
                    .map((vid) => players.find((pl) => pl.id === vid)?.nickname)
                    .filter(Boolean)
                    .join(", ");

                  return (
                    <li key={p.id} className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500 w-16 truncate flex-shrink-0">{p.nickname}</span>
                        <span className={
                          "flex-1 text-sm font-medium transition-all " +
                          (losing
                            ? "line-through text-zinc-600"
                            : word === "—" ? "text-zinc-600" : "text-zinc-100")
                        }>
                          {word}
                        </span>

                        {/* Botón dislike con efecto de llenado */}
                        {!isMine && word !== "—" && (
                          <button
                            onClick={() => handleVote(p.id, catIdx)}
                            className={
                              "relative overflow-hidden w-16 h-10 rounded-xl border-2 transition-all flex-shrink-0 " +
                              (losing
                                ? "border-danger bg-danger/10"
                                : iVotedAgainst
                                  ? "border-danger/80"
                                  : "border-zinc-700 hover:border-danger/50")
                            }
                            title={voterNames ? `Votos en contra: ${voterNames}` : "Votar en contra"}
                          >
                            {/* Fill rojo de abajo a arriba */}
                            <span
                              className="absolute bottom-0 left-0 right-0 bg-danger/30 transition-all duration-300 ease-out"
                              style={{ height: `${fillPct}%` }}
                            />
                            {/* Contenido */}
                            <span className="relative z-10 flex items-center justify-center gap-1 h-full text-sm font-bold">
                              <span className={losing ? "text-danger" : iVotedAgainst ? "text-danger" : "text-zinc-400"}>
                                👎
                              </span>
                              {votesAgainst.length > 0 && (
                                <span className={
                                  "text-xs tabular-nums " +
                                  (losing ? "text-danger font-black" : iVotedAgainst ? "text-danger" : "text-zinc-400")
                                }>
                                  {votesAgainst.length}
                                </span>
                              )}
                            </span>
                          </button>
                        )}

                        {/* Si es mía y hay votos, mostrar contador */}
                        {isMine && votesAgainst.length > 0 && (
                          <span className={"text-xs flex-shrink-0 font-bold " + (losing ? "text-danger" : "text-zinc-500")}>
                            👎 {votesAgainst.length}
                          </span>
                        )}
                      </div>

                      {/* Quién ha votado en contra — muy sutil */}
                      {voterNames && word !== "—" && (
                        <div className="text-[10px] text-zinc-700 pl-[72px] leading-snug">
                          {voterNames}
                        </div>
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
