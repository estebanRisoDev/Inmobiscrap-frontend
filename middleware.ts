// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_ROUTES = ['/botdashboard', '/dashboards'];
const ADMIN_ONLY_ROUTES = ['/botdashboard'];
const AUTH_ROUTES = ['/login', '/register'];

function decodeToken(token: string): { valid: boolean; plan?: string; role?: string } {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return { valid: false };
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    const valid = payload.exp * 1000 > Date.now();
    // .NET ClaimTypes.Role se serializa con namespace completo
    const role = payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']
              || payload.role || 'user';
    return { valid, plan: payload.plan || 'base', role };
  } catch {
    return { valid: false };
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('inmobiscrap_token')?.value;
  const decoded = token ? decodeToken(token) : { valid: false };

  const isProtected = PROTECTED_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + '/'));

  // No autenticado → login
  if (isProtected && !decoded.valid) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Rutas admin-only → redirigir si no es admin
  const isAdminRoute = ADMIN_ONLY_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + '/'));

  if (isAdminRoute && decoded.valid && decoded.role !== 'admin') {
    const dashUrl = new URL('/dashboards', request.url);
    dashUrl.searchParams.set('upgrade', '1');
    return NextResponse.redirect(dashUrl);
  }

  // Ya logueado en /login o /register → redirigir al home correcto
  if (AUTH_ROUTES.includes(pathname) && decoded.valid) {
    const target = decoded.role === 'admin' ? '/botdashboard' : '/dashboards';
    return NextResponse.redirect(new URL(target, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};