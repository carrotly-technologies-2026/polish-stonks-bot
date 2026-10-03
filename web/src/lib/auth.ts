/** Panel auth. Viewing is open; changing data needs PANEL_PASSWORD (Basic auth or the login cookie). Edge-safe. */

export const ADMIN_COOKIE = 'halohub_admin';
/** Readable by the browser, only to show "edit mode" in the UI; never trusted. */
export const ADMIN_UI_COOKIE = 'halohub_admin_ui';

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

/** Cookie value proving the password was given; changes when the password changes. */
export async function adminToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`halohub-admin:${password}`);
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', data));
  return [...hash].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function isAdmin(authorization: string | null, cookie: string | undefined): Promise<boolean> {
  const password = process.env.PANEL_PASSWORD;
  if (!password) return false;
  if (isPanelAuthorized(authorization, password)) return true;
  return !!cookie && safeEqual(cookie, await adminToken(password));
}

function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}
