# Lápiz 🎮✏️

Tutti Frutti / Stop / Basta online y multijugador. Next.js + Firebase.

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # rellena con tus claves Firebase
npm run dev
```

Abre `http://localhost:3000`.

## Configurar Firebase

1. Crea proyecto en https://console.firebase.google.com
2. Activa **Authentication → Anonymous**.
3. Crea **Firestore Database** (modo test o prod con las reglas de `firestore.rules`).
4. Registra una app Web, copia las claves a `.env.local`.
5. Publica las reglas:
   ```bash
   npx firebase-tools deploy --only firestore:rules
   ```
   (o pega el contenido en Firestore → Rules desde la consola)

## Deploy (Vercel)

1. Sube el repo a GitHub.
2. Importa en https://vercel.com → detecta Next.js.
3. Añade las 6 variables `NEXT_PUBLIC_FIREBASE_*` en Project Settings.
4. Deploy.

## Estructura

- `src/app/` — rutas App Router.
- `src/components/game/` — `SetupCustom`, `Playing`, `Voting`, `Scoreboard`.
- `src/game/` — lógica pura (letras, scoring, tipos). Sin Firebase.
- `src/lib/` — Firebase init, rooms, round actions.
- `src/hooks/` — `useAnonAuth`, `useRoom`, `useRound`.
- `docs/` — spec de reglas, modelo de datos, progreso.
