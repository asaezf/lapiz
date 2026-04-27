"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAnonAuth } from "@/hooks/useAnonAuth";
import { createRoom, joinRoom } from "@/lib/rooms";

// Detecta emojis y símbolos no-letra
function hasEmoji(s: string): boolean {
  return /\p{Extended_Pictographic}|\p{Emoji_Presentation}/u.test(s);
}

function stripEmoji(s: string): string {
  return s.replace(/\p{Extended_Pictographic}|\p{Emoji_Presentation}/gu, "").trim();
}

export default function HomePage() {
  const { user, loading } = useAnonAuth();
  const router = useRouter();

  const [nickname, setNickname] = useState("");
  const [step, setStep] = useState<"name" | "action">("name");
  const [mode, setMode] = useState<"create" | "join" | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("nickname") : null;
    if (saved) { setNickname(saved); setStep("action"); }
  }, []);

  const validNick = nickname.trim().length >= 2 && nickname.trim().length <= 16 && !hasEmoji(nickname);
  const nickError = hasEmoji(nickname) ? "Sin emojis, porfa 😅" : nickname.trim().length > 0 && nickname.trim().length < 2 ? "Mínimo 2 caracteres" : null;

  const saveNick = () => {
    const trimmed = nickname.trim();
    localStorage.setItem("nickname", trimmed);
    return trimmed;
  };

  const goToAction = () => {
    if (!validNick) return;
    saveNick();
    setStep("action");
    setError(null);
  };

  const handleCreate = async () => {
    if (!user || !validNick) return;
    const code = customCode.trim().toUpperCase();
    if (code && (code.length !== 5 || !/^[A-Z0-9]+$/.test(code))) {
      setError("El código debe tener exactamente 5 letras/números"); return;
    }
    setBusy(true); setError(null);
    try {
      const nick = saveNick();
      const roomCode = await createRoom(user.uid, nick, code || undefined);
      router.push(`/room/${roomCode}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al crear sala");
      setBusy(false);
    }
  };

  const handleJoin = async () => {
    if (!user || !validNick) return;
    const roomCode = joinCode.trim().toUpperCase();
    if (roomCode.length !== 5) { setError("El código tiene 5 caracteres"); return; }
    setBusy(true); setError(null);
    try {
      const nick = saveNick();
      await joinRoom(roomCode, user.uid, nick);
      router.push(`/room/${roomCode}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al unirse");
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

        {/* PASO 1: nombre */}
        {step === "name" && (
          <>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-zinc-400 uppercase tracking-wide">¿Cómo te llamas?</span>
              <input
                value={nickname}
                onChange={(e) => setNickname(stripEmoji(e.target.value))}
                onKeyDown={(e) => e.key === "Enter" && validNick && goToAction()}
                maxLength={16}
                autoComplete="off"
                spellCheck={false}
                autoFocus
                className="bg-panel rounded-lg px-4 py-3 text-lg outline-none border border-zinc-800 focus:border-accent"
              />
              {nickError && <span className="text-danger text-xs">{nickError}</span>}
            </label>
            <button
              onClick={goToAction}
              disabled={!validNick}
              className="bg-accent text-black font-semibold rounded-lg py-3 disabled:opacity-40 transition-all active:scale-95"
            >
              Continuar →
            </button>
          </>
        )}

        {/* PASO 2: crear o unirse */}
        {step === "action" && (
          <>
            <div className="flex items-center gap-3">
              <span className="text-zinc-300 font-medium truncate">Hola, <span className="text-accent">{nickname.trim()}</span></span>
              <button
                onClick={() => { setStep("name"); setMode(null); setError(null); }}
                className="text-xs text-zinc-600 hover:text-zinc-400 underline ml-auto flex-shrink-0"
              >
                cambiar nombre
              </button>
            </div>

            {mode === null && (
              <div className="grid grid-cols-2 gap-3 mt-2">
                <button
                  onClick={() => { setMode("create"); setError(null); }}
                  className="bg-accent text-black font-semibold rounded-xl py-5 text-lg transition-all active:scale-95"
                >
                  ✏️ Crear sala
                </button>
                <button
                  onClick={() => { setMode("join"); setError(null); }}
                  className="bg-panel border border-zinc-700 text-zinc-200 font-semibold rounded-xl py-5 text-lg transition-all active:scale-95"
                >
                  🚪 Unirse
                </button>
              </div>
            )}

            {mode === "create" && (
              <>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-zinc-400 uppercase tracking-wide">Código de sala (opcional)</span>
                  <input
                    value={customCode}
                    onChange={(e) => setCustomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                    maxLength={5}
                    autoComplete="off"
                    spellCheck={false}
                    className="bg-panel rounded-lg px-4 py-3 text-lg tracking-[0.4em] text-center uppercase outline-none border border-zinc-800 focus:border-accent"
                  />
                  <span className="text-[11px] text-zinc-600">5 letras/números — vacío para código aleatorio</span>
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setMode(null); setError(null); setCustomCode(""); }}
                    className="flex-1 bg-zinc-800 rounded-lg py-3 text-zinc-400"
                  >
                    ← Volver
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={busy}
                    className="flex-[2] bg-accent text-black font-semibold rounded-lg py-3 disabled:opacity-40 transition-all active:scale-95"
                  >
                    {busy ? "Creando…" : "Crear sala ✏️"}
                  </button>
                </div>
              </>
            )}

            {mode === "join" && (
              <>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-zinc-400 uppercase tracking-wide">Código de sala</span>
                  <input
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && joinCode.length === 5 && handleJoin()}
                    maxLength={5}
                    autoComplete="off"
                    spellCheck={false}
                    autoFocus
                    className="bg-panel rounded-lg px-4 py-3 text-xl tracking-[0.5em] text-center uppercase outline-none border border-zinc-800 focus:border-accent"
                  />
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setMode(null); setError(null); setJoinCode(""); }}
                    className="flex-1 bg-zinc-800 rounded-lg py-3 text-zinc-400"
                  >
                    ← Volver
                  </button>
                  <button
                    onClick={handleJoin}
                    disabled={!joinCode || joinCode.length !== 5 || busy}
                    className="flex-[2] bg-panel border border-zinc-700 text-zinc-200 font-semibold rounded-lg py-3 disabled:opacity-40 transition-all active:scale-95"
                  >
                    {busy ? "Entrando…" : "Unirse 🚪"}
                  </button>
                </div>
              </>
            )}

            {error && <p className="text-danger text-sm text-center">{error}</p>}
          </>
        )}

      </div>
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-screen items-center justify-center text-zinc-400">{children}</main>;
}
