"use client";
import { useState } from "react";
import type { RoomConfig } from "@/game/types";
import { updateRoomConfig } from "@/lib/rooms";

interface Props {
  code: string;
  config: RoomConfig;
}

export function LobbyConfig({ code, config }: Props) {
  const [busy, setBusy] = useState(false);

  const toggle = async (key: keyof RoomConfig, value: boolean) => {
    setBusy(true);
    try { await updateRoomConfig(code, { [key]: value }); } finally { setBusy(false); }
  };

  const setNumber = async (key: keyof RoomConfig, value: number) => {
    setBusy(true);
    try { await updateRoomConfig(code, { [key]: value }); } finally { setBusy(false); }
  };

  return (
    <div className="bg-panel rounded-xl p-4 border border-zinc-800 flex flex-col gap-4">
      <h3 className="text-xs uppercase tracking-wide text-zinc-500 font-semibold">Configuración</h3>

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
        description="Palabras con esta letra → +3 pts"
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

      <div className="h-px bg-zinc-800" />

      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">Categorías por ronda</div>
          <div className="text-xs text-zinc-500">Estándar + 1 inventada</div>
        </div>
        <div className="flex gap-1">
          {[3, 4, 5, 6, 7, 8].map((n) => (
            <button
              key={n}
              onClick={() => setNumber("categoriesPerRound", n)}
              disabled={busy}
              className={
                "w-9 h-9 rounded-lg text-sm font-bold transition-all " +
                (config.categoriesPerRound === n
                  ? "bg-accent text-black"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700")
              }
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">Número de rondas</div>
        </div>
        <div className="flex gap-1">
          {[3, 5, 10].map((n) => (
            <button
              key={n}
              onClick={() => setNumber("totalRounds", n)}
              disabled={busy}
              className={
                "px-4 h-9 rounded-lg text-sm font-bold transition-all " +
                (config.totalRounds === n
                  ? "bg-accent text-black"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700")
              }
            >
              {n}
            </button>
          ))}
        </div>
      </div>
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
