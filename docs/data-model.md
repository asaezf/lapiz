# Modelo de datos Firestore

## `rooms/{roomId}`
```
{
  code: string,              // 5 letras mayúsculas = roomId
  hostId: string,            // uid del host
  status: "lobby" | "setup_custom" | "playing" | "voting" | "scoreboard" | "finished",
  currentRound: number,      // 0, 1, 2...
  currentLetter: string | null,
  forbiddenLetter: string | null,
  bonusLetter: string | null,
  categories: string[],      // estándar + último = custom
  multiplierCategoryIndex: number | null,
  stopCalledBy: string | null,       // uid
  stopCalledAt: Timestamp | null,    // serverTimestamp()
  votingEndsAt: Timestamp | null,
  createdAt: Timestamp
}
```

## `rooms/{roomId}/players/{playerId}`
```
{ nickname: string, score: number, isReady: boolean, joinedAt: Timestamp }
```
`playerId` = uid de Firebase Auth.

## `rooms/{roomId}/rounds/{roundId}`
`roundId` = `round_${currentRound}`.
```
{
  letter: string,
  forbiddenLetter: string,
  bonusLetter: string,
  categories: string[],
  multiplierCategoryIndex: number,
  stoppedBy: string,
  startedAt: Timestamp,
  scoresApplied: boolean
}
```

### `rooms/{roomId}/rounds/{roundId}/answers/{playerId}`
```
{
  words: { [categoryIndex: number]: { word: string, votesAgainst: string[], isValid: boolean, points: number } }
}
```
`votesAgainst` = array de uids que votaron 👎 (permite contar sin duplicados).
`isValid` y `points` se rellenan al cierre de voting.

## Categorías estándar (pool inicial)
`["Nombre", "Apellido", "Animal", "Ciudad", "País", "Comida", "Objeto", "Color", "Marca", "Película"]`
Por ronda se eligen 5 al azar + la custom del host.
