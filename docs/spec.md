# Reglas del juego

## Ciclo de partida
1. **Lobby**: sala con código de 5 letras. Host crea, jugadores se unen.
2. **Setup custom** (`status: setup_custom`): el Host introduce una categoría inventada. Al enviar se generan letra principal, prohibida, bonus, y se elige la categoría multiplicadora al azar.
3. **Playing**: jugadores escriben contrarreloj. El primero en pulsar STOP deja 10 s al resto.
4. **Voting** (fase de juicio): 10 s por categoría para votar 👎. >50% en contra → palabra inválida.
5. **Scoreboard**: se muestra el recuento. Siguiente ronda o fin.

## Modificadores de ronda
- **Letra Principal**: todas las palabras empiezan por ella.
- **Letra Prohibida**: si aparece en la palabra → inválida (0 pts), automático.
- **Letra Bonus**: si aparece en la palabra → +3 pts.
- **Categoría Multiplicadora** (dorado/rojo): puntos ×2 en esa categoría.
- **Categoría Inventada**: la define el Host antes de la ronda; se añade al array estándar.

## Puntuación base
- Palabra única válida: **10**
- Palabra válida repetida: **5**
- Blanco/inválida: **0**

## Bonus de longitud ("El Empollón")
Por categoría, la palabra **válida** más larga suma **+5** extra. Empates: todas reciben el bonus.

## Orden de aplicación en `calculateScores()`
Por cada respuesta:
1. Si vacía → 0.
2. Si no empieza por letra principal → 0 (inválida).
3. Si contiene letra prohibida → 0 (inválida, automático, ignora votos).
4. Si votos en contra > 50% de votantes elegibles → 0 (inválida).
5. Base: 10 si única entre válidas de esa categoría, 5 si repetida.
6. +3 si contiene letra bonus.
7. ×2 si esa categoría es la multiplicadora (aplica sobre 5/6).
8. +5 si es la palabra válida más larga de la categoría (bonus de longitud, **después** del multiplicador).

Comparaciones de palabras: normalizar (lowercase, sin tildes, trim).
