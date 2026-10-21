import { describe, expect, it } from 'vitest';
import { formatNumber } from './format';

describe('formatNumber', () => {
  it('deja intactos los números pequeños', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(999)).toBe('999');
    expect(formatNumber(2.5)).toBe('2.5');
  });
  it('usa sufijos K, M, B', () => {
    expect(formatNumber(1234)).toBe('1.2K');
    expect(formatNumber(3_400_000)).toBe('3.4M');
    expect(formatNumber(999_999)).toBe('999K');
    expect(formatNumber(1e9)).toBe('1.0B');
  });
});
