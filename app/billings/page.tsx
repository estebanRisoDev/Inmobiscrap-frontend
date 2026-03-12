'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const C = {
  bg:        '#080c10',
  surface:   '#0d1117',
  surfaceAlt:'#111820',
  border:    '#1e2d3d',
  primary:   '#00d4ff',
  secondary: '#0066cc',
  accent:    '#00ff88',
  text:      '#e2eaf2',
  muted:     '#556070',
  error:     '#ef4444',
  warning:   '#f59e0b',
  success:   '#22c55e',
};

const API_BASE = 'http://localhost:5000';

interface PaymentRecord {
  id: number;
  type: string;
  description: string;
  amountCLP: number;
  credits: number;
  mpId: string | null;
  createdAt: string;
}

interface SubStatus {
  active: boolean;
  isCancelled?: boolean;
  nextBillingDate?: string;
}

const TYPE_META: Record<string, { label: string; color: string; icon: string; bg: string }> = {
  pro_activated: { label: 'Plan Pro activado',    color: C.accent,   icon: '⚡', bg: '#00ff8818' },
  pro_renewed:   { label: 'Renovación Pro',        color: C.primary,  icon: '↻',  bg: '#00d4ff18' },
  pro_cancelled: { label: 'Suscripción cancelada', color: C.warning,  icon: '✕',  bg: '#f59e0b18' },
  pack50:        { label: 'Pack 50 créditos',       color: C.primary,  icon: '💳', bg: '#00d4ff12' },
  pack100:       { label: 'Pack 100 créditos',      color: C.primary,  icon: '💳', bg: '#00d4ff12' },
  pack1000:      { label: 'Pack 1000 créditos',     color: C.accent,   icon: '💳', bg: '#00ff8812' },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' });
}

function fmtDateLong(iso: string) {
  return new Date(iso).toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' });
}

function fmtCLP(n: number) {
  return n === 0 ? '—' : `$${n.toLocaleString('es-CL')} CLP`;
}

function BillingsContent() {
  const router  = useRouter();
  const params  = useSearchParams();
  const { user } = useAuth();

  const justCancelled = params.get('cancelled') === 'true';

  const [payments,  setPayments]  = useState<PaymentRecord[]>([]);
  const [subStatus, setSubStatus] = useState<SubStatus | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('inmobiscrap_token') ?? '';
    const go = async () => {
      setLoading(true); setError(null);
      try {
        const [hRes, sRes] = await Promise.all([
          fetch(`${API_BASE}/api/payments/history`,             { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE}/api/payments/subscription-status`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (!hRes.ok) throw new Error(`Error ${hRes.status} al cargar historial`);
        setPayments(await hRes.json());
        if (sRes.ok) setSubStatus(await sRes.json());
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    go();
  }, [user]);

  if (!user) return null;

  const isCancelledPro = subStatus?.active && subStatus?.isCancelled;
  const totalSpent     = payments.filter(p => p.amountCLP > 0).reduce((a, p) => a + p.amountCLP, 0);
  const totalCredits   = payments.filter(p => p.credits > 0).reduce((a, p) => a + p.credits, 0);

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: '"Syne", "Inter", sans-serif' }}>
      <style>{`body { margin: 0; background: #080c10; }`}</style>

      {/* ── Top nav ── */}
      <div style={{ padding: '16px 24px', borderBottom: `1px solid ${C.border}22`, display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={() => router.back()}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: C.muted, fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          ←
        </button>
        <span style={{ color: C.border, fontSize: '14px' }}>|</span>
        <span style={{ fontSize: '13px', color: C.muted }}>Mis compras</span>
      </div>

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: '36px' }}>
          <h1 style={{ fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 800, letterSpacing: '-0.8px', margin: '0 0 6px' }}>
            Historial de compras
          </h1>
          <p style={{ fontSize: '14px', color: C.muted, margin: 0 }}>
            Todos tus pagos y movimientos de suscripción
          </p>
        </div>

        {/* ── Cancellation alert (just cancelled) ── */}
        {justCancelled && (
          <div style={{
            borderLeft: `4px solid ${C.warning}`,
            background: `${C.warning}0d`,
            borderRadius: '0 12px 12px 0',
            padding: '18px 22px',
            marginBottom: '28px',
            display: 'flex', alignItems: 'flex-start', gap: '14px',
          }}>
            <div style={{
              width: '36px', height: '36px', flexShrink: 0, borderRadius: '50%',
              background: `${C.warning}20`, border: `1px solid ${C.warning}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '17px',
            }}>
              ⏳
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '14px', color: C.warning, marginBottom: '4px' }}>
                Has cancelado tu suscripción Pro
              </div>
              <div style={{ fontSize: '13px', color: C.muted, lineHeight: 1.65 }}>
                Pero seguirás teniéndola hasta el{' '}
                {subStatus?.nextBillingDate
                  ? <strong style={{ color: C.text }}>{fmtDateLong(subStatus.nextBillingDate)}</strong>
                  : 'final del período actual'}.
                {' '}Luego volverás a Base con tus créditos anteriores restaurados.
              </div>
            </div>
          </div>
        )}

        {/* ── Cancelled-Pro info banner (normal visit) ── */}
        {!justCancelled && isCancelledPro && subStatus?.nextBillingDate && (
          <div style={{
            background: `${C.warning}0a`, border: `1px solid ${C.warning}25`,
            borderRadius: '12px', padding: '14px 18px', marginBottom: '28px',
            display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px',
          }}>
            <span style={{ fontSize: '16px' }}>⏳</span>
            <span style={{ color: C.muted }}>
              Suscripción Pro cancelada —{' '}
              <strong style={{ color: C.warning }}>Acceso activo hasta el {fmtDateLong(subStatus.nextBillingDate)}</strong>
            </span>
          </div>
        )}

        {/* ── Stats ── */}
        {!loading && payments.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '32px' }}>
            {[
              { label: 'Total gastado', value: fmtCLP(totalSpent), color: C.primary, icon: '💳' },
              { label: 'Créditos comprados', value: totalCredits > 0 ? `+${totalCredits.toLocaleString('es-CL')}` : '—', color: C.accent, icon: '⚡' },
              { label: 'Movimientos', value: String(payments.length), color: C.muted, icon: '📋' },
            ].map(s => (
              <div key={s.label} style={{
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: '12px', padding: '16px 18px',
              }}>
                <div style={{ fontSize: '11px', color: C.muted, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{s.icon}</span>{s.label}
                </div>
                <div style={{ fontFamily: '"Space Mono", monospace', fontWeight: 700, fontSize: '18px', color: s.color }}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div style={{ background: `${C.error}12`, border: `1px solid ${C.error}30`, borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: C.error }}>
            ⚠ {error}
          </div>
        )}

        {/* ── Content ── */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 0', gap: '12px' }}>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <div style={{ width: 28, height: 28, border: `2px solid ${C.border}`, borderTopColor: C.primary, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ color: C.muted, fontSize: '13px' }}>Cargando historial…</span>
          </div>
        ) : payments.length === 0 ? (
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: '16px', padding: '64px 32px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🧾</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: C.text, marginBottom: '8px' }}>Sin compras aún</div>
            <div style={{ fontSize: '13px', color: C.muted, lineHeight: 1.6, maxWidth: '300px', margin: '0 auto 24px' }}>
              Aquí aparecerán todos tus pagos, créditos y movimientos de suscripción.
            </div>
            <button
              onClick={() => router.push('/billing')}
              style={{
                background: `linear-gradient(135deg, ${C.secondary}, ${C.primary})`,
                border: 'none', color: '#fff', borderRadius: '10px',
                padding: '10px 22px', fontSize: '13px', fontWeight: 700,
                cursor: 'pointer', fontFamily: '"Syne", sans-serif',
              }}
            >
              Ver planes →
            </button>
          </div>
        ) : (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden' }}>

            {/* Table header */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 80px',
              padding: '12px 20px',
              borderBottom: `1px solid ${C.border}`,
              fontSize: '11px', fontWeight: 700, color: C.muted,
              letterSpacing: '0.5px', textTransform: 'uppercase',
            }}>
              <span>Fecha</span>
              <span>Concepto</span>
              <span>Monto</span>
              <span style={{ textAlign: 'right' }}>Créditos</span>
            </div>

            {/* Rows */}
            {payments.map((p, i) => {
              const meta = TYPE_META[p.type] ?? { label: p.type, color: C.muted, icon: '•', bg: `${C.muted}12` };
              return (
                <div
                  key={p.id}
                  style={{
                    display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 80px',
                    padding: '14px 20px', alignItems: 'center',
                    borderBottom: i < payments.length - 1 ? `1px solid ${C.border}22` : 'none',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = C.surfaceAlt)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Date */}
                  <div style={{ fontSize: '12px', color: C.muted, fontFamily: '"Space Mono", monospace', lineHeight: 1.4 }}>
                    {fmtDate(p.createdAt)}
                  </div>

                  {/* Concept */}
                  <div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                      <div style={{
                        width: '24px', height: '24px', borderRadius: '6px',
                        background: meta.bg, border: `1px solid ${meta.color}25`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '12px', flexShrink: 0,
                      }}>
                        {meta.icon}
                      </div>
                      <span style={{
                        fontSize: '12px', fontWeight: 700, color: meta.color,
                        background: meta.bg, border: `1px solid ${meta.color}25`,
                        borderRadius: '6px', padding: '2px 8px',
                      }}>
                        {meta.label}
                      </span>
                    </div>
                    {p.description && (
                      <div style={{ fontSize: '11px', color: C.muted, marginTop: '1px', paddingLeft: '2px' }}>
                        {p.description}
                      </div>
                    )}
                  </div>

                  {/* Amount */}
                  <div style={{
                    fontFamily: '"Space Mono", monospace', fontSize: '13px', fontWeight: 700,
                    color: p.amountCLP > 0 ? C.text : C.muted,
                  }}>
                    {fmtCLP(p.amountCLP)}
                  </div>

                  {/* Credits */}
                  <div style={{
                    fontFamily: '"Space Mono", monospace', fontSize: '13px', fontWeight: 700,
                    color: p.credits > 0 ? C.accent : C.muted, textAlign: 'right',
                  }}>
                    {p.credits > 0 ? `+${p.credits}` : '—'}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer note */}
        {!loading && payments.length > 0 && (
          <div style={{ marginTop: '16px', fontSize: '12px', color: C.muted, textAlign: 'center' }}>
            Últimos {payments.length} movimientos · Procesados por MercadoPago
          </div>
        )}
      </div>
    </div>
  );
}

export default function BillingsPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#080c10', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#556070', fontFamily: '"Syne", sans-serif', fontSize: '14px' }}>
        Cargando…
      </div>
    }>
      <BillingsContent />
    </Suspense>
  );
}
