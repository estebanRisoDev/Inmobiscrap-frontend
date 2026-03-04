'use client';
// app/register/page.tsx

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

const C = {
  bg:      '#0d1117',
  surface: '#161b22',
  border:  '#30363d',
  primary: '#1f6feb',
  text:    '#e6edf3',
  muted:   '#8b949e',
  error:   '#f85149',
  success: '#3fb950',
};

function RegisterForm() {
  const router                       = useRouter();
  const { register, googleLogin, user } = useAuth();

  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    if (user) router.replace('/');
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !confirm) {
      setError('Completa todos los campos.'); return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.'); return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.'); return;
    }
    setLoading(true);
    setError('');
    try {
      await register(name, email, password);
      router.replace('/');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Error al crear la cuenta.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async (credentialResponse: any) => {
    if (!credentialResponse.credential) return;
    setLoading(true);
    setError('');
    try {
      await googleLogin(credentialResponse.credential);
      router.replace('/');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Error al autenticar con Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.bgGrid} />
      <div style={styles.card}>
        <div style={styles.logoRow}>
          <span style={styles.logoIcon}>🏠</span>
          <span style={styles.logoText}>InmobiScrap</span>
        </div>

        <h1 style={styles.heading}>Crear cuenta</h1>
        <p style={styles.subheading}>Únete al sistema de scraping inteligente</p>

        {error && (
          <div style={styles.errorBanner}><span>⚠</span> {error}</div>
        )}

        {/* Google */}
        <div style={styles.googleWrapper}>
          <GoogleLogin
            onSuccess={handleGoogle}
            onError={() => setError('Error al conectar con Google.')}
            text="signup_with"
            shape="rectangular"
            theme="filled_black"
          />
        </div>

        <div style={styles.divider}>
          <hr style={styles.dividerLine} />
          <span style={styles.dividerText}>o con email</span>
          <hr style={styles.dividerLine} />
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div>
            <label style={styles.label}>Nombre completo</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Juan Pérez"
              style={styles.input}
              disabled={loading}
              autoComplete="name"
            />
          </div>

          <div>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              style={styles.input}
              disabled={loading}
              autoComplete="email"
            />
          </div>

          <div>
            <label style={styles.label}>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              style={styles.input}
              disabled={loading}
              autoComplete="new-password"
            />
          </div>

          <div>
            <label style={styles.label}>Confirmar contraseña</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repite tu contraseña"
              style={{
                ...styles.input,
                borderColor: confirm && confirm !== password ? C.error : C.border,
              }}
              disabled={loading}
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            style={{ ...styles.btn, opacity: loading ? 0.6 : 1 }}
            disabled={loading}
          >
            {loading ? 'Creando cuenta...' : 'Crear cuenta →'}
          </button>
        </form>

        <p style={styles.footer}>
          ¿Ya tienes cuenta?{' '}
          <a href="/login" style={styles.link}>Inicia sesión</a>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <RegisterForm />
    </GoogleOAuthProvider>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: C.bg,
    fontFamily: '"IBM Plex Mono", "Fira Code", monospace',
    position: 'relative',
    overflow: 'hidden',
  },
  bgGrid: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `linear-gradient(${C.border}22 1px, transparent 1px),
                      linear-gradient(90deg, ${C.border}22 1px, transparent 1px)`,
    backgroundSize: '40px 40px',
    pointerEvents: 'none',
  },
  card: {
    position: 'relative',
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: '12px',
    padding: '40px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: `0 0 60px ${C.primary}22`,
    margin: '24px',
  },
  logoRow: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' },
  logoIcon: { fontSize: '26px' },
  logoText: { fontSize: '20px', fontWeight: 700, color: C.text, letterSpacing: '-0.5px' },
  heading: { fontSize: '22px', fontWeight: 700, color: C.text, margin: '0 0 6px', letterSpacing: '-0.5px' },
  subheading: { fontSize: '14px', color: C.muted, margin: '0 0 20px' },
  errorBanner: {
    background: `${C.error}18`,
    border: `1px solid ${C.error}55`,
    color: C.error,
    borderRadius: '6px',
    padding: '10px 14px',
    fontSize: '13px',
    marginBottom: '16px',
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  googleWrapper: { marginBottom: '16px', display: 'flex', justifyContent: 'center' },
  divider: { display: 'flex', alignItems: 'center', gap: '12px', margin: '12px 0' },
  dividerLine: { flex: 1, border: 'none', borderTop: `1px solid ${C.border}` },
  dividerText: { fontSize: '12px', color: C.muted, whiteSpace: 'nowrap' },
  form: { display: 'flex', flexDirection: 'column', gap: '14px' },
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: 600,
    color: C.muted,
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    marginBottom: '6px',
  },
  input: {
    background: C.bg,
    border: `1px solid ${C.border}`,
    borderRadius: '6px',
    color: C.text,
    fontSize: '14px',
    fontFamily: 'inherit',
    padding: '10px 14px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  btn: {
    background: C.primary,
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '15px',
    fontFamily: 'inherit',
    fontWeight: 600,
    padding: '12px',
    marginTop: '4px',
  },
  footer: {
    textAlign: 'center',
    fontSize: '13px',
    color: C.muted,
    marginTop: '20px',
    marginBottom: 0,
  },
  link: { color: C.primary, textDecoration: 'none', fontWeight: 600 },
};