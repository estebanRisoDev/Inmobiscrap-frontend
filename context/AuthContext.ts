'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode, createElement } from 'react';
import axios from 'axios';
import { AuthUser, getToken, setToken, setUser, getUser, removeToken, isLoggedIn } from '@/lib/auth';

const API_BASE = 'http://localhost:5000';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  googleLogin: (idToken: string) => Promise<void>;
  logout: () => void;
  refreshCredits: () => Promise<void>;
  isPro: boolean;
  isAdmin: boolean;
}

const Context = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef<AuthUser | null>(null);

  // Mantener ref sincronizado con state
  useEffect(() => { userRef.current = user; }, [user]);

  useEffect(() => {
    if (isLoggedIn()) {
      const cached = getUser();
      if (cached) {
        setUserState(cached);
      } else {
        axios
          .get(`${API_BASE}/api/auth/me`, {
            headers: { Authorization: `Bearer ${getToken()}` },
          })
          .then(({ data }) => { setUser(data); setUserState(data); })
          .catch(() => removeToken());
      }
    }
    setLoading(false);
  }, []);

  const handleAuthResponse = useCallback((token: string, userData: AuthUser) => {
    setToken(token);
    setUser(userData);
    setUserState(userData);
    document.cookie = `inmobiscrap_token=${token}; path=/; max-age=${7 * 24 * 3600}; SameSite=Lax`;
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await axios.post(`${API_BASE}/api/auth/login`, { email, password });
    handleAuthResponse(data.token, data.user);
  }, [handleAuthResponse]);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const { data } = await axios.post(`${API_BASE}/api/auth/register`, { name, email, password });
    handleAuthResponse(data.token, data.user);
  }, [handleAuthResponse]);

  const googleLogin = useCallback(async (idToken: string) => {
    const { data } = await axios.post(`${API_BASE}/api/auth/google`, { idToken });
    handleAuthResponse(data.token, data.user);
  }, [handleAuthResponse]);

  const logout = useCallback(() => {
    removeToken();
    setUserState(null);
    document.cookie = 'inmobiscrap_token=; path=/; max-age=0';
    window.location.href = '/';
  }, []);

  const refreshCredits = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/api/auth/credits`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const current = userRef.current;
      if (current) {
        const updated = { ...current, credits: data.credits, plan: data.plan, role: data.role };
        setUser(updated);
        setUserState(updated);
      }
    } catch { /* silenciar */ }
  }, []); // ← Sin dependencias: estable para siempre

  const isPro   = user?.plan === 'pro';
  const isAdmin = user?.role === 'admin';

  const value: AuthContextValue = {
    user, loading, login, register, googleLogin, logout,
    refreshCredits, isPro, isAdmin,
  };

  return createElement(Context.Provider, { value }, children);
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}