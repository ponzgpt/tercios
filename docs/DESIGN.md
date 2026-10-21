# Diseño

## Decisiones cerradas

|                      | Decisión                                                                                                                                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **D1 Género**        | Juego incremental. Se progresa desde bisoños harapientos hasta un tercio de élite con todo mejorado.                                                                                                    |
| **D2 Progresión**    | Cada campaña es una capa de prestigio. Al ganar la batalla final todo se resetea salvo la **veteranía**, que acelera la reconstrucción. Cada prestigio hace la siguiente campaña claramente más rápida. |
| **D3 Ritmo**         | Híbrido. Los recursos se acumulan solos (también offline, máx. 8 h); las decisiones son activas: compras, proporción picas/arcabuces y cuándo presentar batalla.                                        |
| **D4 Eje de diseño** | La sinergia pica/arcabuz es el corazón de las mejoras. La eficacia depende de la proporción, no solo de la cantidad. Prohibidas las mejoras «+X % genérico» sin conexión temática.                      |
| **D5 Tono**          | Sabor histórico, mecánica arcade. Términos de época en la UI. Toda afirmación histórica va a `HISTORICAL_NOTES.md`, marcada como hecho o licencia creativa.                                             |
| **D6 UI**            | Interfaz textual/DOM con CSS cuidado, sin assets de arte. Responsive. En español.                                                                                                                       |
| **D7 Licencia**      | MIT.                                                                                                                                                                                                    |

## Stack

- Vite + TypeScript estricto, DOM vanilla, sin framework ni motor.
- `src/core/` puro: sin DOM ni `Date.now()`; el tiempo y el azar se inyectan. ESLint lo vigila.
- Bucle de paso fijo (100 ms) con acumulador sobre `requestAnimationFrame`. Una pausa de más de 5 s (pestaña oculta) se trata como tiempo offline.
- Guardado en localStorage con esquema versionado y migraciones (`src/core/save.ts`); autosave cada 10 s y al ocultar o cerrar la pestaña; exportar/importar en base64; reinicio duro con confirmación.
- Vitest sobre `src/core/`; ESLint + Prettier; GitHub Actions → GitHub Pages.

## Modelo de juego (MVP)

- **Poder** = Σ(unidades × poder por unidad) × (1 + bonus de proporción) × maestre de campo.
- **Bonus de proporción** = bonus máximo × max(0, 1 − |fracción de arcabuces − ideal| / tolerancia). Ideal inicial 1/3 (dos picas por arcabuz); con contramarcha, 1/2.
- **Paga** = (base + por unidad × unidades) × 1.75^victorias × veteranía.
- **Batalla**: probabilidad de victoria = (poder/enemigo − 0.6) / 0.4, acotada a [0, 1].
- **Veteranía** = ⌊√(poder máximo / 200)⌋. Cada punto ganado suma +0.5 al multiplicador de producción; los puntos se gastan además en la tienda permanente.
- **Ritmo medido** (bot de `sim.ts`, juego activo óptimo): campaña 1 ≈ 25 min, campaña 2 ≈ 9 min, campaña 3 ≈ 5 min. Un test falla si la primera campaña sale de 15–35 min o si el prestigio deja de acelerar.

## Mejoras y su relación con la sinergia

| Mejora                   | Efecto                                    | Relación con D4                              |
| ------------------------ | ----------------------------------------- | -------------------------------------------- |
| Instrucción de picas     | piqueros ×2                               | Refuerza un lado del binomio                 |
| Pólvora de mejor calidad | arcabuceros ×2                            | Refuerza el otro lado                        |
| Pagadores del ejército   | paga por soldado ×2                       | Economía ligada al tamaño del tercio         |
| Mangas de arcabuceros    | arcabucero +300 % × fracción de picas     | Los arcabuces valen más protegidos por picas |
| Picas guarnecidas        | piquero +300 % × fracción de arcabuces    | Las picas valen más guarnecidas de fuego     |
| Sargentos veteranos      | tolerancia de proporción ×2               | Hace más fácil mantener el equilibrio        |
| Capitanes de leva        | +0.5 reclutas/s, leva a mitad             | Alimenta el ajuste de proporción             |
| Contramarcha             | ideal pasa a 1:1, bonus máx. +200 %       | Obliga a reequilibrar el tercio              |
| Sargento mayor           | el bonus de proporción multiplica la paga | Equilibrio también da dinero                 |
| Maestre de campo         | +15 % de poder por mejora comprada        | Recompensa el árbol completo                 |

## Decisiones abiertas

- **Más campañas**: Italia (ya visible como «Próximamente»), Portugal, Francia… cada una con enemigos y mejoras propias.
- **Arte**: ilustraciones o iconografía de época (banderas, aspa de Borgoña, grabados).
- **Sonido**: tambores y pífanos, descargas de arcabucería.
- **Eventos**: motines por falta de paga, pagas atrasadas, deserciones, invernadas.
- **Tipos de enemigo**: caballería (exige picas), tercios enemigos, plazas sitiadas (exige arcabuces y zapadores).
- **Capas de prestigio adicionales**: por encima de la veteranía (p. ej. «Reputación» al ganar varias campañas, o el Camino Español como meta-mapa).
- **Más unidades**: mosqueteros, coseletes frente a picas secas, caballería ligera.
- **Ajuste fino del balance** con jugadores reales; el bot es optimista.
