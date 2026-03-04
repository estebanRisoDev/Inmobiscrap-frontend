// lib/auth.ts
// Utilidades para manejo de tokens JWT en el cliente

const TOKEN_KEY = 'inmobiscrap_token';
const USER_KEY  = 'inmobiscrap_user';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  avatarUrl?: string;
  role: string;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function setUser(user: AuthUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function isLoggedIn(): boolean {
  const token = getToken();
  if (!token) return false;
  try {
    // Decodificar payload sin verificar firma (solo cliente)
    const payload = JSON.parse(atob(token.split('.')[1]));
    // Verificar expiración
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function logout(): void {
  removeToken();
  window.location.href = '/login';
}

// Headers de autorización para axios/fetch
export function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}