import { describe, expect, it } from 'vitest';
import { OFFLINE_CAP_S } from './balance';
import { income } from './economy';
import { applyOffline } from './offline';
import { newGame } from './state';

describe('progreso offline', () => {
  it('acumula la producción del tiempo ausente', () => {
    const s = { ...newGame(0), piqueros: 10 };
    const r = applyOffline(s, 3600_000);
    expect(r.seconds).toBe(3600);
    expect(r.capped).toBe(false);
    expect(s.ducados).toBeCloseTo(income(s) * 3600);
    expect(s.lastSeen).toBe(3600_000);
  });

  it('se limita a 8 horas', () => {
    const s = newGame(0);
    const r = applyOffline(s, 24 * 3600_000);
    expect(r.seconds).toBe(OFFLINE_CAP_S);
    expect(r.capped).toBe(true);
  });

  it('ignora relojes que van hacia atrás', () => {
    const s = newGame(10_000);
    expect(applyOffline(s, 0).ducados).toBe(0);
  });

  it('incluye los reclutas de los capitanes de leva', () => {
    const s = { ...newGame(0), upgrades: ['capitanes_leva' as const] };
    expect(applyOffline(s, 10_000).reclutas).toBeGreaterThan(0);
  });
});
