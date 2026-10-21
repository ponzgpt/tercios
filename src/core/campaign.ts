import {
  BATTLE,
  CAMPAIGNS,
  PRESTIGE,
  SHOP,
  type BattleDef,
  type CampaignDef,
  type ShopId,
} from './balance';
import { power, trackPower } from './economy';
import { newCampaign, type GameState } from './state';

// ponytail: solo existe Flandes jugable; cada prestigio vuelve a Flandes hasta que haya más campañas.
export const currentCampaign: CampaignDef = CAMPAIGNS[0] ?? {
  id: '',
  name: '',
  available: false,
  battles: [],
};

export const nextBattle = (s: GameState): BattleDef | undefined =>
  currentCampaign.battles[s.victorias];

export const campaignWon = (s: GameState): boolean => s.victorias >= currentCampaign.battles.length;

/** Probabilidad de victoria contra la próxima batalla, en [0, 1]. */
export function winChance(s: GameState): number {
  const b = nextBattle(s);
  if (!b) return 0;
  const r = (power(s) / b.power - BATTLE.minRatio) / (1 - BATTLE.minRatio);
  return Math.min(1, Math.max(0, r));
}

export type BattleResult =
  | { outcome: 'victoria'; battle: BattleDef; booty: number }
  | { outcome: 'derrota'; battle: BattleDef; lostPiqueros: number; lostArcabuceros: number };

/** Lanza la próxima batalla. `roll` es un número aleatorio en [0, 1) inyectado. */
export function fight(s: GameState, roll: number): BattleResult | undefined {
  const battle = nextBattle(s);
  if (!battle) return undefined;
  if (roll < winChance(s)) {
    trackPower(s);
    s.victorias += 1;
    s.ducados += battle.booty;
    return { outcome: 'victoria', battle, booty: battle.booty };
  }
  const lostPiqueros = Math.ceil(s.piqueros * BATTLE.defeatLoss);
  const lostArcabuceros = Math.ceil(s.arcabuceros * BATTLE.defeatLoss);
  s.piqueros -= lostPiqueros;
  s.arcabuceros -= lostArcabuceros;
  return { outcome: 'derrota', battle, lostPiqueros, lostArcabuceros };
}

/** Veteranía que se obtendría al licenciar el tercio ahora. Sublineal en el poder máximo. */
export const veteraniaGain = (poderMaximo: number): number =>
  Math.floor((poderMaximo / PRESTIGE.divisor) ** PRESTIGE.exponent);

/** Licencia el tercio: nueva campaña conservando veteranía y tienda. */
export function prestige(s: GameState, now: number): GameState | undefined {
  if (!campaignWon(s)) return undefined;
  const gain = veteraniaGain(s.poderMaximo);
  const next = newCampaign(now, s);
  next.veterania += gain;
  next.veteraniaTotal += gain;
  next.prestigios += 1;
  return next;
}

export function buyShop(s: GameState, id: ShopId): boolean {
  const item = SHOP.find((x) => x.id === id);
  if (!item || s.tienda.includes(id) || s.veterania < item.cost) return false;
  s.veterania -= item.cost;
  s.tienda.push(id);
  return true;
}
