"use client";
import { useEffect, useRef, useState } from "react";
import { playerDone, moveToVoting, saveAnswer, FINISH_TIMER_SECONDS } from "@/lib/round";
import type { Room, Player } from "@/game/types";
import { Tutorial } from "@/components/game/Tutorial";
import confetti from "canvas-confetti";

interface Props {
  code: string;
  room: Room;
  userId: string;
  isHost: boolean;
  players: Array<Player & { id: string }>;
}

interface Toast { id: number; text: string; }

let toastId = 0;

export function Playing({ code, room, userId, isHost, players }: Props) {
  const { categories, currentLetter, forbiddenLetter, bonusLetter, multiplierCategoryIndex } = room;
  const config = room.config;
  const roundIdx = room.currentRound;
  const mode = config?.gameMode ?? "dynamic";
  const isClassic = mode === "classic";

  const [words, setWords] = useState<string[]>(() => categories.map(() => ""));
  const [remaining, setRemaining] = useState<number | null>(null);
  const [isDone, setIsDone] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showTutorial, setShowTutorial] = useState(false);
  const [stopOverlay, setStopOverlay] = useState<string | null>(null);

  // Tutorial en primera ronda
  useEffect(() => {
    if (typeof window === "undefined" || room.currentRound !== 1) return;
    const key = `lapiz_tut_${mode}`;
    if (!localStorage.getItem(key)) setShowTutorial(true);
  }, [room.currentRound, mode]);

  const dismissTutorial = () => {
    try { localStorage.setItem(`lapiz_tut_${mode}`, "1"); } catch {}
    setShowTutorial(false);
  };

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const doneButtonRef = useRef<HTMLButtonElement | null>(null);
  const saveTimer = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const movedRef = useRef(false);
  const confettiFired = useRef(false);
  const prevFinished = useRef<string[]>([]);
  const vibratingRef = useRef(false);
  const stopOverlayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // *** Reset al cambiar de ronda — evita que aparezcan respuestas de rondas anteriores ***
  useEffect(() => {
    setWords(categories.map(() => ""));
    setIsDone(false);
    setRemaining(null);
    setToasts([]);
    setStopOverlay(null);
    movedRef.current = false;
    confettiFired.current = false;
    prevFinished.current = [];
    vibratingRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIdx]);

  // Timer dinámico
  const finishMs = room.finishTimerEndsAt ? (room.finishTimerEndsAt as any).toMillis() : null;
  useEffect(() => {
    if (!finishMs) { setRemaining(null); return; }
    const tick = () => {
      const left = Math.max(0, Math.ceil((finishMs - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 6 && left > 0 && !vibratingRef.current) {
        vibratingRef.current = true;
        try { navigator.vibrate?.([200, 100, 200]); } catch {}
      }
      if (left > 6) vibratingRef.current = false;
      if (left <= 6 && left > 0) { try { navigator.vibrate?.(150); } catch {} }
      if (left === 0 && isHost && !movedRef.current) {
        movedRef.current = true;
        moveToVoting(code, roundIdx).catch(() => { movedRef.current = false; });
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [finishMs, code, roundIdx, isHost]);

  // Avanzar a voting
  useEffect(() => {
    const finished = room.playersFinished || [];
    if (!isHost || movedRef.current) return;
    const trigger = isClassic
      ? finished.length >= 1
      : finished.length > 0 && finished.length >= players.length;
    if (trigger) {
      movedRef.current = true;
      setTimeout(() => {
        moveToVoting(code, roundIdx).catch(() => { movedRef.current = false; });
      }, isClassic ? 600 : 0);
    }
  }, [room.playersFinished, players.length, isHost, code, roundIdx, isClassic]);

  // Confeti: primer jugador en acabar, si soy yo
  useEffect(() => {
    if (room.stopCalledBy === userId && !confettiFired.current && room.playersFinished?.includes(userId)) {
      confettiFired.current = true;
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ["#f5c518", "#22c55e", "#ef4444", "#ffffff"] });
    }
  }, [room.stopCalledBy, room.playersFinished, userId]);

  // Overlay STOP para los demás (modo clásico)
  useEffect(() => {
    if (!isClassic || !room.stopCalledBy || room.stopCalledBy === userId) return;
    const name = players.find((p) => p.id === room.stopCalledBy)?.nickname || "Alguien";
    setStopOverlay(name);
    if (stopOverlayTimer.current) clearTimeout(stopOverlayTimer.current);
    stopOverlayTimer.current = setTimeout(() => setStopOverlay(null), 5000);
    return () => { if (stopOverlayTimer.current) clearTimeout(stopOverlayTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.stopCalledBy]);

  // Toasts cuando otros acaban
  useEffect(() => {
    const finished = room.playersFinished || [];
    const prev = prevFinished.current;
    for (const pid of finished) {
      if (!prev.includes(pid) && pid !== userId) {
        const name = players.find((p) => p.id === pid)?.nickname || "???";
        const isFirst = finished.indexOf(pid) === 0 && prev.length === 0;
        const text = isClassic
          ? `🛑 ¡${name} ha pulsado STOP!`
          : isFirst ? `🏁 ¡${name} ha acabado primero!` : `⚡ ${name} ha acabado (−4s)`;
        setToasts((t) => [...t, { id: ++toastId, text }]);
      }
    }
    prevFinished.current = [...finished];
  }, [room.playersFinished, userId, players, isClassic]);

  useEffect(() => {
    if (toasts.length === 0) return;
    const t = setTimeout(() => setToasts((t) => t.slice(1)), 4000);
    return () => clearTimeout(t);
  }, [toasts]);

  useEffect(() => {
    if (room.playersFinished?.includes(userId)) setIsDone(true);
  }, [room.playersFinished, userId]);

  const handleChange = (idx: number, v: string) => {
    const next = [...words]; next[idx] = v; setWords(next);
    const prev = saveTimer.current.get(idx);
    if (prev) clearTimeout(prev);
    const t = setTimeout(() => { saveAnswer(code, roundIdx, userId, idx, v).catch(() => {}); }, 400);
    saveTimer.current.set(idx, t);
  };

  const handleKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (idx < categories.length - 1) inputRefs.current[idx + 1]?.focus();
    else doneButtonRef.current?.focus();
  };

  const handleDone = async () => {
    if (isDone) return;
    setIsDone(true);
    await Promise.all(words.map((w, i) => saveAnswer(code, roundIdx, userId, i, w)));
    await playerDone(code, userId, players.length);
  };

  const timerActive = finishMs !== null;
  const finishedCount = (room.playersFinished || []).length;
  const someoneStopped = isClassic && finishedCount >= 1;
  const inputsDisabled = isDone || someoneStopped;

  return (
    <div className="flex flex-col gap-4 flex-1 relative">
      {showTutorial && config && <Tutorial config={config} onDismiss={dismissTutorial} />}

      {/* Overlay pantalla completa al pulsar STOP otro jugador */}
      {stopOverlay && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center text-center px-6">
          <div className="text-8xl mb-5 animate-bounce">🐢</div>
          <div className="text-4xl font-black text-danger leading-tight mb-4">
            ¡¡QUIETOS<br />ESOS DEDOS!!
          </div>
          <div className="text-2xl text-zinc-100 font-bold">
            {stopOverlay} ha acabado ya
          </div>
          <div className="text-zinc-500 mt-3 text-base">ya no puedes escribir 🐢</div>
        </div>
      )}

      {/* Toasts */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 flex flex-col gap-2 pointer-events-none w-[90vw] max-w-sm">
        {toasts.map((t) => (
          <div key={t.id} className="bg-zinc-900/95 backdrop-blur border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-center animate-slide-down shadow-lg">
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

      {/* Timer dinámico */}
      {timerActive && (
        <div className={"rounded-xl p-3 text-center border transition-all " + (remaining !== null && remaining <= 6 ? "bg-danger/20 border-danger/60 animate-pulse" : "bg-accent/10 border-accent/40")}>
          <div className="text-xs uppercase text-zinc-400">{finishedCount}/{players.length} han acabado</div>
          <div className={"text-5xl font-black tabular-nums " + (remaining !== null && remaining <= 6 ? "text-danger" : "text-accent")}>
            {remaining ?? FINISH_TIMER_SECONDS}s
          </div>
        </div>
      )}

      {/* Inputs */}
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
                disabled={inputsDisabled}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                className={"bg-panel rounded-lg px-3 py-2.5 outline-none border transition-colors " + (isMult ? "border-accent/60" : "border-zinc-800") + " focus:border-accent disabled:opacity-40"}
              />
            </label>
          );
        })}
      </div>

      {/* Botón principal */}
      {someoneStopped && !isDone ? (
        <div className="mt-2 bg-danger/10 border border-danger/40 rounded-xl py-4 text-center animate-pulse">
          <div className="text-danger font-bold text-lg">🛑 ¡STOP!</div>
          <div className="text-xs text-zinc-400 mt-1">Pasando a votación…</div>
        </div>
      ) : !isDone ? (
        <button
          ref={doneButtonRef}
          onClick={handleDone}
          className={"mt-2 font-bold rounded-xl py-4 text-xl transition-all active:scale-95 " + (isClassic ? "bg-danger hover:bg-danger/80 text-white" : "bg-good hover:bg-good/80 text-black")}
        >
          {isClassic ? "🛑 STOP" : "¡Hecho! ✅"}
        </button>
      ) : (
        <div className="mt-2 bg-zinc-800/50 border border-zinc-700 rounded-xl py-4 text-center">
          <div className="text-good font-bold text-lg">{isClassic ? "🛑 STOP pulsado" : "¡Listo! ✅"}</div>
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
