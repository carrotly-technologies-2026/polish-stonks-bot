/** Human label for a backend code (category, status, user type…) with a raw-code fallback. */
type T = { (key: string): string; has(key: string): boolean };
export const label = (t: T, code: string | null | undefined) => {
  const k = code || 'nieznany';
  return t.has(k) ? t(k) : k;
};
