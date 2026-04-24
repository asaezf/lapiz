"use client";
import { useEffect, useRef, useState } from "react";
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
  const [remaining, setRemaining] = useState<number>(90);
  const appliedRef = useRef(false);
  const [showHelp, setShowHelp] = useState(true);

  const endsMs = room.votingEndsAt ? (room.votingEndsAt as any).toMillis() : null;

  useEffect(() => {
    if (!endsMs) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((endsMs - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0 && isHost && !appliedRef.current) {
        appliedRef.current = true;
        applyScores(code, roundIdx, room, players.map((p) => p.id)).catch(() => { appliedRef.current = false; });
      }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [endsMs, isHost, code, roundIdx, room, players]);

  const playerName = (id: string) => players.find((p) => p.id === id)?.nickname || id.slice(0, 4);

  const handleVote = (authorId: string, catIdx: number, voteType: "for" | "against") => {
    const entry = answers.find((a) => a.id === authorId)?.words[catIdx];
    const currentFor = entry?.votesFor || [];
    const currentAgainst = entry?.votesAgainst || [];
    toggleVote(code, roundIdx, authorId, catIdx, userId, currentFor, currentAgainst, voteType);
  };

  return (
    <div className="flex flex-col gap-4 flex-1">
      {/* Header con timer */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm uppercase text-zinc-500 font-semibold">Votación</h2>
        <div className={
          "text-2xl font-black tabular-nums " +
          (remaining <= 15 ? "text-danger animate-pulse" : "text-accent")
        }>
          {remaining}s
        </div>
      </div>

      {/* Instrucciones colapsables */}
      {showHelp && (
        <div className="bg-panel rounded-xl p-3 border border-zinc-800 text-xs text-zinc-400 relative">
          <button
            onClick={() => setShowHelp(false)}
            className="absolute top-2 right-3 text-zinc-600 hover:text-zinc-300 text-sm"
          >
            ✕
          </button>
          <div className="font-bold text-zinc-300 mb-2 text-sm">📋 Cómo votar</div>
          <ul className="list-disc list-inside space-y-1 mb-3">
            <li><span className="text-good">👍</span> = palabra válida y bien usada</li>
            <li><span className="text-danger">👎</span> = palabra inventada, mal usada o trampa</li>
            <li>Si <span className="text-danger">👎 &gt; 👍</span> → la palabra es <strong className="text-danger">inválida (0 pts)</strong></li>
            <li>Empate o sin votos → la palabra es <strong className="text-good">válida</strong></li>
          </ul>
          <div className="font-bold text-zinc-300 mb-2 text-sm">💰 Puntuación</div>
          <ul className="list-disc list-inside space-y-1">
            <li>Palabra <strong>única</strong>: 10 pts · <strong>repetida</strong>: 5 pts</li>
            <li>Contiene <strong className="text-good">letra bonus</strong>: +3 pts</li>
            <li>Categoría <strong className="text-accent">×2</strong>: puntos dobles</li>
            <li>Palabra <strong>más larga</strong> válida: +5 pts</li>
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
                  const votesFor = entry?.votesFor || [];
                  const votesAgainst = entry?.votesAgainst || [];
                  const iVotedFor = votesFor.includes(userId);
                  const iVotedAgainst = votesAgainst.includes(userId);
                  const isMine = p.id === userId;
                  const losing = votesAgainst.length > votesFor.length && (votesFor.length + votesAgainst.length) > 0;

                  return (
                    <li key={p.id} className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500 w-16 truncate flex-shrink-0">{p.nickname}</span>
                      <span className={"flex-1 text-sm " + (losing ? "line-through text-zinc-600" : word === "—" ? "text-zinc-600" : "")}>
                        {word}
                      </span>
                      {!isMine && word !== "—" && (
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => handleVote(p.id, catIdx, "for")}
                            className={
                              "text-xs px-2 py-1 rounded-lg border transition-all " +
                              (iVotedFor
                                ? "bg-good/20 text-good border-good/60"
                                : "border-zinc-700 text-zinc-500 hover:border-good/40")
                            }
                          >
                            👍 {votesFor.length > 0 ? votesFor.length : ""}
                          </button>
                          <button
                            onClick={() => handleVote(p.id, catIdx, "against")}
                            className={
                              "text-xs px-2 py-1 rounded-lg border transition-all " +
                              (iVotedAgainst
                                ? "bg-danger/20 text-danger border-danger/60"
                                : "border-zinc-700 text-zinc-500 hover:border-danger/40")
                            }
                          >
                            👎 {votesAgainst.length > 0 ? votesAgainst.length : ""}
                          </button>
                        </div>
                      )}
                      {isMine && (votesFor.length > 0 || votesAgainst.length > 0) && (
                        <span className="text-xs flex gap-2 flex-shrink-0">
                          {votesFor.length > 0 && <span className="text-good">👍 {votesFor.length}</span>}
                          {votesAgainst.length > 0 && <span className="text-danger">👎 {votesAgainst.length}</span>}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
