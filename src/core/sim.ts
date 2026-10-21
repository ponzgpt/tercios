import { SHOP, UPGRADES } from './balance';
import { buyShop, campaignWon, fight, prestige, winChance } from './campaign';
import { arcFraction, buyRecruits, buyUnits, buyUpgrade, idealArcFraction, tick } from './economy';
import type { GameState } from './state';

/**
 * Jugador automático razonable para medir el balance: decide una vez por segundo.
 * Devuelve los segundos que tarda en ganar la campaña (o `maxSeconds` si no lo logra).
 */
export function simulateCampaign(s: GameState, maxSeconds = 4 * 3600): number {
  for (let t = 0; t < maxSeconds; t++) {
    if (campaignWon(s)) return t;
    if (winChance(s) >= 1) fight(s, 0);
    for (const u of [...UPGRADES].sort((a, b) => a.cost - b.cost)) buyUpgrade(s, u.id);
    for (;;) {
      const kind = arcFraction(s) < idealArcFraction(s) ? 'arcabucero' : 'piquero';
      if (s.reclutas < 1 && buyRecruits(s, 1) === 0) break;
      if (buyUnits(s, kind, 1) === 0) break;
    }
    tick(s, 1);
  }
  return maxSeconds;
}

/** Licencia el tercio y gasta la veteranía en la tienda, de lo más barato a lo más caro. */
export function simulatePrestige(s: GameState): GameState {
  const next = prestige(s, s.lastSeen);
  if (!next) throw new Error('Campaña no ganada');
  for (const item of SHOP) buyShop(next, item.id);
  return next;
}
