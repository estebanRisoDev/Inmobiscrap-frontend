// middleware.ts  (raíz del proyecto Next.js)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rutas que requieren autenticación
const PROTECTED_ROUTES = ['/botdashboard', '/dashboards'];
// Rutas públicas (no redirigir si ya está logueado)
const AUTH_ROUTES = ['/login', '/register'];

function isTokenValid(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Leer token de las cookies (lo setearemos al login)
  const token = request.cookies.get('inmobiscrap_token')?.value;
  const isAuthenticated = token ? isTokenValid(token) : false;

  // Si está en una ruta protegida y NO está autenticado → login
  const isProtected = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );

  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Si está en login/register pero YA está autenticado → inicio
  const isAuthRoute = AUTH_ROUTES.includes(pathname);
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL('/botdashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)' ,
  ],
};