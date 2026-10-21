# Tercios

Juego incremental de navegador: empiezas con un puñado de bisoños harapientos y acabas mandando un tercio viejo de élite. Sabor histórico, mecánica arcade.

**Jugar:** https://ponzgpt.github.io/tercios/

## Cómo se juega

1. **Ducados.** La paga llega sola cada segundo, también con la pestaña cerrada (hasta 8 h).
2. **Leva.** Compra reclutas (bisoños) con ducados.
3. **Armamento.** Convierte cada recluta en piquero o arcabucero. Cada unidad del mismo tipo cuesta un 15 % más que la anterior.
4. **Formación.** El poder del tercio depende de la **proporción** entre picas y arcabuces, no solo de cuántos tengas. La barra de formación muestra tu proporción, la ideal (marca dorada) y el bonus que obtienes.
5. **Mejoras.** Diez mejoras temáticas que cambian cómo se combinan picas y arcabuces (mangas, contramarcha, sargentos…). Cada victoria desbloquea más.
6. **Batallas.** La campaña de Flandes tiene tres batallas. Tú decides cuándo presentar batalla: con el poder enemigo la victoria es segura; por debajo del 60 % es imposible; entre medias, te la juegas. Una derrota cuesta un cuarto de la tropa.
7. **Licenciar el tercio (prestigio).** Al ganar la tercera batalla puedes reiniciar la campaña a cambio de **veteranía**: multiplica para siempre la paga y se gasta en mejoras permanentes. Cada vuelta es bastante más rápida que la anterior.

La partida se guarda sola cada 10 s y al cerrar la pestaña. Desde el panel «Partida» puedes exportarla como texto, importarla o borrarla.

## Desarrollo en local

Requiere Node.js 22.12 o superior.

```bash
npm install      # instala dependencias
npm run dev      # servidor local en http://localhost:5173/tercios/
npm run check    # lint + tests + build (lo mismo que CI)
```

Otros scripts: `npm test`, `npm run lint`, `npm run format`, `npm run build`, `npm run preview`.

## Estructura

- `src/core/` — lógica del juego, pura y testeada (sin DOM ni reloj del sistema).
  - `balance.ts` — **todas** las constantes de balance y el contenido (mejoras, batallas, tienda).
  - `economy.ts` — costes, poder, proporción, paga y compras.
  - `campaign.ts` — batallas y prestigio.
  - `offline.ts`, `save.ts` — progreso offline y guardado versionado.
  - `sim.ts` — jugador automático que usan los tests para vigilar el ritmo del balance.
- `src/ui/` — interfaz DOM, bucle de juego y localStorage.
- `docs/DESIGN.md` — decisiones de diseño y cuestiones abiertas.
- `docs/HISTORICAL_NOTES.md` — qué es historia y qué es licencia creativa.

## Despliegue

Cada push a `main` ejecuta `.github/workflows/deploy.yml`: `npm ci`, lint, tests y build. Si todo pasa, publica `dist/` en GitHub Pages. Si falla algo, no se despliega.

## Licencia

[MIT](LICENSE)
