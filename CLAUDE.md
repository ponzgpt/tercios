# tercios

Juego incremental de navegador sobre los tercios españoles (Vite + TS, DOM vanilla). Live: https://ponzgpt.github.io/tercios/

## Commands

- Check (before every commit and deploy): `npm run check`
- Dev: `npm run dev`
- Deploy: push a `main` (GitHub Actions → GitHub Pages; solo despliega si pasa el check)

## Non-negotiables

1. `src/core/` es puro: sin DOM, sin `Date.now()`, sin `Math.random()`; tiempo y azar entran por parámetro. Así se testea y se simula el offline.
2. Todo número de balance vive en `src/core/balance.ts`. Nada de constantes mágicas en la lógica o la UI.
3. Toda lógica nueva en `src/core/` llega con su test. El test de `campaign.test.ts` que usa el bot (`sim.ts`) vigila el ritmo: si cambias el balance y falla, ajusta números, no el test.
4. Cambiar la forma de `GameState` exige subir `SAVE_VERSION` y añadir la migración en `save.ts` con su test: hay partidas de jugadores en localStorage.
5. Mejoras temáticas que dependan de la proporción pica/arcabuz; nada de «+X % genérico» (docs/DESIGN.md, D4).
6. Toda afirmación histórica nueva va a `docs/HISTORICAL_NOTES.md` como hecho o licencia creativa.
7. UI, textos y commits en español. Commits pequeños.
8. Decisiones D1–D7 de `docs/DESIGN.md` están cerradas: propón cambios antes de hacerlos.
