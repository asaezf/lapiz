"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { playerDone, moveToVoting, saveAnswer, FINISH_TIMER_SECONDS } from "@/lib/round";
import type { Room, Player } from "@/game/types";
import confetti from "canvas-confetti";

interface Props {
  code: string;
  room: Room;
  userId: string;
  isHost: boolean;
  players: Array<Player & { id: string }>;
}

interface Toast {
  id: number;
  text: string;
  timeAgo: string;
}

let toastId = 0;

export function Playing({ code, room, userId, isHost, players }: Props) {
  const { categories, currentLetter, forbiddenLetter, bonusLetter, multiplierCategoryIndex } = room;
  const config = room.config;
  const roundIdx = room.currentRound;

  const [words, setWords] = useState<string[]>(() => categories.map(() => ""));
  const [remaining, setRemaining] = useState<number | null>(null);
  const [isDone, setIsDone] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const doneButtonRef = useRef<HTMLButtonElement | null>(null);
  const saveTimer = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const movedRef = useRef(false);
  const confettiFired = useRef(false);
  const prevFinished = useRef<string[]>([]);
  const vibratingRef = useRef(false);

  // Timer dinámico — countdown basado en finishTimerEndsAt
  const finishMs = room.finishTimerEndsAt ? (room.finishTimerEndsAt as any).toMillis() : null;

  useEffect(() => {
    if (!finishMs) { setRemaining(null); return; }
    const tick = () => {
      const left = Math.max(0, Math.ceil((finishMs - Date.now()) / 1000));
      setRemaining(left);

      // Vibración últimos 6 segundos
      if (left <= 6 && left > 0 && !vibratingRef.current) {
        vibratingRef.current = true;
        try { navigator.vibrate?.([200, 100, 200]); } catch {}
      }
      if (left > 6) vibratingRef.current = false;

      // Vibrar cada segundo en los últimos 6
      if (left <= 6 && left > 0) {
        try { navigator.vibrate?.(150); } catch {}
      }

      // Host avanza a voting cuando el timer llega a 0
      if (left === 0 && isHost && !movedRef.current) {
        movedRef.current = true;
        moveToVoting(code, roundIdx).catch(() => { movedRef.current = false; });
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [finishMs, code, roundIdx, isHost]);

  // También avanzar si todos han acabado
  useEffect(() => {
    const finished = room.playersFinished || [];
    if (finished.length > 0 && finished.length >= players.length && isHost && !movedRef.current) {
      movedRef.current = true;
      moveToVoting(code, roundIdx).catch(() => { movedRef.current = false; });
    }
  }, [room.playersFinished, players.length, isHost, code, roundIdx]);

  // Confeti al primer jugador que acaba (si soy yo)
  useEffect(() => {
    if (room.stopCalledBy === userId && !confettiFired.current && room.playersFinished?.includes(userId)) {
      confettiFired.current = true;
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#f5c518", "#22c55e", "#ef4444", "#ffffff"],
      });
    }
  }, [room.stopCalledBy, room.playersFinished, userId]);

  // Toast notifications cuando otros jugadores acaban
  useEffect(() => {
    const finished = room.playersFinished || [];
    const prev = prevFinished.current;

    for (const pid of finished) {
      if (!prev.includes(pid) && pid !== userId) {
        const name = players.find((p) => p.id === pid)?.nickname || "???";
        const isFirst = finished.indexOf(pid) === 0 && prev.length === 0;
        const text = isFirst
          ? `🏁 ¡${name} ha acabado primero!`
          : `⚡ ${name} ha acabado (−4s)`;
        setToasts((t) => [...t, { id: ++toastId, text, timeAgo: "ahora" }]);
      }
    }
    prevFinished.current = [...finished];
  }, [room.playersFinished, userId, players]);

  // Auto-remove toasts after 4s
  useEffect(() => {
    if (toasts.length === 0) return;
    const timeout = setTimeout(() => {
      setToasts((t) => t.slice(1));
    }, 4000);
    return () => clearTimeout(timeout);
  }, [toasts]);

  // Check if I'm already done (e.g. page reload)
  useEffect(() => {
    if (room.playersFinished?.includes(userId)) {
      setIsDone(true);
    }
  }, [room.playersFinished, userId]);

  const handleChange = (idx: number, v: string) => {
    const next = [...words]; next[idx] = v; setWords(next);
    const prev = saveTimer.current.get(idx);
    if (prev) clearTimeout(prev);
    const t = setTimeout(() => { saveAnswer(code, roundIdx, userId, idx, v).catch(() => {}); }, 400);
    saveTimer.current.set(idx, t);
  };

  const handleKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (idx < categories.length - 1) {
        inputRefs.current[idx + 1]?.focus();
      } else {
        doneButtonRef.current?.focus();
      }
    }
  };

  const handleDone = async () => {
    if (isDone) return;
    setIsDone(true);
    // Guardar todo primero
    await Promise.all(words.map((w, i) => saveAnswer(code, roundIdx, userId, i, w)));
    await playerDone(code, userId, players.length);
  };

  const timerActive = finishMs !== null;
  const finishedCount = (room.playersFinished || []).length;

  return (
    <div className="flex flex-col gap-4 flex-1 relative">
      {/* Toast notifications */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none w-[90vw] max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="bg-zinc-900/95 backdrop-blur border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-center animate-slide-down shadow-lg"
          >
            {t.text}
          </div>
        ))}
      </div>

      {/* Modificadores */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <Mod label="Letra" value={currentLetter || "?"} tone="accent" big />
        {config?.forbiddenLetterEnabled !== false && (
          <Mod label="Prohibida" value={forbiddenLetter || "—"} tone="danger" big />
        )}
        {config?.bonusLetterEnabled !== false && (
          <Mod label="Bonus" value={bonusLetter || "—"} tone="good" big />
        )}
      </div>

      {/* Timer dinámico grande */}
      {timerActive && (
        <div
          className={
            "rounded-xl p-3 text-center border transition-all " +
            (remaining !== null && remaining <= 6
              ? "bg-danger/20 border-danger/60 animate-pulse"
              : "bg-accent/10 border-accent/40")
          }
        >
          <div className="text-xs uppercase text-zinc-400">
            {finishedCount}/{players.length} han acabado
          </div>
          <div
            className={
              "text-5xl font-black tabular-nums " +
              (remaining !== null && remaining <= 6 ? "text-danger" : "text-accent")
            }
          >
            {remaining ?? FINISH_TIMER_SECONDS}s
          </div>
        </div>
      )}

      {/* Inputs por categoría */}
      <div className="flex flex-col gap-2">
        {categories.map((cat, i) => {
          const isMult = config?.multiplierEnabled !== false && i === multiplierCategoryIndex;
          return (
            <label key={i} className="flex flex-col gap-1">
              <span className={"text-xs uppercase " + (isMult ? "text-accent font-bold" : "text-zinc-500")}>
                {cat}{isMult && " ×2"}
              </span>
              <input
                ref={(el) => { inputRefs.current[i] = el; }}
                value={words[i]}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, i)}
                disabled={isDone}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                className={
                  "bg-panel rounded-lg px-3 py-2.5 outline-none border transition-colors " +
                  (isMult ? "border-accent/60" : "border-zinc-800") +
                  " focus:border-accent disabled:opacity-40"
                }
              />
            </label>
          );
        })}
      </div>

      {/* Botón ¡Hecho! */}
      {!isDone ? (
        <button
          ref={doneButtonRef}
          onClick={handleDone}
          className="mt-2 bg-good hover:bg-good/80 text-black font-bold rounded-xl py-4 text-xl transition-all active:scale-95"
        >
          ¡Hecho! ✅
        </button>
      ) : (
        <div className="mt-2 bg-zinc-800/50 border border-zinc-700 rounded-xl py-4 text-center">
          <div className="text-good font-bold text-lg">¡Listo! ✅</div>
          <div className="text-xs text-zinc-500 mt-1">Esperando al resto de jugadores…</div>
        </div>
      )}
    </div>
  );
}

function Mod({ label, value, tone, big }: { label: string; value: string; tone: "accent" | "danger" | "good"; big?: boolean }) {
  const color = tone === "accent" ? "text-accent" : tone === "danger" ? "text-danger" : "text-good";
  return (
    <div className="bg-panel rounded-lg py-2 px-1 border border-zinc-800">
      <div className="text-[10px] uppercase text-zinc-500">{label}</div>
      <div className={`${big ? "text-3xl" : "text-xl"} font-bold ${color}`}>{value}</div>
    </div>
  );
}
