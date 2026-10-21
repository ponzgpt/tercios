import { describe, expect, it } from 'vitest';
import { deserialize, exportSave, importSave, migrate, serialize } from './save';
import { newGame, SAVE_VERSION } from './state';

describe('guardado', () => {
  it('serializar y deserializar conserva el estado', () => {
    const s = { ...newGame(42), ducados: 123.5, piqueros: 7, upgrades: ['mangas' as const] };
    expect(deserialize(serialize(s), 0)).toEqual(s);
  });

  it('exportar e importar en base64 es reversible', () => {
    const s = { ...newGame(1), veterania: 3, tienda: ['tercio_viejo' as const] };
    const text = exportSave(s);
    expect(text).toMatch(/^[A-Za-z0-9+/=]+$/);
    expect(importSave(text, 0)).toEqual(s);
  });

  it('migra guardados v0 (sin versión ni veteraniaTotal)', () => {
    const s = migrate({ ducados: 10, veterania: 5, piqueros: 3 }, 99);
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.veteraniaTotal).toBe(5);
    expect(s.piqueros).toBe(3);
    expect(s.lastSeen).toBe(99);
  });

  it('rechaza guardados de versiones futuras y texto basura', () => {
    expect(() => migrate({ version: SAVE_VERSION + 1 }, 0)).toThrow();
    expect(() => importSave('esto no es una partida', 0)).toThrow();
  });

  it('sanea campos corruptos con valores por defecto', () => {
    const s = migrate(
      { version: 1, ducados: -5, piqueros: 'x', upgrades: ['inventado', 'mangas'] },
      0,
    );
    expect(s.ducados).toBe(0);
    expect(s.piqueros).toBe(0);
    expect(s.upgrades).toEqual(['mangas']);
  });
});
