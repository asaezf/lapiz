# Progreso

Leer este archivo al empezar sesión. Marcar `[x]` al completar.

## Paso 1 — Setup
- [x] package.json, tsconfig, tailwind, postcss, next.config
- [x] .gitignore, .env.example
- [x] docs (spec, data-model, progress)
- [x] CLAUDE.md / AGENTS.md
- [x] src/lib/firebase.ts
- [x] src/game/types.ts
- [x] src/app/layout.tsx + globals.css
- [x] src/app/page.tsx (landing placeholder)
- [x] `npm install` ejecutado por el usuario
- [ ] Proyecto Firebase creado + .env.local rellenado por el usuario

## Paso 2 — Auth + Lobby
- [x] Hook `useAnonAuth`
- [x] `lib/rooms.ts`: createRoom, joinRoom, addPlayer, **updateRoomConfig**
- [x] Hook `useRoom` (onSnapshot room + players)
- [x] Landing: form nickname + crear/unirse por código
- [x] `/room/[id]`: lista de jugadores en tiempo real, botón "Empezar" (host, min 2 jugadores)
- [x] Re-join automático si recargas la página
- [x] **LobbyConfig**: panel de configuración del host (prohibida/bonus/mult/categorías/rondas)

## Paso 3 — Setup de ronda
- [x] `game/letters.ts`: generación letra/prohibida/bonus, elegir multiplicadora, **15 categorías**
- [x] `lib/round.ts`: startRound, saveAnswer, **playerDone**, moveToVoting, applyScores, nextRound, **openCustomSetup**, **restartGame**
- [x] Vista `setup_custom` (host input → playing) **con rotación de proponente**

## Paso 4 — Playing view
- [x] Inputs mobile-first por categoría, autosave con debounce
- [x] Modificadores en cabecera (letra, prohibida, bonus, multiplicadora ×2) **condicionales según config**
- [x] **Botón "¡Hecho!" individual** + timer dinámico 20s (host avanza a voting)
- [x] **Confeti al primero en acabar**
- [x] **Toast notifications** cuando otros acaban
- [x] **Enter salta al siguiente input**
- [x] **Vibración últimos 6 segundos**

## Paso 5 — Voting + Scoring
- [x] UI de votación con **👍/👎** por categoría, tachado en vivo
- [x] **Instrucciones de puntuación y votación** en pantalla de votación
- [x] **Timer 90 segundos** para votar
- [x] `game/scoring.ts` con `calculateScores()` (puro, testeable) **con votesFor/votesAgainst**
- [x] Host aplica scores al expirar timer → estado `scoreboard`
- [x] Scoreboard con detalle expandible + siguiente ronda
- [x] **Pantalla de fin de partida** con ranking, medallas y "Nueva partida"

## Paso 6 — Deploy
- [x] `firestore.rules` (host controla room/round; jugador solo sus respuestas)
- [x] README con pasos Vercel + Firebase
- [ ] Probar beta con amigos y deployar en Vercel

## Decisiones vivas
- Nombre del paquete: `lapiz`
- Categorías estándar: Nombre, Apellido, Animal, Ciudad, País, Comida, Bebida, Objeto, Marca, Película, Serie, Cantante o Grupo, Profesión, Parte del cuerpo, Famoso
