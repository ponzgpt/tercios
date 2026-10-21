import { TICK_MS } from '../core/balance';

/** Si entre dos frames pasa más que esto, la pestaña estuvo oculta: se trata como tiempo offline. */
const GAP_MS = 5_000;

/**
 * Bucle de paso fijo: acumula el tiempo real de requestAnimationFrame y ejecuta `step`
 * en pasos de TICK_MS. Tras una pausa larga llama a `onGap` en vez de recuperar ticks.
 */
export function startLoop(step: (dt: number) => void, render: () => void, onGap: () => void): void {
  let last = performance.now();
  let acc = 0;
  const frame = (t: number): void => {
    const delta = t - last;
    last = t;
    if (delta > GAP_MS) {
      acc = 0;
      onGap();
    } else {
      acc += delta;
    }
    let stepped = false;
    while (acc >= TICK_MS) {
      step(TICK_MS / 1000);
      acc -= TICK_MS;
      stepped = true;
    }
    if (stepped) render();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
