'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
  dim:       '#1a2535',
  error:     '#ef4444',
  warning:   '#f59e0b',
};

const API_BASE = 'http://localhost:5000';

type PlanId = 'pack50' | 'pack100' | 'pack1000' | 'pro';

const PLANS = [
  { id: 'pack50'   as PlanId, name: 'Pack Starter',   price: '$2.000',   period: 'CLP',     credits: 50,    desc: 'Ideal para consultas ocasionales', featured: false, icon: '🚀' },
  { id: 'pack100'  as PlanId, name: 'Pack Regular',    price: '$3.000',   period: 'CLP',     credits: 100,   desc: 'La opción más popular entre usuarios', featured: false, icon: '⚡' },
  { id: 'pack1000' as PlanId, name: 'Pack Intensivo',  price: '$15.000',  period: 'CLP',     credits: 1000,  desc: 'Para análisis de mercado intensivo', featured: false, icon: '🔥' },
  { id: 'pro'      as PlanId, name: 'Plan Pro',        price: '$100.000', period: 'CLP/mes', credits: 0,     desc: 'Acceso ilimitado a todas las métricas y dashboards', featured: true, icon: '∞',
    features: ['Consultas ilimitadas sin créditos', 'Acceso a data de ventas del mercado', 'Alertas por email cuando baja el precio de propiedades'] },
];

// ── PlanCard ──────────────────────────────────────────────────────────────────
function PlanCard({ plan, isCurrentPro, isPreselected, isLoading, onCheckout }: {
  plan: typeof PLANS[number];
  isCurrentPro: boolean;
  isPreselected: boolean;
  isLoading: boolean;
  onCheckout: (id: PlanId) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isDisabled = isLoading || isCurrentPro;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        background: plan.featured
          ? `linear-gradient(145deg, #0d1f14 0%, #0d1117 100%)`
          : hovered ? C.surfaceAlt : C.surface,
        border: `1px solid ${
          plan.featured ? C.accent + '44'
          : isPreselected ? C.primary + '55'
          : hovered ? C.primary + '33'
          : C.border + '88'
        }`,
        borderRadius: '16px',
        padding: '28px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '0',
        cursor: isDisabled ? 'default' : 'pointer',
        transition: 'all 0.25s ease',
        transform: hovered && !isDisabled ? 'translateY(-6px)' : 'translateY(0)',
        boxShadow: plan.featured
          ? `0 0 40px ${C.accent}12, 0 20px 60px rgba(0,0,0,0.4)`
          : hovered
          ? `0 16px 48px rgba(0,0,0,0.3), 0 0 0 1px ${C.primary}22`
          : '0 4px 20px rgba(0,0,0,0.2)',
      }}
    >
      {plan.featured && (
        <div style={{
          position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)',
          background: `linear-gradient(135deg, ${C.accent}, ${C.primary})`,
          color: '#000', fontSize: '10px', fontWeight: 800, letterSpacing: '1.5px',
          padding: '4px 14px', borderRadius: '999px', whiteSpace: 'nowrap',
        }}>
          ★ MÁS POPULAR
        </div>
      )}

      {/* Icon + Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '10px',
          background: plan.featured ? `${C.accent}18` : `${C.primary}12`,
          border: `1px solid ${plan.featured ? C.accent + '33' : C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: plan.id === 'pro' ? '20px' : '18px',
          color: plan.featured ? C.accent : C.primary,
          fontWeight: 800,
        }}>
          {plan.icon}
        </div>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: C.text, letterSpacing: '-0.2px' }}>{plan.name}</div>
          {plan.featured && <div style={{ fontSize: '10px', color: C.accent, fontWeight: 700, letterSpacing: '0.5px' }}>SUSCRIPCIÓN MENSUAL</div>}
        </div>
      </div>

      {/* Price */}
      <div style={{ marginBottom: '8px' }}>
        <span style={{
          fontFamily: '"Space Mono", monospace',
          fontSize: '28px', fontWeight: 700,
          color: plan.featured ? C.accent : C.text,
          letterSpacing: '-1px',
        }}>
          {plan.price}
        </span>
        <span style={{ fontSize: '13px', color: C.muted, marginLeft: '4px' }}>{plan.period}</span>
      </div>

      {/* Credits */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        background: plan.featured ? `${C.accent}12` : `${C.primary}10`,
        border: `1px solid ${plan.featured ? C.accent + '25' : C.primary + '20'}`,
        borderRadius: '8px', padding: '5px 10px',
        marginBottom: '14px', alignSelf: 'flex-start',
      }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: plan.featured ? C.accent : C.primary, fontFamily: '"Space Mono", monospace' }}>
          {plan.credits > 0 ? `+${plan.credits.toLocaleString('es-CL')} créditos` : '∞ Ilimitado'}
        </span>
      </div>

      {/* Desc / Features */}
      {'features' in plan && plan.features ? (
        <div style={{ flexGrow: 1, marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {(plan.features as string[]).map((f) => (
            <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <span style={{ color: C.accent, fontWeight: 700, fontSize: '13px', lineHeight: 1.55, flexShrink: 0 }}>✓</span>
              <span style={{ fontSize: '13px', color: C.muted, lineHeight: 1.55 }}>{f}</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: '13px', color: C.muted, lineHeight: 1.55, flexGrow: 1, marginBottom: '20px' }}>
          {plan.desc}
        </div>
      )}

      {/* Button */}
      <button
        disabled={isDisabled}
        onClick={() => !isDisabled && onCheckout(plan.id)}
        style={{
          width: '100%', padding: '12px', borderRadius: '10px',
          fontSize: '13px', fontWeight: 800, fontFamily: '"Syne", sans-serif',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          ...(isCurrentPro ? {
            background: `${C.accent}15`,
            color: C.accent,
            border: `1px solid ${C.accent}33`,
          } : isLoading ? {
            background: C.dim, color: C.muted, opacity: 0.7, border: 'none',
          } : plan.featured ? {
            background: `linear-gradient(135deg, ${C.accent} 0%, #00b8d9 100%)`,
            color: '#000', border: 'none',
            boxShadow: `0 4px 20px ${C.accent}40`,
          } : {
            background: `linear-gradient(135deg, ${C.secondary} 0%, ${C.primary} 100%)`,
            color: '#fff', border: 'none',
          }),
        }}
      >
        {isCurrentPro ? '✓ Plan activo' : isLoading ? 'Redirigiendo…' : 'Pagar con MercadoPago →'}
      </button>
    </div>
  );
}

// ── StateScreen ───────────────────────────────────────────────────────────────
function StateScreen({ emoji, title, titleColor, desc, btnLabel, btnColor, onBtn }: {
  emoji: string; title: string; titleColor: string; desc: string;
  btnLabel: string; btnColor: string; onBtn: () => void;
}) {
  return (
    <div style={{
      minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '"Syne", "Inter", sans-serif',
    }}>
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: '20px', padding: '56px 48px', maxWidth: '440px', width: '100%',
        textAlign: 'center', margin: '24px',
        boxShadow: '0 32px 80px rgba(0,0,0,0.4)',
      }}>
        <div style={{ fontSize: '64px', marginBottom: '20px', lineHeight: 1 }}>{emoji}</div>
        <div style={{ fontSize: '24px', fontWeight: 800, color: titleColor, letterSpacing: '-0.5px', marginBottom: '12px' }}>{title}</div>
        <div style={{ fontSize: '14px', color: C.muted, lineHeight: 1.7, marginBottom: '28px' }}>{desc}</div>
        <button
          onClick={onBtn}
          style={{
            padding: '12px 32px', background: btnColor, color: '#fff', border: 'none',
            borderRadius: '10px', fontSize: '14px', fontWeight: 700,
            cursor: 'pointer', fontFamily: '"Syne", sans-serif',
            boxShadow: `0 4px 16px ${btnColor}40`,
          }}
        >
          {btnLabel}
        </button>
      </div>
    </div>
  );
}

// ── BillingContent ────────────────────────────────────────────────────────────
function BillingContent() {
  const params = useSearchParams();
  const router = useRouter();
  const { user, refreshCredits } = useAuth();

  // When MP redirects to ngrok URL, localStorage won't have the JWT token
  // (it was saved on localhost origin). Redirect to localhost preserving query params.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const { hostname, search } = window.location;
    const token = localStorage.getItem('inmobiscrap_token');
    if (!token && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      window.location.href = `http://localhost:3000/billing${search}`;
    }
  }, []);

  const selectedPlanId = (params.get('plan') ?? params.get('pack')) as PlanId | null;
  const success        = params.get('success') === 'true';
  const canceled       = params.get('canceled') === 'true';
  const pending        = params.get('pending') === 'true';
  const paymentId      = params.get('payment_id') ?? params.get('collection_id') ?? null;
  // MP may append ?preapproval_id= to back_url that already has ?, creating a double ?
  // e.g. billing?success=true&plan=pro?preapproval_id=xxx — so we also parse from the raw URL
  const preapprovalId  = params.get('preapproval_id')
    ?? (typeof window !== 'undefined' ? new URL(window.location.href.replace(/\?preapproval_id=/, '&preapproval_id=')).searchParams.get('preapproval_id') : null);

  const [loadingPlan,   setLoadingPlan]   = useState<PlanId | null>(null);
  const [error,         setError]         = useState<string | null>(null);
  const [verified,      setVerified]      = useState(false);
  const [verifying,     setVerifying]     = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [canceling,     setCanceling]     = useState(false);
  const [cancelError,   setCancelError]   = useState<string | null>(null);
  const [nextBilling,   setNextBilling]   = useState<string | null>(null);
  const [isCancelled,   setIsCancelled]   = useState(false);

  useEffect(() => {
    if (user?.plan !== 'pro') return;
    const token = localStorage.getItem('inmobiscrap_token');
    if (!token) return;
    fetch(`${API_BASE}/api/payments/subscription-status`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.nextBillingDate) setNextBilling(d.nextBillingDate);
        if (d?.isCancelled)     setIsCancelled(true);
      })
      .catch(() => {});
  }, [user?.plan]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!success || verified) return;
    setVerifying(true);
    const run = async () => {
      const token = localStorage.getItem('inmobiscrap_token');
      // 1) Direct preapproval verification (Pro subscription)
      const resolvedPreapprovalId = preapprovalId || localStorage.getItem('inmobiscrap_preapproval_id');
      if (resolvedPreapprovalId) {
        try {
          const res  = await fetch(`${API_BASE}/api/payments/verify-subscription/${resolvedPreapprovalId}`, { headers: { Authorization: `Bearer ${token}` } });
          const data = await res.json();
          if (data.status === 'approved') {
            await refreshCredits();
          } else {
            // Preapproval not yet authorized — poll until plan changes or timeout
            const prevPlan = user?.plan ?? 'base';
            for (let i = 0; i < 12; i++) {
              await new Promise(r => setTimeout(r, 2500));
              try {
                const pollRes  = await fetch(`${API_BASE}/api/auth/credits`, { headers: { Authorization: `Bearer ${token}` } });
                const pollData = await pollRes.json();
                if (pollData.plan !== prevPlan) break;
              } catch { /* retry */ }
            }
            await refreshCredits();
          }
        } catch { await refreshCredits(); }
        localStorage.removeItem('inmobiscrap_preapproval_id');
        setVerifying(false); setVerified(true); return;
      }
      // 2) Direct payment verification (credit packs)
      if (paymentId) {
        try {
          const res  = await fetch(`${API_BASE}/api/payments/verify/${paymentId}`, { headers: { Authorization: `Bearer ${token}` } });
          const data = await res.json();
          if (data.status === 'approved' || data.status === 'already_applied') await refreshCredits();
        } catch { await refreshCredits(); }
        setVerifying(false); setVerified(true); return;
      }
      // 3) Fallback: poll for changes (when no ID is available)
      const prev = user?.credits ?? 0; const prevPlan = user?.plan ?? 'base';
      for (let i = 0; i < 12; i++) {
        await new Promise(r => setTimeout(r, 2500));
        try {
          const res  = await fetch(`${API_BASE}/api/auth/credits`, { headers: { Authorization: `Bearer ${token}` } });
          const data = await res.json();
          if (data.credits !== prev || data.plan !== prevPlan) { await refreshCredits(); break; }
        } catch { /* retry */ }
      }
      await refreshCredits(); setVerifying(false); setVerified(true);
    };
    run();
  }, [success, paymentId, preapprovalId, verified]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCancel = async () => {
    setCanceling(true); setCancelError(null);
    try {
      const res = await fetch(`${API_BASE}/api/payments/cancel-subscription`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('inmobiscrap_token')}` },
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message ?? `Error ${res.status}`);
      }
      await res.json(); await refreshCredits();
      router.push('/billings?cancelled=true');
    } catch (e: any) {
      setCancelError(e.message);
    } finally {
      setCanceling(false);
    }
  };

  const handleCheckout = async (planId: PlanId) => {
    setLoadingPlan(planId); setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/payments/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('inmobiscrap_token')}` },
        body: JSON.stringify({ planId }),
      });
      if (!res.ok) {
        const ct  = res.headers.get('content-type') ?? '';
        const msg = ct.includes('application/json') ? (await res.json()).message : `Error ${res.status}`;
        throw new Error(msg ?? 'Error al iniciar el pago');
      }
      const data = await res.json();
      if (data.preapprovalId) {
        localStorage.setItem('inmobiscrap_preapproval_id', data.preapprovalId);
      }
      window.location.href = data.url;
    } catch (e: any) {
      setError(e.message); setLoadingPlan(null);
    }
  };

  // ── State screens ──────────────────────────────────────────────────────────
  if (success) {
    if (verifying) return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"Syne", sans-serif' }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: 36, height: 36, border: `3px solid ${C.border}`, borderTopColor: C.primary, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <div style={{ fontSize: '18px', fontWeight: 700, color: C.primary }}>Verificando pago…</div>
          <div style={{ fontSize: '13px', color: C.muted }}>Confirmando tu pago con MercadoPago</div>
        </div>
      </div>
    );
    return <StateScreen
      emoji="🎉"
      title="¡Pago procesado!"
      titleColor={C.accent}
      desc={selectedPlanId === 'pro'
        ? (user?.plan === 'pro'
          ? 'Tu cuenta fue actualizada a Plan Pro. Ya tienes acceso ilimitado a todas las métricas.'
          : 'Tu pago fue recibido. El plan se activará en breve.')
        : `Créditos acreditados correctamente.${user ? ` Saldo actual: ${user.credits} créditos.` : ''}`}
      btnLabel="Ir al dashboard →"
      btnColor={C.secondary}
      onBtn={() => router.push('/dashboards')}
    />;
  }

  if (pending) return <StateScreen
    emoji="⏳" title="Pago en revisión" titleColor={C.warning}
    desc="Tu pago está siendo procesado. Los créditos se acreditarán automáticamente una vez aprobado."
    btnLabel="Volver al dashboard" btnColor={C.muted}
    onBtn={() => router.push('/dashboards')}
  />;

  if (canceled) return <StateScreen
    emoji="😕" title="Pago no completado" titleColor={C.muted}
    desc="No se realizó ningún cobro. Puedes intentarlo de nuevo cuando quieras."
    btnLabel="Ver planes de nuevo" btnColor={C.secondary}
    onBtn={() => router.replace('/billing')}
  />;

  // ── Main view ──────────────────────────────────────────────────────────────
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: '"Syne", "Inter", sans-serif' }}>
      <style>{`
        body { margin: 0; background: #080c10; }
        @keyframes glow-pulse { 0%,100% { opacity:.6; } 50% { opacity:1; } }
      `}</style>

      {/* ── Top nav ── */}
      <div style={{ padding: '16px 24px', borderBottom: `1px solid ${C.border}22`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          onClick={() => router.back()}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: C.muted, fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: '6px 0' }}
        >
          ← Volver
        </button>
        {user && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: '999px', padding: '6px 14px',
            fontSize: '13px', color: C.muted,
          }}>
            <span>💳</span>
            <span style={{ fontFamily: '"Space Mono", monospace', fontWeight: 700, color: user.plan === 'pro' ? C.accent : C.primary }}>
              {user.plan === 'pro' ? '∞ Pro' : `${user.credits} créditos`}
            </span>
          </div>
        )}
      </div>

      <div style={{ maxWidth: '1020px', margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* ── Hero ── */}
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <div style={{ display: 'inline-block', background: `${C.primary}12`, border: `1px solid ${C.primary}25`, borderRadius: '999px', padding: '5px 14px', fontSize: '12px', fontWeight: 700, color: C.primary, letterSpacing: '0.5px', marginBottom: '16px' }}>
            PLANES & CRÉDITOS
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 800, color: C.text, letterSpacing: '-1.5px', margin: '0 0 12px' }}>
            Elige tu plan
          </h1>
          <p style={{ fontSize: '15px', color: C.muted, maxWidth: '480px', margin: '0 auto', lineHeight: 1.7 }}>
            Compra créditos para consultas puntuales o suscríbete al Plan Pro y obtén acceso ilimitado.
          </p>
        </div>

        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            background: `${C.error}12`, border: `1px solid ${C.error}33`,
            borderRadius: '10px', padding: '12px 16px', marginBottom: '28px',
            fontSize: '13px', color: C.error,
          }}>
            <span>⚠</span><span>{error}</span>
          </div>
        )}

        {/* ── Pro management block ── */}
        {user?.plan === 'pro' && (
          <div style={{
            background: isCancelled ? `${C.warning}08` : `${C.accent}06`,
            border: `1px solid ${isCancelled ? C.warning + '33' : C.accent + '25'}`,
            borderRadius: '16px', padding: '24px 28px', marginBottom: '40px',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
                  background: isCancelled ? `${C.warning}15` : `${C.accent}15`,
                  border: `1px solid ${isCancelled ? C.warning + '30' : C.accent + '30'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '20px',
                }}>
                  {isCancelled ? '⏳' : '✦'}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '15px', color: C.text }}>
                    {isCancelled ? 'Renovación cancelada' : 'Plan Pro activo'}
                  </div>
                  <div style={{ fontSize: '13px', color: C.muted, marginTop: '2px' }}>
                    {isCancelled
                      ? `Acceso Pro hasta el ${nextBilling ? new Date(nextBilling).toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' }) : 'fin del período'}`
                      : nextBilling
                        ? `Próxima facturación: ${fmtDate(nextBilling)}`
                        : 'Suscripción mensual activa'}
                  </div>
                </div>
              </div>

              {!isCancelled && !cancelConfirm && (
                <button
                  onClick={() => setCancelConfirm(true)}
                  style={{
                    background: 'none', border: `1px solid ${C.error}44`, color: C.error,
                    borderRadius: '8px', padding: '8px 16px', fontSize: '12px', fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0,
                  }}
                >
                  Cancelar suscripción
                </button>
              )}
            </div>

            {/* Confirm cancel */}
            {!isCancelled && cancelConfirm && (
              <div style={{
                marginTop: '20px', paddingTop: '20px', borderTop: `1px solid ${C.border}`,
              }}>
                <div style={{ fontSize: '13px', color: C.muted, marginBottom: '14px', lineHeight: 1.6 }}>
                  Al cancelar, detenemos el cobro mensual pero{' '}
                  <strong style={{ color: C.text }}>sigues siendo Pro hasta el final del período actual</strong>.
                  Luego vuelves a Base con tus créditos anteriores.
                </div>
                {cancelError && (
                  <div style={{ background: `${C.error}12`, border: `1px solid ${C.error}33`, borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: C.error, marginBottom: '12px' }}>
                    ⚠ {cancelError}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    disabled={canceling}
                    onClick={handleCancel}
                    style={{
                      background: C.error, border: 'none', color: '#fff',
                      borderRadius: '8px', padding: '9px 20px', fontSize: '13px', fontWeight: 700,
                      cursor: canceling ? 'not-allowed' : 'pointer', opacity: canceling ? 0.6 : 1,
                      fontFamily: '"Syne", sans-serif',
                    }}
                  >
                    {canceling ? 'Cancelando…' : 'Confirmar cancelación'}
                  </button>
                  <button
                    disabled={canceling}
                    onClick={() => { setCancelConfirm(false); setCancelError(null); }}
                    style={{
                      background: 'none', border: `1px solid ${C.border}`, color: C.muted,
                      borderRadius: '8px', padding: '9px 20px', fontSize: '13px', fontWeight: 700,
                      cursor: 'pointer', fontFamily: '"Syne", sans-serif',
                    }}
                  >
                    No, mantener Pro
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Plan grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '48px' }}>
          {PLANS.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrentPro={user?.plan === 'pro' && plan.id === 'pro'}
              isPreselected={selectedPlanId === plan.id}
              isLoading={loadingPlan === plan.id}
              onCheckout={handleCheckout}
            />
          ))}
        </div>

        {/* ── Footer ── */}
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: '14px', padding: '20px 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '12px',
        }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: C.text, marginBottom: '4px' }}>Pagos procesados por MercadoPago</div>
            <div style={{ fontSize: '12px', color: C.muted }}>Tarjeta de crédito/débito · Transferencia · Efectivo (Servipag)</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: C.muted }}>
            <span style={{ fontSize: '16px' }}>🔒</span>
            <span>Pago 100% seguro</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#080c10', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#556070', fontFamily: '"Syne", sans-serif', fontSize: '14px' }}>
        Cargando…
      </div>
    }>
      <BillingContent />
    </Suspense>
  );
}
