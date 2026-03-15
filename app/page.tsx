'use client';
// app/page.tsx — Landing page de InmobiScrap (focus métricas + planes)

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

// ── Paleta ────────────────────────────────────────────────────────────────────
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
  warning:     '#f59e0b',
  creditHigh:  '#00ff88',
  creditMid:   '#f59e0b',
  creditLow:   '#ef4444',
};

// ── Features ──────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: '📈',
    title: 'Métricas de Mercado',
    desc: 'Distribución por tipo, precios promedio, comunas top, tendencias mensuales y comparativas en un solo lugar.',
  },
  {
    icon: '🧠',
    title: 'Datos Estructurados con LLM',
    desc: 'Claude 4.6 Sonnet via AWS Bedrock normaliza y enriquece datos para que puedas analizar sin ruido.',
  },
  {
    icon: '⚡',
    title: 'Actualización Recurrente',
    desc: 'Los dashboards se alimentan con ejecuciones programadas y controladas. Tú solo consumes insights.',
  },
  {
    icon: '🔎',
    title: 'Trazabilidad',
    desc: 'Logs y auditoría por ejecución para entender cobertura, calidad de extracción y variaciones.',
  },
  {
    icon: '🔐',
    title: 'Acceso Seguro',
    desc: 'Auth JWT + OAuth. Roles Admin/Pro. El acceso a métricas y créditos se valida del lado servidor.',
  },
  {
    icon: '🗓️',
    title: 'Programación',
    desc: 'Ejecuciones automáticas (cron) y recolección continua para que tus métricas no queden desactualizadas.',
  },
];

const SOURCES = [
  'Portal Inmobiliario', 'Yapo', 'TocToc', 'Mercado Libre', 'GoPlaceIt', 'iCasas',
];

const STACK = [
  { label: '.NET 9',       color: '#512BD4' },
  { label: 'Next.js 15',   color: '#ffffff' },
  { label: 'PostgreSQL',   color: '#336791' },
  { label: 'AWS Bedrock',  color: '#FF9900' },
  { label: 'Playwright',   color: '#45ba4b' },
  { label: 'Hangfire',     color: '#e85d3c' },
  { label: 'SignalR',      color: '#00d4ff' },
  { label: 'Claude 4.6',   color: '#cc9b7a' },
];

const INITIAL_CREDITS = 50;

// ── Planes ────────────────────────────────────────────────────────────────────
const PLANS = [
  {
    id: 'base',
    name: 'Base',
    priceCLP: 0,
    badge: 'Gratis',
    highlights: ['50 créditos iniciales', 'Recarga diaria: +20', 'Acceso a dashboards'],
    cta: 'Empezar',
  },
  {
    id: 'pack50',
    name: 'Pack 50',
    priceCLP: 2000,
    badge: 'Créditos',
    highlights: ['+50 créditos', 'Ideal para pruebas', 'Uso bajo demanda'],
    cta: 'Comprar créditos',
  },
  {
    id: 'pack100',
    name: 'Pack 100',
    priceCLP: 3000,
    badge: 'Créditos',
    highlights: ['+100 créditos', 'Mejor costo/beneficio', 'Uso bajo demanda'],
    cta: 'Comprar créditos',
  },
  {
    id: 'pack1000',
    name: 'Pack 1000',
    priceCLP: 15000,
    badge: 'Créditos',
    highlights: ['+1000 créditos', 'Para uso intensivo', 'Uso bajo demanda'],
    cta: 'Comprar créditos',
  },
  {
    id: 'pro',
    name: 'Pro',
    priceCLP: 100000,
    badge: 'Ilimitado',
    highlights: ['Consultas ilimitadas sin créditos', 'Acceso a data de ventas del mercado', 'Alertas por email cuando baja el precio de propiedades'],
    cta: 'Actualizar a Pro',
    featured: true,
  },
];

function formatCLP(n: number) {
  if (n === 0) return 'Gratis';
  return n.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
}

// ── Animación de terminal ─────────────────────────────────────────────────────
const TERMINAL_LINES = [
  { delay: 0,    text: '$ inmobiscrap metrics --latest',            color: C.accent },
  { delay: 600,  text: '📊 Cargando dashboard: RM · Últimos 30 días', color: C.text   },
  { delay: 1200, text: '📈 Tendencia precio promedio: +3.2% MoM',     color: C.primary},
  { delay: 1800, text: '🏙️ Comuna top: Ñuñoa · 214 publicaciones',     color: C.text   },
  { delay: 2400, text: '🏷️ Tipo dominante: Departamento (62%)',       color: C.accent },
  { delay: 3000, text: '✅ Métricas listas. Fuente: 6 portales',       color: C.accent },
  { delay: 3600, text: '🔎 Calidad extracción: 98.1% campos completos', color: C.primary},
];

function getCreditColor(credits: number): string {
  if (credits <= 0)  return C.creditLow;
  if (credits <= 10) return C.creditMid;
  return C.creditHigh;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function Terminal() {
  const [visibleLines, setVisibleLines] = useState<number[]>([]);

  useEffect(() => {
    const timers = TERMINAL_LINES.map((line, i) =>
      setTimeout(() => setVisibleLines((prev) => [...prev, i]), line.delay + 800)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div style={s.terminal}>
      <div style={s.terminalBar}>
        <span style={{ ...s.dot, background: '#ff5f57' }} />
        <span style={{ ...s.dot, background: '#ffbd2e' }} />
        <span style={{ ...s.dot, background: '#28c840' }} />
        <span style={s.terminalTitle}>inmobiscrap — zsh</span>
      </div>
      <div style={s.terminalBody}>
        {TERMINAL_LINES.map((line, i) => (
          <div
            key={i}
            style={{
              ...s.terminalLine,
              color: line.color,
              opacity: visibleLines.includes(i) ? 1 : 0,
              transform: visibleLines.includes(i) ? 'translateY(0)' : 'translateY(6px)',
              transition: 'opacity 0.4s ease, transform 0.4s ease',
            }}
          >
            {line.text}
          </div>
        ))}
        <div style={{ ...s.terminalLine, color: C.accent, opacity: visibleLines.length === TERMINAL_LINES.length ? 1 : 0 }}>
          <span style={s.cursor}>▌</span>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{
        ...s.featureCard,
        borderColor: hovered ? C.primary + '55' : C.border,
        background: hovered ? C.surfaceAlt : C.surface,
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hovered ? `0 12px 40px ${C.primary}15` : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={s.featureIcon}>{icon}</div>
      <div style={s.featureTitle}>{title}</div>
      <div style={s.featureDesc}>{desc}</div>
    </div>
  );
}

// ── Gráfico bonito (SVG) ─────────────────────────────────────────────────────
function MetricsChart() {
  // Datos “demo” (si luego quieres, lo conectamos a un endpoint público /api/metrics/preview)
  const points = [18, 22, 19, 28, 31, 27, 35, 41, 38, 46, 52, 49];
  const w = 520, h = 260, pad = 22;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const sx = (i: number) => pad + (i * (w - pad * 2)) / (points.length - 1);
  const sy = (v: number) => pad + (h - pad * 2) * (1 - (v - min) / (max - min || 1));

  const d = points
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${sx(i).toFixed(2)} ${sy(v).toFixed(2)}`)
    .join(' ');

  const area = `${d} L ${(w - pad).toFixed(2)} ${(h - pad).toFixed(2)} L ${pad.toFixed(2)} ${(h - pad).toFixed(2)} Z`;

  return (
    <div style={s.chartCard}>
      <div style={s.chartHeader}>
        <div>
          <div style={s.chartTitle}>Vista previa de métricas</div>
          <div style={s.chartSub}>Tendencia de publicaciones procesadas (demo)</div>
        </div>
        <div style={s.chartPill}>Últimos 30 días</div>
      </div>

      <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={C.primary} stopOpacity="0.28" />
            <stop offset="1" stopColor={C.primary} stopOpacity="0" />
          </linearGradient>
          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid */}
        {[0, 1, 2, 3].map((i) => {
          const y = pad + (i * (h - pad * 2)) / 3;
          return <line key={i} x1={pad} y1={y} x2={w - pad} y2={y} stroke={`${C.border}66`} strokeWidth="1" />;
        })}

        {/* Área */}
        <path d={area} fill="url(#areaGrad)" />

        {/* Línea */}
        <path d={d} fill="none" stroke={C.primary} strokeWidth="2.5" filter="url(#softGlow)" />

        {/* Puntos */}
        {points.map((v, i) => (
          <g key={i}>
            <circle cx={sx(i)} cy={sy(v)} r="4.2" fill={C.accent} opacity="0.9" />
            <circle cx={sx(i)} cy={sy(v)} r="7.5" fill={C.accent} opacity="0.12" />
          </g>
        ))}
      </svg>

      <div style={s.chartLegend}>
        <span style={s.legendDot} />
        <span style={{ color: C.muted, fontSize: '12px', fontFamily: '"Space Mono", monospace' }}>
          Publicaciones procesadas
        </span>
      </div>
    </div>
  );
}

// ── Cards de planes ───────────────────────────────────────────────────────────
function PlanCard({
  plan,
  onSelect,
  isCurrentPro,
}: {
  plan: typeof PLANS[number];
  onSelect: (planId: string) => void;
  isCurrentPro: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const featured = !!plan.featured;
  const isActivePro = plan.id === 'pro' && isCurrentPro;

  return (
    <div
      style={{
        ...s.planCard,
        borderColor: featured ? `${C.accent}55` : hovered ? `${C.primary}55` : C.border,
        background: featured ? `linear-gradient(180deg, ${C.surfaceAlt}, ${C.surface})` : hovered ? C.surfaceAlt : C.surface,
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: featured ? `0 18px 60px ${C.accent}10` : hovered ? `0 12px 40px ${C.primary}15` : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={s.planTopRow}>
        <div style={s.planName}>{plan.name}</div>
        <div style={{
          ...s.planBadge,
          color: featured ? C.accent : C.primary,
          background: featured ? `${C.accent}18` : `${C.primary}12`,
          border: `1px solid ${featured ? `${C.accent}44` : `${C.primary}33`}`,
        }}>
          {plan.badge}
        </div>
      </div>

      <div style={s.planPrice}>{formatCLP(plan.priceCLP)}</div>

      <div style={s.planList}>
        {plan.highlights.map((h) => (
          <div key={h} style={s.planItem}>
            <span style={{ color: C.accent }}>✓</span>
            <span>{h}</span>
          </div>
        ))}
      </div>

      <button
        disabled={isActivePro}
        style={{
          ...s.planBtn,
          background: isActivePro
            ? `${C.accent}20`
            : featured
              ? `linear-gradient(135deg, ${C.accent}, ${C.primary})`
              : `linear-gradient(135deg, ${C.secondary}, ${C.primary})`,
          color: isActivePro ? C.accent : featured ? '#000' : '#fff',
          cursor: isActivePro ? 'default' : 'pointer',
          opacity: hovered && !isActivePro ? 0.95 : 1,
          border: isActivePro ? `1px solid ${C.accent}44` : 'none',
        }}
        onClick={() => !isActivePro && onSelect(plan.id)}
      >
        {isActivePro ? '✓ Plan activo' : `${plan.cta} →`}
      </button>

      {plan.id === 'base' && (
        <div style={s.planNote}>
          * La recarga diaria aplica al plan Base. Los packs suman créditos al saldo.
        </div>
      )}
    </div>
  );
}

// ── User pill para el navbar ──────────────────────────────────────────────────
function UserNavPill({
  user,
  isAdmin,
  isPro,
  onLogout,
  onDashboard,
  onManagePro,
  onBillings,
  onAdminSubscriptions,
}: {
  user: any;
  isAdmin: boolean;
  isPro: boolean;
  onLogout: () => void;
  onDashboard: () => void;
  onManagePro: () => void;
  onBillings: () => void;
  onAdminSubscriptions: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const creditColor = getCreditColor(user.credits ?? 0);
  const showCredits = !isAdmin && !isPro;
  const creditPct   = Math.max(0, Math.min(100, ((user.credits ?? 0) / INITIAL_CREDITS) * 100));

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setMenuOpen((v) => !v)} style={s.userPill}>
        <div style={s.avatar}>
          {user.avatarUrl
            ? <img src={user.avatarUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            : <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>{getInitials(user.name)}</span>
          }
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: C.text, lineHeight: 1 }}>
            {user.name.split(' ')[0]}
          </span>
          {showCredits && (
            <span style={{ fontSize: '11px', color: creditColor, lineHeight: 1, fontFamily: '"Space Mono", monospace' }}>
              {user.credits ?? 0} créditos
            </span>
          )}
          {(isAdmin || isPro) && (
            <span style={{ fontSize: '10px', color: isAdmin ? '#ef4444' : C.accent, lineHeight: 1, fontWeight: 700, letterSpacing: '0.5px' }}>
              {isAdmin ? 'ADMIN' : 'PRO'}
            </span>
          )}
        </div>

        <span style={{
          fontSize: '10px', color: C.muted, marginLeft: '2px',
          transform: menuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
          display: 'inline-block',
        }}>▼</span>
      </button>

      {showCredits && (
        <div style={{
          position: 'absolute', bottom: '-6px', left: '10px', right: '10px',
          height: '3px', borderRadius: '2px', background: `${creditColor}22`, overflow: 'hidden',
        }}>
          <div style={{
            width: `${creditPct}%`, height: '100%',
            background: creditColor, borderRadius: '2px',
            transition: 'width 0.4s ease',
          }} />
        </div>
      )}

      {menuOpen && (
        <div style={s.dropdownMenu}>
          <div style={s.dropdownHeader}>
            <div style={{ ...s.avatar, width: '36px', height: '36px' }}>
              {user.avatarUrl
                ? <img src={user.avatarUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                : <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{getInitials(user.name)}</span>
              }
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: C.text }}>{user.name}</div>
              <div style={{ fontSize: '11px', color: C.muted }}>{user.email}</div>
            </div>
          </div>

          <div style={s.dropdownDivider} />

          <button style={s.dropdownBtn} onClick={() => { setMenuOpen(false); onDashboard(); }}>
            <span>📊</span>
            <span>{isAdmin ? 'Bot Dashboard' : 'Dashboard'}</span>
          </button>

          <div style={s.dropdownDivider} />
          <button style={s.dropdownBtn} onClick={() => { setMenuOpen(false); onBillings(); }}>
            <span>🧾</span>
            <span>Mis compras</span>
          </button>

          {isPro && (
            <>
              <div style={s.dropdownDivider} />
              <button style={{ ...s.dropdownBtn, color: C.accent }} onClick={() => { setMenuOpen(false); onManagePro(); }}>
                <span>⚙</span>
                <span>Gestionar suscripción Pro</span>
              </button>
            </>
          )}

          {isAdmin && (
            <>
              <div style={s.dropdownDivider} />
              <button style={{ ...s.dropdownBtn, color: C.warning }} onClick={() => { setMenuOpen(false); onAdminSubscriptions(); }}>
                <span>🧪</span>
                <span>Test suscripciones</span>
              </button>
            </>
          )}

          <div style={s.dropdownDivider} />

          <button
            style={{ ...s.dropdownBtn, color: '#f85149' }}
            onClick={() => { setMenuOpen(false); onLogout(); }}
          >
            <span>↩</span>
            <span>Cerrar sesión</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function LandingPage() {
  const router = useRouter();
  const { user, logout, isAdmin, isPro } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const handleDashboard = () => {
    if (isAdmin) router.push('/botdashboard');
    else router.push('/dashboards');
  };

  const handlePlanSelect = (planId: string) => {
    // UI only: el enforcement real debe ser server-side.
    if (!user) {
      router.push('/register');
      return;
    }
    if (planId === 'pro') {
      router.push('/billing?plan=pro');
      return;
    }
    if (planId.startsWith('pack')) {
      router.push(`/billing?pack=${planId}`);
      return;
    }
    router.push('/dashboards');
  };

  return (
    <div style={s.page}>
      <div style={s.bgGrid} />
      <div style={s.bgGlow} />

      {/* ── Navbar ── */}
      <nav style={{
        ...s.nav,
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottomColor: scrolled ? C.border : 'transparent',
      }}>
        <div style={s.navInner}>
          <div style={s.navLogo}>
            <span style={s.logoIcon}>🏠</span>
            <span style={s.logoText}>InmobiScrap</span>
            <span style={s.logoBadge}>Beta</span>
          </div>

          <div style={s.navActions}>
            {user ? (
              <>
                <button style={s.navDashboardBtn} onClick={handleDashboard}>
                  📊 Ver métricas →
                </button>

                <UserNavPill
                  user={user}
                  isAdmin={isAdmin}
                  isPro={isPro}
                  onLogout={logout}
                  onDashboard={handleDashboard}
                  onManagePro={() => router.push('/billing')}
                  onBillings={() => router.push('/billings')}
                  onAdminSubscriptions={() => router.push('/admin/subscription-test')}
                />
              </>
            ) : (
              <>
                <button style={s.navLink} onClick={() => router.push('/login')}>
                  Iniciar sesión
                </button>
                <button style={s.navCta} onClick={() => router.push('/register')}>
                  Ver métricas → 
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={s.hero}>
        <div style={s.heroContent}>
          <div style={s.heroBadge}>
            <span style={s.heroBadgeDot} />
            Métricas inmobiliarias · IA + Datos estructurados
          </div>

          <h1 style={s.heroTitle}>
            Dashboards listos
            <br />
            <span style={s.heroTitleAccent}>para decisiones</span>
            <br />
            del mercado chileno
          </h1>

          <p style={s.heroDesc}>
            InmobiScrap transforma datos de portales en métricas comparables.
            Entra, filtra, y entiende precios, comunas, tipos y tendencias sin pelear con páginas caóticas.
          </p>

          {/* CTAs */}
          {user ? (
            <div style={s.heroCtas}>
              <button style={s.ctaPrimary} onClick={handleDashboard}>
                📊 Ver Dashboard →
              </button>
              {!isAdmin && !isPro && (user.credits ?? 0) <= 10 && (
                <div style={s.creditsWarningHero}>
                  <span style={{ color: (user.credits ?? 0) === 0 ? C.creditLow : C.creditMid }}>
                    {(user.credits ?? 0) === 0
                      ? '⛔ Sin créditos disponibles'
                      : `⚠ Solo te quedan ${user.credits} créditos`}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div style={s.heroCtas}>
              <button style={s.ctaPrimary} onClick={() => router.push('/register')}>
                📊 Ver métricas gratis
              </button>
              <button style={s.ctaSecondary} onClick={() => router.push('/login')}>
                Ya tengo cuenta →
              </button>
            </div>
          )}

          <div style={s.heroSources}>
            <span style={s.heroSourcesLabel}>Fuentes:</span>
            {SOURCES.map((src) => (
              <span key={src} style={s.sourceChip}>{src}</span>
            ))}
          </div>
        </div>

        <div style={s.heroTerminal}>
          <Terminal />
        </div>
      </section>

      {/* ── Preview Chart ── */}
      <section style={s.previewSection}>
        <div style={s.previewInner}>
          <MetricsChart />
        </div>
      </section>

      {/* ── Planes ── */}
      <section style={s.section}>
        <div style={s.sectionHeader}>
          <div style={s.sectionTag}>Planes</div>
          <h2 style={s.sectionTitle}>Elige cómo consumir métricas</h2>
          <p style={s.sectionDesc}>
            Plan Base con recarga diaria, packs de créditos para uso puntual, o Pro ilimitado.
          </p>
        </div>

        <div style={s.plansGrid}>
          {PLANS.map((p) => (
            <PlanCard key={p.id} plan={p} onSelect={handlePlanSelect} isCurrentPro={isPro} />
          ))}
        </div>

        <div style={s.plansFootnote}>
          Nota: los precios están en CLP. La UI es informativa; compras y upgrades deben validarse en backend con control transaccional.
        </div>
      </section>

      {/* ── Stats ── */}
      <section style={s.statsSection}>
        <div style={s.statsGrid}>
          {[
            { value: '6+',   label: 'Portales integrados'    },
            { value: 'LLM',  label: 'Extracción inteligente' },
            { value: 'RT',   label: 'Logs en tiempo real'    },
            { value: 'Cron', label: 'Programación automática'},
          ].map((stat) => (
            <div key={stat.label} style={s.statItem}>
              <div style={s.statValue}>{stat.value}</div>
              <div style={s.statLabel}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section style={s.section}>
        <div style={s.sectionHeader}>
          <div style={s.sectionTag}>Funcionalidades</div>
          <h2 style={s.sectionTitle}>Métricas, trazabilidad<br />y datos útiles</h2>
          <p style={s.sectionDesc}>
            Enfocado en consumo de insights: menos fricción, más decisiones.
          </p>
        </div>
        <div style={s.featuresGrid}>
          {FEATURES.map((f) => <FeatureCard key={f.title} {...f} />)}
        </div>
      </section>

      {/* ── Stack ── */}
      <section style={{ ...s.section, ...s.stackSection }}>
        <div style={s.sectionHeader}>
          <div style={s.sectionTag}>Stack tecnológico</div>
          <h2 style={s.sectionTitle}>Construido con tecnologías<br />de producción</h2>
        </div>
        <div style={s.stackGrid}>
          {STACK.map((tech) => (
            <div key={tech.label} style={s.stackChip}>
              <div style={{ ...s.stackDot, background: tech.color }} />
              <span style={s.stackLabel}>{tech.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA final ── */}
      <section style={s.ctaSection}>
        <div style={s.ctaBox}>
          <div style={s.ctaGlow} />
          {user ? (
            <>
              <h2 style={s.ctaTitle}>Listo, {user.name.split(' ')[0]} 👋</h2>
              <p style={s.ctaDesc}>
                Entra al dashboard y revisa tendencias, comunas y precios en segundos.
              </p>
              <div style={s.heroCtas}>
                <button style={s.ctaPrimary} onClick={handleDashboard}>
                  📊 Ver Dashboard →
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 style={s.ctaTitle}>Mira las métricas hoy</h2>
              <p style={s.ctaDesc}>
                Crea tu cuenta y accede al dashboard con recarga diaria de créditos en el plan Base.
              </p>
              <div style={s.heroCtas}>
                <button style={s.ctaPrimary} onClick={() => router.push('/register')}>
                  Crear cuenta gratis
                </button>
                <button style={s.ctaSecondary} onClick={() => router.push('/login')}>
                  Iniciar sesión →
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={s.footer}>
        <div style={s.footerInner}>
          <div style={s.navLogo}>
            <span style={s.logoIcon}>🏠</span>
            <span style={{ ...s.logoText, fontSize: '14px' }}>InmobiScrap</span>
          </div>
          <div style={s.footerRight}>
            <span style={{ color: C.muted, fontSize: '13px' }}>Hecho con ❤️ en Chile 🇨🇱</span>
          </div>
        </div>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { background: ${C.bg}; }
        @keyframes blink  { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes float  { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
        @keyframes glow   { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.7; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: C.bg,
    fontFamily: '"Syne", sans-serif',
    color: C.text,
    overflowX: 'hidden',
    position: 'relative',
  },
  bgGrid: {
    position: 'fixed',
    inset: 0,
    backgroundImage: `linear-gradient(${C.border}40 1px, transparent 1px), linear-gradient(90deg, ${C.border}40 1px, transparent 1px)`,
    backgroundSize: '60px 60px',
    pointerEvents: 'none',
    zIndex: 0,
  },
  bgGlow: {
    position: 'fixed',
    top: '-20%',
    left: '30%',
    width: '800px',
    height: '800px',
    background: `radial-gradient(circle, ${C.secondary}18 0%, transparent 70%)`,
    pointerEvents: 'none',
    zIndex: 0,
    animation: 'glow 6s ease-in-out infinite',
  },

  nav: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    borderBottom: '1px solid transparent',
    transition: 'all 0.3s ease',
    background: 'transparent',
  },
  navInner: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '14px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navLogo: { display: 'flex', alignItems: 'center', gap: '10px' },
  logoIcon: { fontSize: '22px' },
  logoText: {
    fontFamily: '"Space Mono", monospace',
    fontWeight: 700,
    fontSize: '18px',
    color: C.text,
    letterSpacing: '-0.5px',
  },
  logoBadge: {
    fontSize: '10px',
    fontWeight: 700,
    color: C.accent,
    background: `${C.accent}18`,
    border: `1px solid ${C.accent}44`,
    borderRadius: '4px',
    padding: '2px 6px',
    letterSpacing: '1px',
    textTransform: 'uppercase' as const,
  },
  navActions: { display: 'flex', alignItems: 'center', gap: '12px' },
  navLink: {
    background: 'none',
    border: 'none',
    color: C.muted,
    fontSize: '14px',
    cursor: 'pointer',
    fontFamily: '"Syne", sans-serif',
    fontWeight: 600,
    padding: '8px 16px',
    borderRadius: '6px',
    transition: 'color 0.2s',
  },
  navCta: {
    background: `linear-gradient(135deg, ${C.secondary}, ${C.primary})`,
    border: 'none',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 700,
    fontFamily: '"Syne", sans-serif',
    cursor: 'pointer',
    padding: '9px 20px',
    borderRadius: '8px',
    transition: 'opacity 0.2s, transform 0.2s',
  },
  navDashboardBtn: {
    background: `${C.primary}12`,
    border: `1px solid ${C.primary}40`,
    color: C.primary,
    fontSize: '13px',
    fontWeight: 700,
    fontFamily: '"Syne", sans-serif',
    cursor: 'pointer',
    padding: '8px 16px',
    borderRadius: '8px',
    transition: 'background 0.2s, border-color 0.2s',
    letterSpacing: '-0.2px',
  },

  userPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: `${C.surface}cc`,
    border: `1px solid ${C.border}`,
    borderRadius: '10px',
    padding: '7px 12px',
    cursor: 'pointer',
    transition: 'border-color 0.2s, background 0.2s',
    fontFamily: '"Syne", sans-serif',
    position: 'relative' as const,
  },
  avatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: `linear-gradient(135deg, ${C.secondary}, ${C.primary})`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },

  dropdownMenu: {
    position: 'absolute' as const,
    top: 'calc(100% + 12px)',
    right: 0,
    minWidth: '240px',
    background: '#0d1117',
    border: `1px solid ${C.border}`,
    borderRadius: '12px',
    boxShadow: `0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px ${C.primary}15`,
    overflow: 'hidden',
    animation: 'fadeIn 0.15s ease',
    zIndex: 200,
  },
  dropdownHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    background: C.surfaceAlt,
    borderBottom: `1px solid ${C.border}`,
  },
  dropdownDivider: { height: '1px', background: C.border },
  dropdownBtn: {
    width: '100%',
    background: 'none',
    border: 'none',
    color: C.text,
    fontSize: '13px',
    fontFamily: '"Syne", sans-serif',
    fontWeight: 600,
    padding: '12px 16px',
    cursor: 'pointer',
    textAlign: 'left' as const,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    transition: 'background 0.15s',
  },

  hero: {
    position: 'relative',
    zIndex: 1,
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '140px 24px 80px',
    display: 'flex',
    alignItems: 'center',
    gap: '60px',
    flexWrap: 'wrap' as const,
  },
  heroContent: { flex: '1 1 480px', minWidth: '320px' },
  heroBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    fontFamily: '"Space Mono", monospace',
    color: C.primary,
    background: `${C.primary}12`,
    border: `1px solid ${C.primary}33`,
    borderRadius: '20px',
    padding: '6px 14px',
    marginBottom: '28px',
    letterSpacing: '0.3px',
  },
  heroBadgeDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: C.accent,
    animation: 'blink 2s infinite',
    display: 'inline-block',
  },
  heroTitle: {
    fontSize: 'clamp(36px, 5vw, 64px)',
    fontWeight: 800,
    lineHeight: 1.1,
    color: C.text,
    marginBottom: '24px',
    letterSpacing: '-2px',
  },
  heroTitleAccent: {
    background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  heroDesc: {
    fontSize: '17px',
    color: C.muted,
    lineHeight: 1.7,
    marginBottom: '36px',
    maxWidth: '520px',
  },
  heroCtas: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap' as const,
    marginBottom: '32px',
  },
  creditsWarningHero: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '13px',
    fontFamily: '"Space Mono", monospace',
    fontWeight: 600,
  },
  ctaPrimary: {
    background: `linear-gradient(135deg, ${C.secondary}, ${C.primary})`,
    border: 'none',
    color: '#fff',
    fontSize: '15px',
    fontWeight: 700,
    fontFamily: '"Syne", sans-serif',
    cursor: 'pointer',
    padding: '14px 28px',
    borderRadius: '10px',
    boxShadow: `0 0 30px ${C.primary}30`,
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  ctaSecondary: {
    background: 'none',
    border: `1px solid ${C.border}`,
    color: C.text,
    fontSize: '15px',
    fontWeight: 600,
    fontFamily: '"Syne", sans-serif',
    cursor: 'pointer',
    padding: '13px 24px',
    borderRadius: '10px',
    transition: 'border-color 0.2s, color 0.2s',
  },
  heroSources: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' as const },
  heroSourcesLabel: { fontSize: '12px', color: C.muted, fontFamily: '"Space Mono", monospace' },
  sourceChip: {
    fontSize: '11px',
    fontFamily: '"Space Mono", monospace',
    color: C.muted,
    background: C.dim,
    border: `1px solid ${C.border}`,
    borderRadius: '4px',
    padding: '3px 8px',
  },
  heroTerminal: { flex: '1 1 420px', minWidth: '320px', animation: 'float 6s ease-in-out infinite' },

  previewSection: {
    position: 'relative',
    zIndex: 1,
    padding: '0 24px 40px',
  },
  previewInner: {
    maxWidth: '1200px',
    margin: '0 auto',
  },

  chartCard: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: '16px',
    padding: '18px 18px 12px',
    boxShadow: `0 24px 80px rgba(0,0,0,0.35), 0 0 0 1px ${C.primary}10`,
  },
  chartHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '10px',
  },
  chartTitle: { fontSize: '14px', fontWeight: 800, color: C.text, letterSpacing: '-0.2px' },
  chartSub: { fontSize: '12px', color: C.muted, marginTop: '2px' },
  chartPill: {
    fontSize: '11px',
    fontFamily: '"Space Mono", monospace',
    color: C.primary,
    background: `${C.primary}12`,
    border: `1px solid ${C.primary}33`,
    borderRadius: '999px',
    padding: '6px 10px',
    whiteSpace: 'nowrap' as const,
  },
  chartLegend: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '10px',
    paddingTop: '10px',
    borderTop: `1px solid ${C.border}`,
  },
  legendDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: C.accent,
    boxShadow: `0 0 20px ${C.accent}33`,
  },

  terminal: {
    background: '#0a0e14',
    border: `1px solid ${C.border}`,
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: `0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px ${C.primary}20`,
  },
  terminalBar: {
    background: '#111820',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    borderBottom: `1px solid ${C.border}`,
  },
  dot: { width: '12px', height: '12px', borderRadius: '50%', display: 'inline-block' },
  terminalTitle: {
    marginLeft: 'auto',
    marginRight: 'auto',
    fontSize: '12px',
    color: C.muted,
    fontFamily: '"Space Mono", monospace',
  },
  terminalBody: {
    padding: '20px',
    minHeight: '260px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  terminalLine: { fontFamily: '"Space Mono", monospace', fontSize: '13px', lineHeight: 1.5 },
  cursor: { animation: 'blink 1s infinite', display: 'inline-block', color: C.accent },

  statsSection: {
    position: 'relative',
    zIndex: 1,
    borderTop: `1px solid ${C.border}`,
    borderBottom: `1px solid ${C.border}`,
    background: C.surface,
  },
  statsGrid: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '40px 24px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '0',
  },
  statItem: { textAlign: 'center' as const, padding: '20px', borderRight: `1px solid ${C.border}` },
  statValue: {
    fontFamily: '"Space Mono", monospace',
    fontSize: '32px',
    fontWeight: 700,
    color: C.primary,
    marginBottom: '6px',
    letterSpacing: '-1px',
  },
  statLabel: { fontSize: '13px', color: C.muted, fontWeight: 600 },

  section: { position: 'relative', zIndex: 1, maxWidth: '1200px', margin: '0 auto', padding: '90px 24px' },
  sectionHeader: { textAlign: 'center' as const, marginBottom: '54px' },
  sectionTag: {
    display: 'inline-block',
    fontSize: '11px',
    fontFamily: '"Space Mono", monospace',
    fontWeight: 700,
    color: C.accent,
    letterSpacing: '2px',
    textTransform: 'uppercase' as const,
    marginBottom: '16px',
    background: `${C.accent}12`,
    border: `1px solid ${C.accent}30`,
    borderRadius: '4px',
    padding: '4px 12px',
  },
  sectionTitle: {
    fontSize: 'clamp(28px, 4vw, 44px)',
    fontWeight: 800,
    color: C.text,
    lineHeight: 1.15,
    marginBottom: '16px',
    letterSpacing: '-1.5px',
  },
  sectionDesc: { fontSize: '16px', color: C.muted, maxWidth: '560px', margin: '0 auto', lineHeight: 1.7 },

  plansGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '18px',
  },
  planCard: {
    border: `1px solid ${C.border}`,
    borderRadius: '14px',
    padding: '22px',
    transition: 'all 0.25s ease',
  },
  planTopRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '10px',
  },
  planName: { fontSize: '16px', fontWeight: 800, color: C.text, letterSpacing: '-0.2px' },
  planBadge: {
    fontSize: '10px',
    fontWeight: 800,
    letterSpacing: '1px',
    textTransform: 'uppercase' as const,
    borderRadius: '999px',
    padding: '5px 10px',
  },
  planPrice: {
    fontFamily: '"Space Mono", monospace',
    fontSize: '22px',
    fontWeight: 800,
    color: C.text,
    marginBottom: '14px',
  },
  planList: { display: 'flex', flexDirection: 'column' as const, gap: '10px', marginBottom: '16px' },
  planItem: { display: 'flex', alignItems: 'center', gap: '10px', color: C.muted, fontSize: '13px', lineHeight: 1.4 },
  planBtn: {
    width: '100%',
    border: 'none',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 800,
    fontFamily: '"Syne", sans-serif',
    cursor: 'pointer',
    padding: '11px 14px',
    borderRadius: '10px',
    transition: 'opacity 0.2s',
  },
  planNote: { marginTop: '10px', fontSize: '11px', color: C.muted, lineHeight: 1.5 },
  plansFootnote: { marginTop: '16px', fontSize: '12px', color: C.muted, textAlign: 'center' as const },

  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
  },
  featureCard: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: '12px',
    padding: '28px',
    transition: 'all 0.25s ease',
    cursor: 'default',
  },
  featureIcon: { fontSize: '28px', marginBottom: '16px' },
  featureTitle: { fontSize: '17px', fontWeight: 700, color: C.text, marginBottom: '10px', letterSpacing: '-0.3px' },
  featureDesc: { fontSize: '14px', color: C.muted, lineHeight: 1.7 },

  stackSection: {
    borderTop: `1px solid ${C.border}`,
    background: C.surface,
    maxWidth: '100%',
    padding: '80px 24px',
  },
  stackGrid: {
    maxWidth: '900px',
    margin: '0 auto',
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '12px',
    justifyContent: 'center',
  },
  stackChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: C.dim,
    border: `1px solid ${C.border}`,
    borderRadius: '8px',
    padding: '10px 18px',
  },
  stackDot: { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0 },
  stackLabel: { fontFamily: '"Space Mono", monospace', fontSize: '13px', color: C.text, fontWeight: 700 },

  ctaSection: { position: 'relative', zIndex: 1, padding: '100px 24px', display: 'flex', justifyContent: 'center' },
  ctaBox: {
    position: 'relative',
    maxWidth: '680px',
    width: '100%',
    textAlign: 'center' as const,
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: '20px',
    padding: '64px 48px',
    overflow: 'hidden',
  },
  ctaGlow: {
    position: 'absolute',
    top: '-50%',
    left: '25%',
    width: '400px',
    height: '400px',
    background: `radial-gradient(circle, ${C.primary}12 0%, transparent 70%)`,
    pointerEvents: 'none',
  },
  ctaTitle: {
    position: 'relative',
    fontSize: 'clamp(28px, 4vw, 40px)',
    fontWeight: 800,
    color: C.text,
    marginBottom: '16px',
    letterSpacing: '-1.5px',
  },
  ctaDesc: {
    position: 'relative',
    fontSize: '16px',
    color: C.muted,
    lineHeight: 1.7,
    marginBottom: '36px',
  },

  footer: { position: 'relative', zIndex: 1, borderTop: `1px solid ${C.border}`, background: C.surface },
  footerInner: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap' as const,
    gap: '16px',
  },
  footerRight: { display: 'flex', alignItems: 'center', gap: '16px' },
};