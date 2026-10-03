import { NextResponse, type NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { ADMIN_COOKIE, ADMIN_UI_COOKIE, adminToken, isPanelAuthorized } from './lib/auth';

const intl = createMiddleware(routing);
const LOCALE_HOME = /^\/(pl|en|uk)\/?$/;

/** Absolute URL on the public host (the app runs behind Coolify's proxy). */
function publicUrl(req: NextRequest, path: string): URL {
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? req.nextUrl.host;
  const proto = req.headers.get('x-forwarded-proto') ?? req.nextUrl.protocol.replace(':', '');
  return new URL(path, `${proto}://${host}`);
}

/** Only same-site paths, so login cannot be used as an open redirect. */
function safeNext(req: NextRequest): string {
  const next = req.nextUrl.searchParams.get('next') ?? '/';
  return next.startsWith('/') && !next.startsWith('//') ? next : '/';
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // The analytics panel is the start page.
  const home = pathname.match(LOCALE_HOME);
  if (home) return NextResponse.redirect(publicUrl(req, `/${home[1]}/panel`));

  if (pathname === '/admin/login') {
    const password = process.env.PANEL_PASSWORD;
    if (!password) {
      return new NextResponse('Edycja wyłączona: ustaw PANEL_PASSWORD.\nEditing disabled: set PANEL_PASSWORD.\n', {
        status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' },
      });
    }
    if (!isPanelAuthorized(req.headers.get('authorization'), password)) {
      return new NextResponse('Unauthorized\n', {
        status: 401,
        headers: {
          'www-authenticate': 'Basic realm="Halo, Hub! edycja", charset="UTF-8"',
          'content-type': 'text/plain; charset=utf-8',
        },
      });
    }
    const res = NextResponse.redirect(publicUrl(req, safeNext(req)));
    const secure = publicUrl(req, '/').protocol === 'https:';
    const opts = { path: '/', sameSite: 'lax' as const, secure, maxAge: 60 * 60 * 24 * 7 };
    res.cookies.set(ADMIN_COOKIE, await adminToken(password), { ...opts, httpOnly: true });
    res.cookies.set(ADMIN_UI_COOKIE, '1', opts);
    return res;
  }

  if (pathname === '/admin/logout') {
    const res = NextResponse.redirect(publicUrl(req, safeNext(req)));
    res.cookies.delete(ADMIN_COOKIE);
    res.cookies.delete(ADMIN_UI_COOKIE);
    return res;
  }

  if (pathname.startsWith('/api/')) return NextResponse.next();
  return intl(req);
}

export const config = {
  matcher: ['/((?!_next|_vercel|.*\\..*).*)', '/api/:path*'],
};
