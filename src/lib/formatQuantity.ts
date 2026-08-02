// Unités "à la pièce" : arrondir à un quart plutôt qu'à une décimale bizarre
// (ex. 1.63 g n'a pas de sens, mais 1.63 concombre non plus — ¾ concombre, si).
const FRACTION_UNITS = new Set(['pièce', 'boîte', 'tranche', 'gousse', 'sachet', 'càs', 'càc', 'pincée']);

export function formatQuantity(value: number, unit: string): string {
  if (!(value > 0)) return '0';
  const u = unit.trim().toLowerCase();
  if (FRACTION_UNITS.has(u)) {
    let rounded = Math.round(value * 4) / 4;
    if (rounded < 0.25) rounded = 0.25;
    const whole = Math.floor(rounded);
    const frac = Math.round((rounded - whole) * 4) / 4;
    const fracLabel = frac === 0.25 ? '¼' : frac === 0.5 ? '½' : frac === 0.75 ? '¾' : '';
    if (whole === 0) return fracLabel;
    return fracLabel ? `${whole} ${fracLabel}` : `${whole}`;
  }
  return String(Math.max(1, Math.round(value)));
}
