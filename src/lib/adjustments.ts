export function isAdjustmentInput(value: string): boolean {
  return value === "" || value === "-" || /^-?\d*(?:[.,]\d*)?$/.test(value);
}

export function normalizeAdjustment(value: string | number): number | null {
  const text = String(value).trim().replace(",", ".");
  if (!text || text === "-" || !/^-?\d+(?:\.\d+)?$/.test(text)) return null;
  const number = Number(text);
  return Number.isFinite(number) ? Math.round(number * 100) / 100 : null;
}

export function stepAdjustment(value: string | number, delta: 1 | -1): string {
  const current = normalizeAdjustment(value) ?? 0;
  return (current + delta).toFixed(2);
}
