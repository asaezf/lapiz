"use client";
import { useParams, useRouter } from "next/navigation";
import { useAnonAuth } from "@/hooks/useAnonAuth";
import { useRoom } from "@/hooks/useRoom";
import { useEffect, useState } from "react";
import { addPlayer } from "@/lib/rooms";
import { openCustomSetup } from "@/lib/round";
import { LobbyConfig } from "@/components/game/LobbyConfig";
import { SetupCustom } from "@/components/game/SetupCustom";
import { Playing } from "@/components/game/Playing";
import { Voting } from "@/components/game/Voting";
import { Scoreboard } from "@/components/game/Scoreboard";
import { DEFAULT_CONFIG } from "@/game/types";

export default function RoomPage() {
  const params = useParams<{ id: string }>();
  const code = (params?.id || "").toUpperCase();
  const router = useRouter();
  const { user, loading } = useAnonAuth();
  const { room, players, error } = useRoom(code);
  const [joining, setJoining] = useState(false);

  const isHost = !!user && !!room && user.uid === room.hostId;
  const iAmIn = !!user && players.some((p) => p.id === user.uid);

  useEffect(() => {
    if (!user || !room || iAmIn || joining) return;
    if (room.status !== "lobby") return;
    const nickname = localStorage.getItem("nickname");
    if (!nickname) { router.push("/"); return; }
    setJoining(true);
    addPlayer(code, user.uid, nickname).finally(() => setJoining(false));
  }, [user, room, iAmIn, joining, code, router]);

  const handleStart = async () => {
    if (!isHost) return;
    await openCustomSetup(code, players);
  };

  if (loading || !room || !user) {
    return <Centered>{error ?? "Cargando sala…"}</Centered>;
  }

  const config = room.config || DEFAULT_CONFIG;
  const totalRounds = config.totalRounds ?? 5;

  return (
    <main className="flex min-h-screen flex-col p-4 gap-4 max-w-md mx-auto w-full">
      <header className="flex items-center justify-between">
        <button onClick={() => router.push("/")} className="text-zinc-500 text-sm hover:text-zinc-300 transition-colors">
          ← Salir
        </button>
        <div className="text-center">
          <div className="text-xs text-zinc-500 uppercase">Código</div>
          <div className="text-xl font-mono tracking-[0.3em] text-accent">{code}</div>
        </div>
        <div className="text-right text-xs text-zinc-500">
          Ronda<br />
          <span className="text-zinc-200 text-base">
            {room.status === "lobby" ? "—" : `${room.currentRound + 1}/${totalRounds}`}
          </span>
        </div>
      </header>

      {room.status === "lobby" && (
        <LobbyView
          players={players}
          room={room}
          isHost={isHost}
          userId={user.uid}
          onStart={handleStart}
          code={code}
          config={config}
        />
      )}

      {room.status === "setup_custom" && (
        <SetupCustom
          code={code}
          roundIdx={room.currentRound + 1}
          room={room}
          userId={user.uid}
          players={players}
        />
      )}

      {room.status === "playing" && (
        <Playing code={code} room={room} userId={user.uid} isHost={isHost} players={players} />
      )}

      {room.status === "voting" && (
        <Voting code={code} room={room} userId={user.uid} isHost={isHost} players={players} />
      )}

      {room.status === "scoreboard" && (
        <Scoreboard code={code} room={room} isHost={isHost} players={players} />
      )}

      {room.status === "finished" && (
        <Scoreboard code={code} room={room} isHost={isHost} players={players} isFinished />
      )}
    </main>
  );
}

function LobbyView({
  players, room, isHost, userId, onStart, code, config,
}: {
  players: Array<{ id: string; nickname: string; score: number }>;
  room: { hostId: string };
  isHost: boolean;
  userId: string;
  onStart: () => void;
  code: string;
  config: import("@/game/types").RoomConfig;
}) {
  return (
    <>
      <section className="flex-1 flex flex-col gap-4">
        <h2 className="text-sm uppercase text-zinc-500 mb-1">Jugadores ({players.length})</h2>
        <ul className="flex flex-col gap-2">
          {players.map((p) => (
            <li key={p.id} className="bg-panel rounded-xl px-4 py-3 flex justify-between items-center border border-zinc-800">
              <span className="font-medium">
                {p.nickname}
                {p.id === room.hostId && <span className="ml-2 text-xs text-accent">HOST</span>}
                {p.id === userId && <span className="ml-2 text-xs text-zinc-500">(tú)</span>}
              </span>
              <span className="text-zinc-500 text-sm">{p.score} pts</span>
            </li>
          ))}
        </ul>

        {/* Config panel solo para el host */}
        {isHost && <LobbyConfig code={code} config={config} />}
      </section>

      {isHost ? (
        <button
          onClick={onStart}
          disabled={players.length < 2}
          className="bg-accent text-black font-semibold rounded-xl py-4 disabled:opacity-40 transition-all active:scale-95"
        >
          {players.length < 2 ? "Esperando jugadores…" : "🚀 Empezar partida"}
        </button>
      ) : (
        <p className="text-center text-zinc-500">Esperando a que el host empiece…</p>
      )}
    </>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-screen items-center justify-center text-zinc-400">{children}</main>;
}
