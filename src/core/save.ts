import { SHOP, UPGRADES } from './balance';
import { newGame, SAVE_VERSION, type GameState } from './state';

type Raw = Record<string, unknown>;

/**
 * Migraciones: MIGRATIONS[v] convierte un guardado de la versión v a la v+1.
 * v0: prototipo sin campo `version` ni `veteraniaTotal`.
 */
const MIGRATIONS: Record<number, (raw: Raw) => Raw> = {
  0: (raw) => ({ ...raw, version: 1, veteraniaTotal: raw['veteraniaTotal'] ?? raw['veterania'] }),
};

const num = (v: unknown, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : fallback;

const ids = <T extends string>(v: unknown, valid: readonly T[]): T[] =>
  Array.isArray(v) ? valid.filter((id) => v.includes(id)) : [];

/** Convierte cualquier guardado (de cualquier versión conocida) al estado actual. */
export function migrate(input: unknown, now: number): GameState {
  if (typeof input !== 'object' || input === null) throw new Error('Guardado no válido');
  let raw = input as Raw;
  let v = typeof raw['version'] === 'number' ? raw['version'] : 0;
  if (v > SAVE_VERSION) throw new Error(`Guardado de una versión futura (${v})`);
  while (v < SAVE_VERSION) {
    const step = MIGRATIONS[v];
    if (!step) throw new Error(`Sin migración desde la versión ${v}`);
    raw = step(raw);
    v++;
  }
  const d = newGame(now);
  return {
    version: SAVE_VERSION,
    ducados: num(raw['ducados'], d.ducados),
    reclutas: num(raw['reclutas'], d.reclutas),
    reclutasComprados: num(raw['reclutasComprados'], d.reclutasComprados),
    piqueros: Math.floor(num(raw['piqueros'], d.piqueros)),
    arcabuceros: Math.floor(num(raw['arcabuceros'], d.arcabuceros)),
    upgrades: ids(
      raw['upgrades'],
      UPGRADES.map((u) => u.id),
    ),
    victorias: Math.floor(num(raw['victorias'], d.victorias)),
    poderMaximo: num(raw['poderMaximo'], d.poderMaximo),
    tiempoCampana: num(raw['tiempoCampana'], d.tiempoCampana),
    veterania: num(raw['veterania'], d.veterania),
    veteraniaTotal: num(raw['veteraniaTotal'], d.veteraniaTotal),
    tienda: ids(
      raw['tienda'],
      SHOP.map((x) => x.id),
    ),
    prestigios: Math.floor(num(raw['prestigios'], d.prestigios)),
    lastSeen: num(raw['lastSeen'], now),
  };
}

export const serialize = (s: GameState): string => JSON.stringify(s);

export const deserialize = (json: string, now: number): GameState => migrate(JSON.parse(json), now);

/** Exporta la partida como texto base64 (seguro para copiar y pegar). */
export function exportSave(s: GameState): string {
  const bytes = new TextEncoder().encode(serialize(s));
  return btoa(String.fromCharCode(...bytes));
}

export function importSave(text: string, now: number): GameState {
  let json: string;
  try {
    const bin = atob(text.trim());
    json = new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
  } catch {
    throw new Error('El texto no es una partida exportada');
  }
  return deserialize(json, now);
}
