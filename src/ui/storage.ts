import { deserialize, serialize } from '../core/save';
import { newGame, type GameState } from '../core/state';

const KEY = 'tercios.save';

export function load(now: number): GameState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return deserialize(raw, now);
  } catch (e) {
    console.error('No se pudo cargar la partida', e);
  }
  return newGame(now);
}

export function save(s: GameState): void {
  try {
    localStorage.setItem(KEY, serialize(s));
  } catch (e) {
    console.error('No se pudo guardar la partida', e);
  }
}

export function wipe(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Sin almacenamiento disponible: no hay nada que borrar.
  }
}
