import { NextResponse, type NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intl = createMiddleware(routing);
const LOCALE_HOME = /^\/(pl|en|uk)\/?$/;

/** Absolute URL on the public host (the app runs behind Coolify's proxy). */
function publicUrl(req: NextRequest, path: string): URL {
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? req.nextUrl.host;
  const proto = req.headers.get('x-forwarded-proto') ?? req.nextUrl.protocol.replace(':', '');
  return new URL(path, `${proto}://${host}`);
}

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // The testers' guide is the start page.
  const home = pathname.match(LOCALE_HOME);
  if (home) return NextResponse.redirect(publicUrl(req, `/${home[1]}/info`));

  if (pathname.startsWith('/api/')) return NextResponse.next();
  return intl(req);
}

export const config = {
  matcher: ['/((?!_next|_vercel|.*\\..*).*)', '/api/:path*'],
};
