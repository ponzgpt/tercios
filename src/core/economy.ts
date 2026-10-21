import {
  COST_GROWTH,
  PAY,
  PRESTIGE,
  RATIO,
  RECRUIT,
  SHOP,
  UNITS,
  UPGRADES,
  type ShopId,
  type UnitKind,
  type UpgradeId,
} from './balance';
import type { GameState } from './state';

const upgradeValue = (id: UpgradeId): number => UPGRADES.find((u) => u.id === id)?.value ?? 0;
const shopValue = (id: ShopId): number => SHOP.find((s) => s.id === id)?.value ?? 0;
export const has = (s: GameState, id: UpgradeId): boolean => s.upgrades.includes(id);
export const owns = (s: GameState, id: ShopId): boolean => s.tienda.includes(id);

export const totalUnits = (s: GameState): number => s.piqueros + s.arcabuceros;

/** Fracción de arcabuceros sobre el total (0 sin unidades). */
export function arcFraction(s: GameState): number {
  const n = totalUnits(s);
  return n === 0 ? 0 : s.arcabuceros / n;
}

export const idealArcFraction = (s: GameState): number =>
  has(s, 'contramarcha') ? RATIO.idealArcContramarcha : RATIO.idealArc;

export function ratioTolerance(s: GameState): number {
  let t = RATIO.tolerance;
  if (has(s, 'sargentos')) t *= upgradeValue('sargentos');
  if (owns(s, 'escuela_sargentos')) t *= shopValue('escuela_sargentos');
  return t;
}

export const maxRatioBonus = (s: GameState): number =>
  RATIO.maxBonus + (has(s, 'contramarcha') ? upgradeValue('contramarcha') : 0);

/** Bonus por proporción equilibrada, como fracción (0.8 = +80%). */
export function ratioBonus(s: GameState): number {
  if (totalUnits(s) === 0) return 0;
  const closeness = 1 - Math.abs(arcFraction(s) - idealArcFraction(s)) / ratioTolerance(s);
  return maxRatioBonus(s) * Math.max(0, closeness);
}

/** Poder de una unidad del tipo dado, con sus mejoras (sin el bonus de proporción). */
export function unitPower(s: GameState, kind: UnitKind): number {
  const f = arcFraction(s);
  if (kind === 'piquero') {
    let p: number = UNITS.piquero.power;
    if (has(s, 'instruccion_picas')) p *= upgradeValue('instruccion_picas');
    if (has(s, 'guarnicion')) p *= 1 + upgradeValue('guarnicion') * f;
    return p;
  }
  let p: number = UNITS.arcabucero.power;
  if (has(s, 'polvora_fina')) p *= upgradeValue('polvora_fina');
  if (has(s, 'mangas')) p *= 1 + upgradeValue('mangas') * (1 - f);
  return p;
}

export function power(s: GameState): number {
  const base = s.piqueros * unitPower(s, 'piquero') + s.arcabuceros * unitPower(s, 'arcabucero');
  let mult = 1 + ratioBonus(s);
  if (has(s, 'maestre_campo')) mult *= 1 + upgradeValue('maestre_campo') * (s.upgrades.length - 1);
  return base * mult;
}

/** Multiplicador de producción por veteranía acumulada. */
export const veteranMult = (s: GameState): number => 1 + PRESTIGE.prodPerPoint * s.veteraniaTotal;

/** Ducados por segundo. */
export function income(s: GameState): number {
  const base = PAY.base * (owns(s, 'credito_fugger') ? shopValue('credito_fugger') : 1);
  const perUnit = PAY.perUnit * (has(s, 'pagadores') ? upgradeValue('pagadores') : 1);
  let total = (base + perUnit * totalUnits(s)) * PAY.victoryMult ** s.victorias;
  if (has(s, 'sargento_mayor')) total *= 1 + ratioBonus(s);
  return total * veteranMult(s);
}

/** Reclutas por segundo (solo con capitanes de leva). */
export const recruitRate = (s: GameState): number =>
  has(s, 'capitanes_leva') ? upgradeValue('capitanes_leva') * veteranMult(s) : 0;

const costGrowth = (s: GameState): number =>
  owns(s, 'memoria_flandes') ? shopValue('memoria_flandes') : COST_GROWTH;

export const unitCost = (s: GameState, kind: UnitKind): number =>
  UNITS[kind].baseCost * costGrowth(s) ** (kind === 'piquero' ? s.piqueros : s.arcabuceros);

export const recruitCost = (s: GameState): number =>
  RECRUIT.baseCost *
  RECRUIT.growth ** s.reclutasComprados *
  (has(s, 'capitanes_leva') ? RECRUIT.capitanesCostMult : 1);

/** Compra hasta `n` reclutas. Devuelve cuántos se compraron. */
export function buyRecruits(s: GameState, n: number): number {
  let bought = 0;
  while (bought < n) {
    const c = recruitCost(s);
    if (s.ducados < c) break;
    s.ducados -= c;
    s.reclutas += 1;
    s.reclutasComprados += 1;
    bought++;
  }
  return bought;
}

/** Arma hasta `n` unidades (cada una consume un recluta). Devuelve cuántas. */
export function buyUnits(s: GameState, kind: UnitKind, n: number): number {
  let bought = 0;
  while (bought < n && s.reclutas >= 1) {
    const c = unitCost(s, kind);
    if (s.ducados < c) break;
    s.ducados -= c;
    s.reclutas -= 1;
    if (kind === 'piquero') s.piqueros += 1;
    else s.arcabuceros += 1;
    bought++;
  }
  trackPower(s);
  return bought;
}

export const isUnlocked = (s: GameState, id: UpgradeId): boolean =>
  s.victorias >= (UPGRADES.find((u) => u.id === id)?.unlockAt ?? Infinity);

export function canBuyUpgrade(s: GameState, id: UpgradeId): boolean {
  const u = UPGRADES.find((x) => x.id === id);
  return !!u && !has(s, id) && isUnlocked(s, id) && s.ducados >= u.cost;
}

export function buyUpgrade(s: GameState, id: UpgradeId): boolean {
  const u = UPGRADES.find((x) => x.id === id);
  if (!u || !canBuyUpgrade(s, id)) return false;
  s.ducados -= u.cost;
  s.upgrades.push(id);
  trackPower(s);
  return true;
}

export function trackPower(s: GameState): void {
  s.poderMaximo = Math.max(s.poderMaximo, power(s));
}

/** Avanza la simulación `dt` segundos. */
export function tick(s: GameState, dt: number): void {
  s.ducados += income(s) * dt;
  s.reclutas += recruitRate(s) * dt;
  s.tiempoCampana += dt;
}
