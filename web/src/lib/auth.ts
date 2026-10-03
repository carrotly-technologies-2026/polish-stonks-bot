/** HTTP Basic auth check for the city panel (any username, password from PANEL_PASSWORD). Edge-safe. */
export function isPanelAuthorized(header: string | null, password: string): boolean {
  if (!header?.startsWith('Basic ')) return false;
  try {
    const decoded = new TextDecoder().decode(
      Uint8Array.from(atob(header.slice(6).trim()), (c) => c.charCodeAt(0)),
    );
    const given = decoded.slice(decoded.indexOf(':') + 1);
    return safeEqual(given, password);
  } catch {
    return false;
  }
}

function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}
