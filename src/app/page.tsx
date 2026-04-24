"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAnonAuth } from "@/hooks/useAnonAuth";
import { createRoom, joinRoom } from "@/lib/rooms";

export default function HomePage() {
  const { user, loading } = useAnonAuth();
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("nickname") : null;
    if (saved) setNickname(saved);
  }, []);

  const validNick = nickname.trim().length >= 2 && nickname.trim().length <= 16;

  const saveNick = (n: string) => {
    const trimmed = n.trim();
    localStorage.setItem("nickname", trimmed);
    return trimmed;
  };

  const handleCreate = async () => {
    if (!user || !validNick) return;
    setBusy(true); setError(null);
    try {
      const nick = saveNick(nickname);
      const roomCode = await createRoom(user.uid, nick);
      router.push(`/room/${roomCode}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
      setBusy(false);
    }
  };

  const handleJoin = async () => {
    if (!user || !validNick) return;
    const roomCode = code.trim().toUpperCase();
    if (roomCode.length !== 5) { setError("El código tiene 5 letras"); return; }
    setBusy(true); setError(null);
    try {
      const nick = saveNick(nickname);
      await joinRoom(roomCode, user.uid, nick);
      router.push(`/room/${roomCode}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
      setBusy(false);
    }
  };

  if (loading) return <Centered>Conectando…</Centered>;
  if (!user) return <Centered>No se pudo iniciar sesión</Centered>;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-6">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-accent">Lápiz</h1>
        <p className="text-zinc-400 mt-2">Tutti Frutti online</p>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-zinc-400 uppercase tracking-wide">Tu nombre</span>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={16}
            autoComplete="off"
            spellCheck={false}
            placeholder="Tu nick"
            className="bg-panel rounded-lg px-4 py-3 text-lg outline-none border border-zinc-800 focus:border-accent"
          />
        </label>

        <button
          onClick={handleCreate}
          disabled={!validNick || busy}
          className="bg-accent text-black font-semibold rounded-lg py-3 disabled:opacity-40"
        >
          Crear sala
        </button>

        <div className="flex items-center gap-2 text-zinc-600">
          <div className="h-px bg-zinc-800 flex-1" /><span className="text-xs">O</span><div className="h-px bg-zinc-800 flex-1" />
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-zinc-400 uppercase tracking-wide">Código de sala</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={5}
            autoComplete="off"
            spellCheck={false}
            placeholder="ABCDE"
            className="bg-panel rounded-lg px-4 py-3 text-lg tracking-[0.5em] text-center uppercase outline-none border border-zinc-800 focus:border-accent"
          />
        </label>
        <button
          onClick={handleJoin}
          disabled={!validNick || code.length !== 5 || busy}
          className="bg-panel border border-zinc-700 rounded-lg py-3 disabled:opacity-40"
        >
          Unirse
        </button>

        {error && <p className="text-danger text-sm text-center">{error}</p>}
      </div>
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-screen items-center justify-center text-zinc-400">{children}</main>;
}
