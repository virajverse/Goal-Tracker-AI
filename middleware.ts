import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Dev-only redirect from localhost to an ngrok URL, if provided via env
export function middleware(req: NextRequest) {
  const ngrokUrl = process.env.NGROK_URL;
  if (!ngrokUrl) return NextResponse.next();

  const isDev = process.env.NODE_ENV !== 'production';
  if (!isDev) return NextResponse.next();

  let target: URL;
  try {
    target = new URL(ngrokUrl);
  } catch {
    // Invalid NGROK_URL -> ignore
    return NextResponse.next();
  }

  const current = req.nextUrl;
  const hostname = current.hostname;

  // Only redirect when accessing via localhost/127.0.0.1 (avoid loops)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const redirectUrl = new URL(current);
    redirectUrl.protocol = target.protocol;
    redirectUrl.host = target.host; // includes hostname[:port]
    redirectUrl.port = target.port || '';
    return NextResponse.redirect(redirectUrl, 308);
  }

  return NextResponse.next();
}

export const config = {
  // Skip static assets and API routes
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
