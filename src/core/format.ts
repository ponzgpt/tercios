const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

/** Formatea números grandes: 1234 → "1.2K", 3_400_000 → "3.4M". */
export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return '∞';
  if (n < 0) return '-' + formatNumber(-n);
  if (n < 1000) return n < 10 && !Number.isInteger(n) ? n.toFixed(1) : Math.floor(n).toString();
  const tier = Math.min(Math.floor(Math.log10(n) / 3), SUFFIXES.length - 1);
  const scaled = n / 10 ** (tier * 3);
  const text =
    scaled >= 100 ? Math.floor(scaled).toString() : (Math.floor(scaled * 10) / 10).toFixed(1);
  return text + SUFFIXES[tier];
}
