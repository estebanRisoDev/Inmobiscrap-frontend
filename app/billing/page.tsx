'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

// ── Paleta (misma que page.tsx) ───────────────────────────────────────────────
const C = {
  bg:         '#080c10',
  surface:    '#0d1117',
  surfaceAlt: '#111820',
  border:     '#1e2d3d',
  primary:    '#00d4ff',
  secondary:  '#0066cc',
  accent:     '#00ff88',
  text:       '#e2eaf2',
  muted:      '#556070',
  dim:        '#1a2535',
  error:      '#ef4444',
  warning:    '#f59e0b',
};

// ── API base (mismo patrón que AuthContext) ───────────────────────────────────
const API_BASE = 'http://localhost:5000';

type PlanId = 'pack50' | 'pack100' | 'pack1000' | 'pro';

const PLANS = [
  {
    id: 'pack50' as PlanId,
    name: 'Pack Starter',
    price: '$2.000 CLP',
    credits: '+50 créditos',
    desc: 'Ideal para consultas ocasionales',
    featured: false,
  },
  {
    id: 'pack100' as PlanId,
    name: 'Pack Regular',
    price: '$3.000 CLP',
    credits: '+100 créditos',
    desc: 'Mejor costo/beneficio',
    featured: false,
  },
  {
    id: 'pack1000' as PlanId,
    name: 'Pack Intensivo',
    price: '$15.000 CLP',
    credits: '+1.000 créditos',
    desc: 'Para uso intensivo de métricas',
    featured: false,
  },
  {
    id: 'pro' as PlanId,
    name: 'Plan Pro ∞',
    price: '$100.000 CLP/mes',
    credits: 'Ilimitado',
    desc: 'Sin límites, todas las funciones',
    featured: true,
  },
];

// ── Estilos ───────────────────────────────────────────────────────────────────
const s = {
  page: {
    minHeight: '100vh',
    background: C.bg,
    color: C.text,
    fontFamily: '"Syne", "Inter", sans-serif',
    padding: '48px 24px',
  } as React.CSSProperties,

  inner: {
    maxWidth: '960px',
    margin: '0 auto',
  } as React.CSSProperties,

  heading: {
    fontSize: 'clamp(24px, 4vw, 36px)',
    fontWeight: 800,
    color: C.text,
    letterSpacing: '-1px',
    marginBottom: '8px',
  } as React.CSSProperties,

  subheading: {
    fontSize: '15px',
    color: C.muted,
    marginBottom: '36px',
  } as React.CSSProperties,

  errorBox: {
    background: `${C.error}15`,
    border: `1px solid ${C.error}44`,
    borderRadius: '10px',
    padding: '12px 16px',
    color: C.error,
    fontSize: '13px',
    marginBottom: '24px',
  } as React.CSSProperties,

  balanceBox: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: '12px',
    padding: '16px 20px',
    marginBottom: '32px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '14px',
    color: C.muted,
  } as React.CSSProperties,

  balanceValue: {
    fontFamily: '"Space Mono", monospace',
    fontWeight: 700,
    color: C.accent,
    fontSize: '16px',
  } as React.CSSProperties,

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
    gap: '16px',
    marginBottom: '36px',
  } as React.CSSProperties,

  card: (featured: boolean, hovered: boolean, preselected: boolean): React.CSSProperties => ({
    background: hovered ? C.surfaceAlt : C.surface,
    border: `1px solid ${featured ? C.accent + '55' : preselected ? C.primary : C.border}`,
    borderRadius: '14px',
    padding: '22px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
    boxShadow: featured
      ? `0 18px 60px ${C.accent}10`
      : hovered ? `0 12px 40px ${C.primary}15` : 'none',
    position: 'relative',
  }),

  popularBadge: {
    position: 'absolute',
    top: '-12px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: `linear-gradient(135deg, ${C.accent}, ${C.primary})`,
    color: '#000',
    fontSize: '10px',
    fontWeight: 800,
    letterSpacing: '1px',
    padding: '4px 12px',
    borderRadius: '999px',
    whiteSpace: 'nowrap',
  } as React.CSSProperties,

  planName: {
    fontSize: '16px',
    fontWeight: 800,
    color: C.text,
    letterSpacing: '-0.2px',
  } as React.CSSProperties,

  planPrice: {
    fontFamily: '"Space Mono", monospace',
    fontSize: '20px',
    fontWeight: 700,
    color: C.text,
  } as React.CSSProperties,

  planCredits: (featured: boolean): React.CSSProperties => ({
    fontSize: '13px',
    fontWeight: 700,
    color: featured ? C.accent : C.primary,
    fontFamily: '"Space Mono", monospace',
  }),

  planDesc: {
    fontSize: '13px',
    color: C.muted,
    lineHeight: 1.5,
    flexGrow: 1,
  } as React.CSSProperties,

  btn: (featured: boolean, disabled: boolean, active: boolean): React.CSSProperties => ({
    width: '100%',
    padding: '11px',
    border: 'none',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: 800,
    fontFamily: '"Syne", sans-serif',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled && !active ? 0.5 : 1,
    background: active
      ? `${C.accent}22`
      : featured
        ? `linear-gradient(135deg, ${C.accent}, ${C.primary})`
        : `linear-gradient(135deg, ${C.secondary}, ${C.primary})`,
    color: active ? C.accent : featured ? '#000' : '#fff',
    transition: 'opacity 0.2s',
  }),

  footer: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: '12px',
    padding: '16px 20px',
    textAlign: 'center',
    fontSize: '13px',
    color: C.muted,
    lineHeight: 1.7,
  } as React.CSSProperties,

  // Estados success/canceled/pending
  stateContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    gap: '20px',
    textAlign: 'center',
  } as React.CSSProperties,

  stateEmoji: { fontSize: '64px' } as React.CSSProperties,

  stateTitle: (color: string): React.CSSProperties => ({
    fontSize: '26px',
    fontWeight: 800,
    color,
    letterSpacing: '-0.5px',
  }),

  stateDesc: {
    fontSize: '15px',
    color: C.muted,
    maxWidth: '400px',
    lineHeight: 1.7,
  } as React.CSSProperties,

  stateBtn: (color: string): React.CSSProperties => ({
    padding: '12px 28px',
    background: color,
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: '"Syne", sans-serif',
  }),
};

// ── PlanCard ──────────────────────────────────────────────────────────────────
function PlanCard({
  plan,
  isCurrentPro,
  isPreselected,
  isLoading,
  onCheckout,
}: {
  plan: typeof PLANS[number];
  isCurrentPro: boolean;
  isPreselected: boolean;
  isLoading: boolean;
  onCheckout: (id: PlanId) => void;
}) {
  const [hovered, setHovered] = useState(false);

  const btnLabel = isCurrentPro
    ? '✓ Plan activo'
    : isLoading
      ? 'Redirigiendo…'
      : 'Pagar con MercadoPago';

  return (
    <div
      style={s.card(plan.featured, hovered, isPreselected)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {plan.featured && <div style={s.popularBadge}>★ POPULAR</div>}

      <div style={s.planName}>{plan.name}</div>
      <div style={s.planPrice}>{plan.price}</div>
      <div style={s.planCredits(plan.featured)}>{plan.credits}</div>
      <div style={s.planDesc}>{plan.desc}</div>

      <button
        style={s.btn(plan.featured, isLoading || isCurrentPro, isCurrentPro)}
        disabled={isLoading || isCurrentPro}
        onClick={() => !isCurrentPro && onCheckout(plan.id)}
      >
        {btnLabel}
      </button>
    </div>
  );
}

// ── BillingContent ────────────────────────────────────────────────────────────
function BillingContent() {
  const params = useSearchParams();
  const router = useRouter();
  const { user, refreshCredits } = useAuth();

  // Normaliza ?plan=pro y ?pack=packXXX
  const selectedPlanId = (params.get('plan') ?? params.get('pack')) as PlanId | null;

  const success   = params.get('success') === 'true';
  const canceled  = params.get('canceled') === 'true';
  const pending   = params.get('pending') === 'true';
  const paymentId = params.get('payment_id');

  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [error,       setError]       = useState<string | null>(null);
  const [verified,    setVerified]    = useState(false);

  // Verificar pago al volver de MP
  useEffect(() => {
    if (!success || !paymentId || verified) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/payments/verify/${paymentId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('inmobiscrap_token')}` },
        });
        const data = await res.json();
        if (data.status === 'approved' || data.status === 'already_applied') {
          await refreshCredits();
        }
      } catch { /* el webhook lo procesa igualmente */ }
      finally   { setVerified(true); }
    })();
  }, [success, paymentId, verified, refreshCredits]);

  const handleCheckout = async (planId: PlanId) => {
    setLoadingPlan(planId);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/payments/create-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('inmobiscrap_token')}`,
        },
        body: JSON.stringify({ planId }),
      });
      if (!res.ok) {
        const ct = res.headers.get('content-type') ?? '';
        const msg = ct.includes('application/json')
          ? (await res.json()).message
          : `Error ${res.status}`;
        throw new Error(msg ?? 'Error al iniciar el pago');
      }
      const { url } = await res.json();
      window.location.href = url;
    } catch (e: any) {
      setError(e.message);
      setLoadingPlan(null);
    }
  };

  // ── Estado: éxito ─────────────────────────────────────────────────────────
  if (success) return (
    <div style={s.page}>
      <div style={{ ...s.inner, ...s.stateContainer }}>
        <div style={s.stateEmoji}>🎉</div>
        <div style={s.stateTitle(C.accent)}>¡Pago procesado!</div>
        <div style={s.stateDesc}>
          {selectedPlanId === 'pro'
            ? 'Tu cuenta fue actualizada a Plan Pro. Ya tienes créditos ilimitados.'
            : `Créditos acreditados correctamente.${user ? ` Saldo actual: ${user.credits} créditos.` : ''}`}
        </div>
        <button style={s.stateBtn(C.secondary)} onClick={() => router.push('/dashboards')}>
          Ir al dashboard →
        </button>
      </div>
    </div>
  );

  // ── Estado: pendiente ─────────────────────────────────────────────────────
  if (pending) return (
    <div style={s.page}>
      <div style={{ ...s.inner, ...s.stateContainer }}>
        <div style={s.stateEmoji}>⏳</div>
        <div style={s.stateTitle(C.warning)}>Pago en revisión</div>
        <div style={s.stateDesc}>
          Tu pago está siendo procesado por MercadoPago. Los créditos se acreditarán
          automáticamente cuando se confirme el pago.
        </div>
        <button style={s.stateBtn(C.muted)} onClick={() => router.push('/dashboards')}>
          Volver al dashboard
        </button>
      </div>
    </div>
  );

  // ── Estado: cancelado ─────────────────────────────────────────────────────
  if (canceled) return (
    <div style={s.page}>
      <div style={{ ...s.inner, ...s.stateContainer }}>
        <div style={s.stateEmoji}>😕</div>
        <div style={s.stateTitle(C.muted)}>Pago cancelado</div>
        <div style={s.stateDesc}>
          No se realizó ningún cobro. Puedes intentarlo de nuevo cuando quieras.
        </div>
        <button style={s.stateBtn(C.secondary)} onClick={() => router.replace('/billing')}>
          Ver planes
        </button>
      </div>
    </div>
  );

  // ── Vista principal ───────────────────────────────────────────────────────
  return (
    <div style={s.page}>
      <div style={s.inner}>
        <div style={s.heading}>Recarga de créditos</div>
        <div style={s.subheading}>
          Paga con tarjeta, transferencia o efectivo a través de MercadoPago
        </div>

        {error && <div style={s.errorBox}>⚠ {error}</div>}

        {user && (
          <div style={s.balanceBox}>
            <span>💳 Saldo actual:</span>
            <span style={s.balanceValue}>
              {user.plan === 'pro' ? '∞ ilimitado (Pro)' : `${user.credits} créditos`}
            </span>
          </div>
        )}

        <div style={s.grid}>
          {PLANS.map((plan) => (
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

        <div style={s.footer}>
          <div style={{ fontWeight: 700, color: C.text, marginBottom: '4px' }}>
            Métodos de pago disponibles
          </div>
          Tarjeta de crédito/débito · Transferencia bancaria · Efectivo (Servipag, etc.)
          <br />
          Pagos procesados de forma segura por MercadoPago
        </div>
      </div>
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────
export default function BillingPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#080c10', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#556070', fontFamily: 'sans-serif' }}>
        Cargando…
      </div>
    }>
      <BillingContent />
    </Suspense>
  );
}