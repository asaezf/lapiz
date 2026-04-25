"use client";
import { useState } from "react";
import type { RoomConfig, GameMode } from "@/game/types";
import { updateRoomConfig } from "@/lib/rooms";
import { STANDARD_CATEGORIES } from "@/game/letters";

interface Props {
  code: string;
  config: RoomConfig;
}

const MIN_CATEGORIES = 5;
const MIN_ROUNDS = 3;
const MAX_ROUNDS = 10;

export function LobbyConfig({ code, config }: Props) {
  const [busy, setBusy] = useState(false);

  const update = async (patch: Partial<RoomConfig>) => {
    setBusy(true);
    try { await updateRoomConfig(code, patch); } finally { setBusy(false); }
  };

  const toggle = (key: keyof RoomConfig, value: boolean) => update({ [key]: value });
  const setMode = (mode: GameMode) => update({ gameMode: mode });

  const mode: GameMode = config.gameMode ?? "dynamic";
  const customOn = config.customCategoryEnabled !== false;
  const maxCategories = STANDARD_CATEGORIES.length + (customOn ? 1 : 0);

  const currentCats = Math.max(MIN_CATEGORIES, Math.min(config.categoriesPerRound ?? 5, maxCategories));
  const currentRounds = Math.max(MIN_ROUNDS, Math.min(config.totalRounds ?? 5, MAX_ROUNDS));

  const changeCategories = (delta: number) => {
    const next = Math.max(MIN_CATEGORIES, Math.min(currentCats + delta, maxCategories));
    if (next !== currentCats) update({ categoriesPerRound: next });
  };

  const changeRounds = (delta: number) => {
    const next = Math.max(MIN_ROUNDS, Math.min(currentRounds + delta, MAX_ROUNDS));
    if (next !== currentRounds) update({ totalRounds: next });
  };

  const toggleCustom = (v: boolean) => {
    // Si desactivas custom y tenías 16 categorías, baja a 15.
    const newMax = STANDARD_CATEGORIES.length + (v ? 1 : 0);
    const clamped = Math.min(currentCats, newMax);
    if (clamped !== currentCats) {
      update({ customCategoryEnabled: v, categoriesPerRound: clamped });
    } else {
      update({ customCategoryEnabled: v });
    }
  };

  return (
    <div className="bg-panel rounded-xl p-4 border border-zinc-800 flex flex-col gap-4">
      <h3 className="text-xs uppercase tracking-wide text-zinc-500 font-semibold">Configuración</h3>

      {/* Modo de juego */}
      <div className="flex flex-col gap-2">
        <div className="text-sm font-medium">Modo de juego</div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setMode("dynamic")}
            disabled={busy}
            className={
              "rounded-lg p-3 text-left border transition-all " +
              (mode === "dynamic"
                ? "bg-accent/10 border-accent text-accent"
                : "bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-500")
            }
          >
            <div className="font-bold text-sm">⚡ Dinámico</div>
            <div className="text-xs mt-0.5 opacity-80">El primero acaba → 20s. Cada uno que acaba resta 4s.</div>
          </button>
          <button
            onClick={() => setMode("classic")}
            disabled={busy}
            className={
              "rounded-lg p-3 text-left border transition-all " +
              (mode === "classic"
                ? "bg-accent/10 border-accent text-accent"
                : "bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-500")
            }
          >
            <div className="font-bold text-sm">🛑 Clásico</div>
            <div className="text-xs mt-0.5 opacity-80">El primero pulsa STOP → todos paran al instante.</div>
          </button>
        </div>
      </div>

      <div className="h-px bg-zinc-800" />

      {/* Modificadores */}
      <ToggleRow
        label="Letra prohibida"
        description="Palabras con esta letra → 0 pts"
        checked={config.forbiddenLetterEnabled}
        onChange={(v) => toggle("forbiddenLetterEnabled", v)}
        disabled={busy}
        tone="danger"
      />
      <ToggleRow
        label="Letra bonus"
        description="Palabras con esta letra → +1 pt extra"
        checked={config.bonusLetterEnabled}
        onChange={(v) => toggle("bonusLetterEnabled", v)}
        disabled={busy}
        tone="good"
      />
      <ToggleRow
        label="Categoría ×2"
        description="Una categoría aleatoria puntúa doble"
        checked={config.multiplierEnabled}
        onChange={(v) => toggle("multiplierEnabled", v)}
        disabled={busy}
        tone="accent"
      />
      <ToggleRow
        label="Palabra más larga"
        description="La palabra válida más larga de cada categoría: +1 pt"
        checked={config.longestWordBonusEnabled ?? true}
        onChange={(v) => toggle("longestWordBonusEnabled", v)}
        disabled={busy}
        tone="accent"
      />
      <ToggleRow
        label="Categoría inventada"
        description="Cada ronda, un jugador propone una categoría (turno rotando)"
        checked={customOn}
        onChange={toggleCustom}
        disabled={busy}
        tone="accent"
      />

      <div className="h-px bg-zinc-800" />

      {/* Categorías por ronda */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1">
            <div className="text-sm font-medium">Categorías por ronda</div>
            <div className="text-xs text-zinc-500">
              Min {MIN_CATEGORIES} · Máx {maxCategories}
              {customOn && " (15 estándar + 1 inventada)"}
            </div>
          </div>
          <Counter
            value={currentCats}
            onDec={() => changeCategories(-1)}
            onInc={() => changeCategories(+1)}
            disabled={busy}
            canDec={currentCats > MIN_CATEGORIES}
            canInc={currentCats < maxCategories}
          />
        </div>
        <div className="text-[11px] text-zinc-500 leading-snug bg-zinc-900/40 border border-zinc-800 rounded-lg px-3 py-2">
          ℹ️ Las categorías son <span className="text-zinc-300">aleatorias del banco</span> y cambian cada ronda. Solo eliges <span className="text-zinc-300">cuántas</span> habrá.
        </div>
      </div>

      {/* Número de rondas */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <div className="text-sm font-medium">Número de rondas</div>
          <div className="text-xs text-zinc-500">Entre {MIN_ROUNDS} y {MAX_ROUNDS}</div>
        </div>
        <Counter
          value={currentRounds}
          onDec={() => changeRounds(-1)}
          onInc={() => changeRounds(+1)}
          disabled={busy}
          canDec={currentRounds > MIN_ROUNDS}
          canInc={currentRounds < MAX_ROUNDS}
        />
      </div>
    </div>
  );
}

function Counter({
  value, onDec, onInc, disabled, canDec, canInc,
}: {
  value: number;
  onDec: () => void;
  onInc: () => void;
  disabled: boolean;
  canDec: boolean;
  canInc: boolean;
}) {
  return (
    <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
      <button
        onClick={onDec}
        disabled={disabled || !canDec}
        className="w-8 h-8 rounded-md bg-zinc-800 text-lg font-bold text-zinc-300 hover:bg-zinc-700 disabled:opacity-30 disabled:hover:bg-zinc-800 transition-colors"
        aria-label="Reducir"
      >
        −
      </button>
      <div className="w-8 text-center font-bold text-accent tabular-nums">{value}</div>
      <button
        onClick={onInc}
        disabled={disabled || !canInc}
        className="w-8 h-8 rounded-md bg-zinc-800 text-lg font-bold text-zinc-300 hover:bg-zinc-700 disabled:opacity-30 disabled:hover:bg-zinc-800 transition-colors"
        aria-label="Aumentar"
      >
        +
      </button>
    </div>
  );
}

function ToggleRow({
  label, description, checked, onChange, disabled, tone,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled: boolean;
  tone: "danger" | "good" | "accent";
}) {
  const bgOn = tone === "danger" ? "bg-danger" : tone === "good" ? "bg-good" : "bg-accent";
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-zinc-500">{description}</div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className={
          "relative w-12 h-7 rounded-full transition-colors flex-shrink-0 " +
          (checked ? bgOn : "bg-zinc-700")
        }
        aria-label={`${label} ${checked ? "activado" : "desactivado"}`}
      >
        <span
          className={
            "absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform " +
            (checked ? "translate-x-5" : "translate-x-0")
          }
        />
      </button>
    </div>
  );
}
