import { NextResponse, type NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { isPanelAuthorized } from './lib/auth';

const intl = createMiddleware(routing);
const PANEL = /^\/(?:(?:pl|en|uk)\/)?panel(?:\/|$)|^\/api\/panel(?:\/|$)/;

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PANEL.test(pathname)) {
    const password = process.env.PANEL_PASSWORD;
    if (!password) {
      return new NextResponse(
        'Panel miasta jest wyłączony: ustaw zmienną środowiskową PANEL_PASSWORD.\n' +
          'City panel is disabled: set the PANEL_PASSWORD environment variable.\n',
        { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } },
      );
    }
    if (!isPanelAuthorized(req.headers.get('authorization'), password)) {
      return new NextResponse('Unauthorized\n', {
        status: 401,
        headers: {
          'www-authenticate': 'Basic realm="Halo, Hub! panel", charset="UTF-8"',
          'content-type': 'text/plain; charset=utf-8',
        },
      });
    }
  }

  if (pathname.startsWith('/api/')) return NextResponse.next();
  return intl(req);
}

export const config = {
  matcher: ['/((?!_next|_vercel|.*\\..*).*)', '/api/:path*'],
};
