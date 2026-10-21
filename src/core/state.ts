import { START_DUCADOS_FUGGER, type ShopId, type UpgradeId, SHOP } from './balance';

export const SAVE_VERSION = 1;

export interface GameState {
  version: number;
  ducados: number;
  reclutas: number;
  /** Reclutas comprados en esta campaña; escala el coste de la leva. */
  reclutasComprados: number;
  piqueros: number;
  arcabuceros: number;
  upgrades: UpgradeId[];
  /** Victorias en la campaña actual. */
  victorias: number;
  /** Poder máximo alcanzado en la campaña actual (base de la veteranía). */
  poderMaximo: number;
  /** Segundos jugados en la campaña actual. */
  tiempoCampana: number;
  veterania: number;
  veteraniaTotal: number;
  tienda: ShopId[];
  prestigios: number;
  /** Marca de tiempo (ms) de la última vez que se guardó o se jugó. */
  lastSeen: number;
}

const shopValue = (id: ShopId): number => SHOP.find((s) => s.id === id)?.value ?? 0;

/** Estado de una campaña nueva, conservando lo permanente de `prev`. */
export function newCampaign(now: number, prev?: GameState): GameState {
  const tienda = prev?.tienda ?? [];
  const veteranos = tienda.includes('tercio_viejo') ? shopValue('tercio_viejo') : 0;
  return {
    version: SAVE_VERSION,
    ducados: tienda.includes('credito_fugger') ? START_DUCADOS_FUGGER : 0,
    reclutas: 0,
    reclutasComprados: 0,
    piqueros: veteranos * 2,
    arcabuceros: veteranos,
    upgrades: [],
    victorias: 0,
    poderMaximo: 0,
    tiempoCampana: 0,
    veterania: prev?.veterania ?? 0,
    veteraniaTotal: prev?.veteraniaTotal ?? 0,
    tienda: [...tienda],
    prestigios: prev?.prestigios ?? 0,
    lastSeen: now,
  };
}

export const newGame = (now: number): GameState => newCampaign(now);
