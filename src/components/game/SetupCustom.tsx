"use client";
import { useState } from "react";
import { startRound } from "@/lib/round";
import type { Room, Player } from "@/game/types";

interface Props {
  code: string;
  roundIdx: number;
  room: Room;
  userId: string;
  players: Array<Player & { id: string }>;
}

export function SetupCustom({ code, roundIdx, room, userId, players }: Props) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  // Proposer aleatorio elegido en startGame / nextRound
  const proposerId = room.customCategoryCurrentPlayer || room.hostId;
  const proposerName = players.find((p) => p.id === proposerId)?.nickname || "???";
  const isMyTurn = proposerId === userId;

  const handle = async () => {
    const v = value.trim();
    if (v.length < 3) return;
    setBusy(true);
    try {
      await startRound(code, roundIdx, v, room.config);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center gap-5">
      {/* Ronda info */}
      <div className="text-center">
        <div className="text-xs uppercase text-zinc-500 tracking-widest">Ronda {roundIdx}</div>
        <h2 className="text-xl font-semibold mt-1">Categoría inventada</h2>
      </div>

      {/* Quién propone */}
      <div className="bg-panel rounded-xl p-4 border border-zinc-800 text-center">
        <div className="text-xs uppercase text-zinc-500">Propone</div>
        <div className="text-lg font-bold text-accent mt-1">
          {isMyTurn ? "¡Te toca a ti! ✏️" : `${proposerName} está pensando…`}
        </div>
      </div>

      {isMyTurn ? (
        <>
          <p className="text-zinc-500 text-sm text-center">
            Escribe algo creativo (p. ej. &ldquo;Excusas para llegar tarde&rdquo;)
          </p>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={40}
            autoComplete="off"
            spellCheck={false}
            placeholder="Categoría"
            autoFocus
            className="bg-panel rounded-lg px-4 py-3 text-lg outline-none border border-zinc-800 focus:border-accent"
          />
          <button
            onClick={handle}
            disabled={value.trim().length < 3 || busy}
            className="bg-accent text-black font-semibold rounded-lg py-3 disabled:opacity-40 transition-opacity"
          >
            Empezar ronda
          </button>
        </>
      ) : (
        <div className="flex items-center justify-center gap-2 text-zinc-500">
          <span className="animate-pulse text-2xl">✍️</span>
          <span>Esperando a {proposerName}…</span>
        </div>
      )}
    </div>
  );
}
