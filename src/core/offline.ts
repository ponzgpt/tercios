import { OFFLINE_CAP_S } from './balance';
import { income, recruitRate } from './economy';
import type { GameState } from './state';

export interface OfflineReport {
  /** Segundos ausente, ya limitados a OFFLINE_CAP_S. */
  seconds: number;
  /** True si la ausencia superó el límite. */
  capped: boolean;
  ducados: number;
  reclutas: number;
}

/**
 * Aplica la producción acumulada desde `s.lastSeen` hasta `now`.
 * La producción es constante sin compras, así que basta multiplicar por el tiempo.
 */
export function applyOffline(s: GameState, now: number): OfflineReport {
  const elapsed = Math.max(0, (now - s.lastSeen) / 1000);
  const seconds = Math.min(elapsed, OFFLINE_CAP_S);
  const ducados = income(s) * seconds;
  const reclutas = recruitRate(s) * seconds;
  s.ducados += ducados;
  s.reclutas += reclutas;
  s.lastSeen = now;
  return { seconds, capped: elapsed > OFFLINE_CAP_S, ducados, reclutas };
}
