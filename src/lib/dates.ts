const DAY_LABELS = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'];
const MONTH_LABELS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

export function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function dayLabel(date: Date): string {
  return DAY_LABELS[(date.getDay() + 6) % 7];
}

export function isToday(date: Date): boolean {
  return toIso(date) === toIso(new Date());
}

export function formatWeekRange(start: Date): string {
  const end = addDays(start, 6);
  const sameMonth = start.getMonth() === end.getMonth();
  const sd = start.getDate();
  const ed = end.getDate();
  const monthStart = MONTH_LABELS[start.getMonth()];
  const monthEnd = MONTH_LABELS[end.getMonth()];
  return sameMonth ? `${sd} – ${ed} ${monthStart}` : `${sd} ${monthStart} – ${ed} ${monthEnd}`;
}
