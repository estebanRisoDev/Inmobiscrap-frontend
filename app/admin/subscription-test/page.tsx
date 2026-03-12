'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const C = {
  bg:         '#080c10',
  surface:    '#0d1117',
  surfaceAlt: '#111820',
  border:     '#1e2d3d',
  primary:    '#00d4ff',
  accent:     '#00ff88',
  text:       '#e2eaf2',
  muted:      '#556070',
  error:      '#ef4444',
  warning:    '#f59e0b',
  success:    '#22c55e',
};

const API_BASE = 'http://localhost:5000';

interface SubUser {
  id: number;
  name: string;
  email: string;
  plan: string;
  credits: number;
  creditsBeforePro: number | null;
  mpSubscriptionId: string | null;
  nextBillingDate: string | null;
  role: string;
}

type ActionResult = { ok: boolean; message: string };

export default function SubscriptionTestPage() {
  const { user } = useAuth();
  const router   = useRouter();

  const [users,     setUsers]     = useState<SubUser[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [results,   setResults]   = useState<Record<number, ActionResult>>({});
  const [jobResult, setJobResult] = useState<string | null>(null);

  const token = () => localStorage.getItem('inmobiscrap_token') ?? '';

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/subscriptions/all-users`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} — ${body.slice(0, 200)}`);
      }
      setUsers(await res.json());
    } catch (e: any) {
      setFetchError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && user.role !== 'admin') { router.replace('/'); return; }
    if (user) fetchUsers();
  }, [user, router, fetchUsers]);

  const call = async (userId: number, path: string, body?: object) => {
    setResults(r => ({ ...r, [userId]: { ok: false, message: '…' } }));
    try {
      const res = await fetch(`${API_BASE}/api/admin/subscriptions/${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      setResults(r => ({ ...r, [userId]: { ok: res.ok, message: data.message ?? `status ${res.status}` } }));
      await fetchUsers();
    } catch (e: any) {
      setResults(r => ({ ...r, [userId]: { ok: false, message: e.message } }));
    }
  };

  const runExpiryJob = async () => {
    setJobResult('Ejecutando…');
    try {
      const res = await fetch(`${API_BASE}/api/admin/subscriptions/run-expiry-job`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json().catch(() => ({}));
      setJobResult(data.message ?? `status ${res.status}`);
      await fetchUsers();
    } catch (e: any) {
      setJobResult(e.message);
    }
  };

  const setExpireIn = async (userId: number, seconds: number) => {
    const date = new Date(Date.now() + seconds * 1000);
    await call(userId, `set-next-billing/${userId}`, { date: date.toISOString() });
  };

  if (!user) return null;
  if (user.role !== 'admin') return null;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: '"Syne", "Inter", sans-serif', padding: '40px 24px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.5px' }}>Panel de pruebas — Suscripciones</div>
            <div style={{ fontSize: '13px', color: C.muted, marginTop: '4px' }}>Solo visible para admins. Endpoints: /api/admin/subscriptions/*</div>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={runExpiryJob}
              style={{ background: `${C.warning}22`, border: `1px solid ${C.warning}55`, color: C.warning, borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              ▶ Run expiry job
            </button>
            <button
              onClick={fetchUsers}
              style={{ background: `${C.primary}15`, border: `1px solid ${C.primary}44`, color: C.primary, borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              ↻ Actualizar
            </button>
            <button
              onClick={() => router.push('/dashboards')}
              style={{ background: 'none', border: `1px solid ${C.border}`, color: C.muted, borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              ← Dashboard
            </button>
          </div>
        </div>

        {jobResult && (
          <div style={{ background: `${C.warning}12`, border: `1px solid ${C.warning}33`, borderRadius: '8px', padding: '10px 14px', marginBottom: '20px', fontSize: '13px', color: C.warning }}>
            Expiry job: {jobResult}
          </div>
        )}

        {/* Table */}
        {fetchError && (
          <div style={{ background: `${C.error}12`, border: `1px solid ${C.error}33`, borderRadius: '8px', padding: '14px 18px', marginBottom: '20px', fontSize: '13px', color: C.error }}>
            Error al cargar usuarios: {fetchError}
            <br /><span style={{ color: C.muted, fontSize: '11px' }}>¿Reconstruiste el Docker con los últimos cambios del backend?</span>
          </div>
        )}

        {loading ? (
          <div style={{ color: C.muted, textAlign: 'center', padding: '60px' }}>Cargando…</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {['ID', 'Email', 'Plan', 'Créditos', 'Créditos antes Pro', 'Suscripción MP', 'Próx. facturación', 'Acciones'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 12px', color: C.muted, fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: `1px solid ${C.border}22` }}>
                    <td style={{ padding: '10px 12px', color: C.muted }}>{u.id}</td>
                    <td style={{ padding: '10px 12px' }}>{u.email}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        background: u.plan === 'pro' ? `${C.accent}22` : `${C.muted}22`,
                        color: u.plan === 'pro' ? C.accent : C.muted,
                        borderRadius: '6px', padding: '2px 8px', fontSize: '11px', fontWeight: 700,
                      }}>
                        {u.plan.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: '"Space Mono", monospace' }}>{u.credits}</td>
                    <td style={{ padding: '10px 12px', color: C.muted, fontFamily: '"Space Mono", monospace' }}>
                      {u.creditsBeforePro ?? '—'}
                    </td>
                    <td style={{ padding: '10px 12px', color: C.muted, maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.mpSubscriptionId ? (
                        <span title={u.mpSubscriptionId} style={{ fontSize: '11px' }}>{u.mpSubscriptionId}</span>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', color: u.nextBillingDate ? C.warning : C.muted, whiteSpace: 'nowrap' }}>
                      {u.nextBillingDate
                        ? new Date(u.nextBillingDate).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })
                        : '—'}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {u.plan !== 'pro' ? (
                          <Btn color={C.accent} onClick={() => call(u.id, `activate-pro/${u.id}`)}>
                            + Pro
                          </Btn>
                        ) : (
                          <>
                            <Btn color={C.primary} onClick={() => call(u.id, `simulate-renewal/${u.id}`)}>
                              Renovar (webhook)
                            </Btn>
                            <Btn color={C.warning} onClick={() => setExpireIn(u.id, 10)}>
                              Vence en 10s
                            </Btn>
                            <Btn color={C.warning} onClick={() => setExpireIn(u.id, -1)}>
                              Vencer ya
                            </Btn>
                            <Btn color={C.success} onClick={() => call(u.id, `run-expiry-inline/${u.id}`)}>
                              Chequear expiración
                            </Btn>
                            <Btn color={C.error} onClick={() => call(u.id, `force-expire/${u.id}`)}>
                              Forzar baja
                            </Btn>
                          </>
                        )}
                      </div>
                      {results[u.id] && (
                        <div style={{ marginTop: '4px', fontSize: '11px', color: results[u.id].ok ? C.success : C.error }}>
                          {results[u.id].message}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px', color: C.muted }}>No hay usuarios.</div>
            )}
          </div>
        )}

        {/* Legend */}
        <div style={{ marginTop: '32px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '20px', fontSize: '13px', color: C.muted, lineHeight: 1.8 }}>
          <div style={{ fontWeight: 700, color: C.text, marginBottom: '8px' }}>Guía de acciones</div>
          <div><strong style={{ color: C.accent }}>+ Pro</strong> — Activa Pro (sin pagar). Guarda créditos actuales, NextBillingDate = hoy +1 mes.</div>
          <div><strong style={{ color: C.primary }}>Renovar (webhook)</strong> — Simula que MP cobró exitosamente: NextBillingDate = ahora +1 mes. Mismo código que el webhook real.</div>
          <div><strong style={{ color: C.warning }}>Vencer en 10s</strong> — Pone NextBillingDate = ahora +10 segundos. Luego usa "Chequear expiración".</div>
          <div><strong style={{ color: C.warning }}>Vencer ya</strong> — Pone NextBillingDate en el pasado. Luego usa "Chequear expiración" o "Run expiry job".</div>
          <div><strong style={{ color: C.success }}>Chequear expiración</strong> — Corre la lógica de expiración para este usuario ahora mismo (inline, sin Hangfire). Si ya venció → lo degrada.</div>
          <div><strong style={{ color: C.error }}>Forzar baja</strong> — Degrada a Base inmediatamente sin verificar fecha (útil para limpiar estado en pruebas).</div>
          <div><strong style={{ color: C.warning }}>▶ Run expiry job</strong> — Encola el job completo en Hangfire (aplica a TODOS los usuarios con NextBillingDate vencida).</div>
        </div>
      </div>
    </div>
  );
}

function Btn({ children, color, onClick }: { children: React.ReactNode; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: `${color}18`, border: `1px solid ${color}44`, color,
        borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: 700,
        cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  );
}
