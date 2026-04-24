# LAPIZ — contexto para el agente

App web multijugador en tiempo real tipo Tutti Frutti / Stop / Basta con mecánicas custom.

## Stack
- Next.js 14 (App Router) + TypeScript
- Tailwind (darkMode class, tema en `tailwind.config.ts`)
- Firebase: Firestore (tiempo real) + Anonymous Auth
- Deploy: Vercel
- Sin IA. Todo el peso: sincronización Firestore + votación entre jugadores.

## Convenciones
- Código en **inglés** (variables, componentes, funciones).
- UI en **español de España**.
- Lógica pura de juego en `src/game/` (sin Firebase → testeable).
- Firestore y hooks en `src/lib/` y `src/hooks/`.
- Componentes por feature: `src/components/{lobby,game,voting}/`.
- Path alias: `@/*` → `./src/*`.
- Mobile-first. Inputs siempre con `autoComplete="off" spellCheck="false"`.
- Modo oscuro por defecto.

## Reglas del juego
Ver `docs/spec.md` (fuente única de verdad).

## Modelo de datos
Ver `docs/data-model.md`.

## Estado del proyecto
Ver `docs/progress.md` — checklist 6 pasos. Leer **este** archivo al empezar cualquier sesión.

## Economía de tokens
- No releer archivos si `progress.md` basta.
- No reformatear código existente sin motivo.
- Cambios atómicos por paso del plan.

## Trabajo en paralelo con Antigravity
Antigravity usa el mismo repo. `AGENTS.md` replica este documento.
Features aisladas por carpeta para evitar conflictos de merge.
