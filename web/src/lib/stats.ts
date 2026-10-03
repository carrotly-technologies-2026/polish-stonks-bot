export function median(values: (number | null | undefined)[]): number | null {
  const xs = values.filter((v): v is number => typeof v === 'number').sort((a, b) => a - b);
  if (!xs.length) return null;
  const mid = Math.floor(xs.length / 2);
  return xs.length % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
}
