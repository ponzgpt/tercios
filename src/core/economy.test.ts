import { describe, expect, it } from 'vitest';
import { COST_GROWTH, PAY, UNITS } from './balance';
import {
  buyRecruits,
  buyUnits,
  buyUpgrade,
  income,
  power,
  ratioBonus,
  tick,
  unitCost,
  unitPower,
} from './economy';
import { newGame, type GameState } from './state';

const army = (
  piqueros: number,
  arcabuceros: number,
  extra: Partial<GameState> = {},
): GameState => ({
  ...newGame(0),
  piqueros,
  arcabuceros,
  ...extra,
});

describe('costes', () => {
  it('el coste de cada unidad crece ×1.15 por unidad poseída', () => {
    expect(unitCost(army(0, 0), 'piquero')).toBe(UNITS.piquero.baseCost);
    expect(unitCost(army(10, 0), 'piquero')).toBeCloseTo(
      UNITS.piquero.baseCost * COST_GROWTH ** 10,
    );
  });

  it('armar una unidad consume un recluta y sus ducados', () => {
    const s = army(0, 0, { ducados: 100 });
    expect(buyUnits(s, 'piquero', 1)).toBe(0); // sin reclutas
    expect(buyRecruits(s, 2)).toBe(2);
    expect(buyUnits(s, 'piquero', 5)).toBe(2);
    expect(s.piqueros).toBe(2);
    expect(s.reclutas).toBe(0);
  });

  it('no compra mejoras bloqueadas por victorias', () => {
    const s = army(0, 0, { ducados: 1e9 });
    expect(buyUpgrade(s, 'mangas')).toBe(false);
    s.victorias = 1;
    expect(buyUpgrade(s, 'mangas')).toBe(true);
    expect(buyUpgrade(s, 'mangas')).toBe(false); // ya comprada
  });
});

describe('proporción pica/arcabuz', () => {
  it('el bonus es máximo con 2 picas por arcabuz y nulo con un solo tipo', () => {
    expect(ratioBonus(army(20, 10))).toBeCloseTo(1);
    expect(ratioBonus(army(30, 0))).toBe(0);
    expect(ratioBonus(army(0, 30))).toBe(0);
  });

  it('con el mismo número de unidades, el tercio equilibrado tiene más poder', () => {
    expect(power(army(20, 10))).toBeGreaterThan(power(army(30, 0)));
    expect(power(army(20, 10))).toBeGreaterThan(power(army(0, 30)));
  });

  it('contramarcha desplaza la proporción ideal a 1:1', () => {
    const s = army(15, 15, { upgrades: ['contramarcha'] });
    expect(ratioBonus(s)).toBeCloseTo(2);
    expect(ratioBonus(army(15, 15))).toBe(0);
  });

  it('las mangas hacen valer más al arcabucero cuantas más picas lo protegen', () => {
    const many = army(30, 10, { upgrades: ['mangas'] });
    const few = army(10, 30, { upgrades: ['mangas'] });
    expect(unitPower(many, 'arcabucero')).toBeGreaterThan(unitPower(few, 'arcabucero'));
  });
});

describe('producción', () => {
  it('la paga crece con las unidades, las victorias y la veteranía', () => {
    const base = income(army(0, 0));
    expect(base).toBe(PAY.base);
    expect(income(army(10, 0))).toBeCloseTo(PAY.base + 10 * PAY.perUnit);
    expect(income(army(0, 0, { victorias: 1 }))).toBeCloseTo(PAY.base * PAY.victoryMult);
    expect(income(army(0, 0, { veteraniaTotal: 4 }))).toBeGreaterThan(base);
  });

  it('tick suma la producción del intervalo', () => {
    const s = army(10, 0);
    tick(s, 2.5);
    expect(s.ducados).toBeCloseTo(income(s) * 2.5);
  });
});
