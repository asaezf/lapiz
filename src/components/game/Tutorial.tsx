"use client";
import type { RoomConfig } from "@/game/types";

interface Props {
  config: RoomConfig;
  onDismiss: () => void;
}

export function Tutorial({ config, onDismiss }: Props) {
  const isDynamic = (config.gameMode ?? "dynamic") === "dynamic";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-slide-down">
      <div className="bg-panel border border-zinc-700 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-5 flex flex-col gap-4 shadow-2xl">

        {/* Encabezado modo */}
        <div className="text-center">
          <div className="text-3xl mb-1">{isDynamic ? "⚡" : "🛑"}</div>
          <h2 className="text-xl font-bold">
            Modo {isDynamic ? "Dinámico" : "Clásico"}
          </h2>
          <p className="text-xs text-zinc-500 mt-1">Vamos a empezar — léete esto rapidito.</p>
        </div>

        {/* Cómo funciona el modo */}
        <section className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3">
          <h3 className="text-sm font-bold text-accent mb-2">⏱️ Cómo funciona el tiempo</h3>
          {isDynamic ? (
            <ul className="text-sm text-zinc-300 space-y-1.5 list-disc list-inside">
              <li>Cuando <strong>el primero</strong> acaba, salta un cronómetro de <strong>20 s</strong> para el resto.</li>
              <li>Cada vez que <strong>otro jugador acaba</strong>, se restan <strong>4 s</strong> al cronómetro.</li>
              <li>Al llegar a 0 s o cuando todos hayan acabado, pasa a votación.</li>
              <li>El móvil <strong>vibra</strong> en los últimos 6 segundos.</li>
              <li><strong>Bonus por acabar pronto:</strong> el 1º suma <strong className="text-good">+2 pts</strong> y el 2º <strong className="text-good">+1 pt</strong> a su ronda.</li>
            </ul>
          ) : (
            <ul className="text-sm text-zinc-300 space-y-1.5 list-disc list-inside">
              <li>Cuando <strong>alguien pulsa STOP</strong>, todos paran al instante.</li>
              <li>Lo que tengas escrito en ese momento es lo que cuenta.</li>
              <li>Pasa directamente a la fase de votación.</li>
              <li>Sin bonus por acabar primero — todo va al pulso.</li>
            </ul>
          )}
        </section>

        {/* Cómo se puntúa */}
        <section className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3">
          <h3 className="text-sm font-bold text-accent mb-2">💰 Cómo se puntúa</h3>
          <ul className="text-sm text-zinc-300 space-y-1.5 list-disc list-inside">
            <li>Palabra <strong>única</strong> (solo tú la has puesto): <strong className="text-good">2 pts</strong></li>
            <li>Palabra <strong>repetida</strong> (alguien más la puso): <strong className="text-good">1 pt</strong></li>
            {config.longestWordBonusEnabled !== false && (
              <li>Palabra <strong>más larga</strong> válida de la categoría: <strong className="text-good">+1 pt</strong></li>
            )}
            {config.bonusLetterEnabled !== false && (
              <li>Contiene la <strong className="text-good">letra bonus</strong>: <strong className="text-good">+1 pt</strong></li>
            )}
            {config.multiplierEnabled !== false && (
              <li>Categoría <strong className="text-accent">×2</strong>: los puntos se duplican.</li>
            )}
            {config.forbiddenLetterEnabled !== false && (
              <li>Contiene la <strong className="text-danger">letra prohibida</strong>: <strong className="text-danger">0 pts</strong> (automático)</li>
            )}
            <li>Mayoría de <strong className="text-danger">👎</strong> en votación: <strong className="text-danger">0 pts</strong></li>
          </ul>
        </section>

        {/* Ejemplo */}
        <section className="bg-accent/5 border border-accent/30 rounded-xl p-3 text-xs text-zinc-400">
          <strong className="text-accent">Ejemplo:</strong> palabra única (2) + más larga (+1) en categoría ×2 = <strong className="text-accent">6 pts</strong>.
        </section>

        <button
          onClick={onDismiss}
          className="bg-accent text-black font-bold rounded-xl py-3.5 text-base transition-all active:scale-95 mt-1"
        >
          ¡Entendido, vamos! 🚀
        </button>
      </div>
    </div>
  );
}
