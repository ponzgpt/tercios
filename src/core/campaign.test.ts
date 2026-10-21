import { describe, expect, it } from 'vitest';
import { BATTLE } from './balance';
import { buyShop, currentCampaign, fight, prestige, veteraniaGain, winChance } from './campaign';
import { simulateCampaign, simulatePrestige } from './sim';
import { newGame, type GameState } from './state';

const won = (extra: Partial<GameState> = {}): GameState => ({
  ...newGame(0),
  victorias: currentCampaign.battles.length,
  ...extra,
});

describe('batallas', () => {
  it('sin tropas no hay opción; con poder suficiente la victoria es segura', () => {
    expect(winChance(newGame(0))).toBe(0);
    expect(winChance({ ...newGame(0), piqueros: 100, arcabuceros: 50 })).toBe(1);
  });

  it('una victoria da botín y avanza la campaña', () => {
    const s = { ...newGame(0), piqueros: 100, arcabuceros: 50 };
    const r = fight(s, 0.99);
    expect(r?.outcome).toBe('victoria');
    expect(s.victorias).toBe(1);
    expect(s.ducados).toBe(currentCampaign.battles[0]?.booty);
  });

  it('una derrota cuesta bajas', () => {
    const s = { ...newGame(0), piqueros: 8, arcabuceros: 4 };
    const r = fight(s, 0.999);
    expect(r?.outcome).toBe('derrota');
    expect(s.piqueros).toBe(8 - Math.ceil(8 * BATTLE.defeatLoss));
    expect(s.victorias).toBe(0);
  });
});

describe('prestigio', () => {
  it('la veteranía es sublineal en el poder máximo', () => {
    expect(veteraniaGain(0)).toBe(0);
    const a = veteraniaGain(10_000);
    const b = veteraniaGain(40_000);
    expect(b).toBeGreaterThan(a);
    expect(b).toBeLessThan(4 * a);
  });

  it('solo se licencia el tercio al ganar la campaña', () => {
    expect(prestige(newGame(0), 1)).toBeUndefined();
  });

  it('el licenciamiento resetea todo salvo veteranía, tienda y contadores', () => {
    const s = won({
      ducados: 1e6,
      piqueros: 50,
      upgrades: ['mangas'],
      poderMaximo: 20_000,
      veterania: 1,
      veteraniaTotal: 3,
      tienda: ['credito_fugger'],
    });
    const next = prestige(s, 5);
    if (!next) throw new Error('sin prestigio');
    const gain = veteraniaGain(20_000);
    expect(next.veterania).toBe(1 + gain);
    expect(next.veteraniaTotal).toBe(3 + gain);
    expect(next.prestigios).toBe(1);
    expect(next.piqueros).toBe(0);
    expect(next.upgrades).toEqual([]);
    expect(next.victorias).toBe(0);
    expect(next.ducados).toBe(300); // crédito con los Fugger
    expect(next.tienda).toEqual(['credito_fugger']);
  });

  it('la tienda cobra veteranía y no vende dos veces', () => {
    const s = { ...newGame(0), veterania: 3 };
    expect(buyShop(s, 'tercio_viejo')).toBe(true);
    expect(s.veterania).toBe(1);
    expect(buyShop(s, 'tercio_viejo')).toBe(false);
    expect(buyShop(s, 'memoria_flandes')).toBe(false);
  });
});

describe('balance', () => {
  it('la primera campaña dura 15–35 min y cada prestigio la acelera claramente', () => {
    let s = newGame(0);
    const first = simulateCampaign(s);
    expect(first / 60).toBeGreaterThan(15);
    expect(first / 60).toBeLessThan(35);
    s = simulatePrestige(s);
    const second = simulateCampaign(s);
    expect(second).toBeLessThan(first * 0.6);
    s = simulatePrestige(s);
    expect(simulateCampaign(s)).toBeLessThan(second);
  });
});
