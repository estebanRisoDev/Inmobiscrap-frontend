'use client';
// app/page.tsx — Landing page de InmobiScrap

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

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
};

// ── Features ──────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: '🤖',
    title: 'Bots de Scraping',
    desc: 'Bots configurables que recorren portales inmobiliarios chilenos automáticamente. Soportan JavaScript dinámico vía Playwright y detección anti-bot.',
  },
  {
    icon: '🧠',
    title: 'Procesamiento LLM',
    desc: 'Claude 4.6 Sonnet via AWS Bedrock extrae y estructura datos no normalizados: precios, ubicaciones, características y tipos de propiedad.',
  },
  {
    icon: '📊',
    title: 'Dashboard Analítico',
    desc: 'Visualizaciones en tiempo real de distribución por tipo, precios promedio, comunas top, tendencias mensuales y comparativas de mercado.',
  },
  {
    icon: '⚡',
    title: 'Logs en Tiempo Real',
    desc: 'Sistema SignalR que transmite el progreso de cada bot en vivo: fases de scraping, propiedades procesadas, errores y métricas de ejecución.',
  },
  {
    icon: '🗓️',
    title: 'Programación Cron',
    desc: 'Cada bot puede configurarse con expresiones cron independientes. Ejecuciones automáticas sin intervención manual.',
  },
  {
    icon: '🔐',
    title: 'Autenticación JWT',
    desc: 'Sistema completo con registro, login por email y OAuth Google. Tokens seguros con expiración configurable.',
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

// ── Animación de terminal ─────────────────────────────────────────────────────
const TERMINAL_LINES = [
  { delay: 0,    text: '$ inmobiscrap start --all-bots',          color: C.accent },
  { delay: 600,  text: '🚀 Bot "Portal Inmobiliario RM" iniciado', color: C.text   },
  { delay: 1200, text: '🌐 Descargando HTML... 284,392 chars',     color: C.muted  },
  { delay: 1800, text: '🤖 Enviando a AWS Bedrock (Claude 4.6)…',  color: C.text   },
  { delay: 2400, text: '✅ 24 propiedades extraídas en chunk 1/2',  color: C.accent },
  { delay: 3000, text: '✅ 18 propiedades extraídas en chunk 2/2',  color: C.accent },
  { delay: 3600, text: '💾 42 nuevas propiedades guardadas',        color: C.primary},
  { delay: 4200, text: '🎉 Bot completado. Total acumulado: 1,847', color: C.primary},
];

// ── Componentes ───────────────────────────────────────────────────────────────

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

// ── Página principal ──────────────────────────────────────────────────────────

export default function LandingPage() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <div style={s.page}>

      {/* ── Grid de fondo ── */}
      <div style={s.bgGrid} />
      <div style={s.bgGlow} />

      {/* ── Navbar ── */}
      <nav style={{ ...s.nav, backdropFilter: scrolled ? 'blur(16px)' : 'none', borderBottomColor: scrolled ? C.border : 'transparent' }}>
        <div style={s.navInner}>
          <div style={s.navLogo}>
            <span style={s.logoIcon}>🏠</span>
            <span style={s.logoText}>InmobiScrap</span>
            <span style={s.logoBadge}>Beta</span>
          </div>
          <div style={s.navActions}>
            <button style={s.navLink} onClick={() => router.push('/login')}>Iniciar sesión</button>
            <button style={s.navCta} onClick={() => router.push('/register')}>Registrarse →</button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={s.hero}>
        <div style={s.heroContent}>
          <div style={s.heroBadge}>
            <span style={s.heroBadgeDot} />
            Powered by Claude 4.6 Sonnet · AWS Bedrock
          </div>

          <h1 style={s.heroTitle}>
            Inteligencia artificial
            <br />
            <span style={s.heroTitleAccent}>para el mercado</span>
            <br />
            inmobiliario chileno
          </h1>

          <p style={s.heroDesc}>
            InmobiScrap automatiza la recopilación y análisis de datos de propiedades
            usando bots de scraping + LLMs. Convierte páginas caóticas en datos
            estructurados, comparables y accionables.
          </p>

          <div style={s.heroCtas}>
            <button style={s.ctaPrimary} onClick={() => router.push('/register')}>
              Comenzar gratis
            </button>
            <button style={s.ctaSecondary} onClick={() => router.push('/login')}>
              Ya tengo cuenta →
            </button>
          </div>

          <div style={s.heroSources}>
            <span style={s.heroSourcesLabel}>Portales soportados:</span>
            {SOURCES.map((src) => (
              <span key={src} style={s.sourceChip}>{src}</span>
            ))}
          </div>
        </div>

        {/* Terminal animada */}
        <div style={s.heroTerminal}>
          <Terminal />
        </div>
      </section>

      {/* ── Stats ── */}
      <section style={s.statsSection}>
        <div style={s.statsGrid}>
          {[
            { value: '6+',    label: 'Portales integrados'      },
            { value: 'LLM',   label: 'Extracción inteligente'   },
            { value: 'RT',    label: 'Logs en tiempo real'       },
            { value: 'Cron',  label: 'Programación automática'   },
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
          <h2 style={s.sectionTitle}>Todo lo que necesitas para<br />analizar el mercado</h2>
          <p style={s.sectionDesc}>
            Una plataforma completa que va desde la extracción de datos hasta la visualización analítica.
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
          <h2 style={s.ctaTitle}>Empieza a scrapear hoy</h2>
          <p style={s.ctaDesc}>
            Crea tu cuenta, configura tu primer bot y obtén datos estructurados
            del mercado inmobiliario en minutos.
          </p>
          <div style={s.heroCtas}>
            <button style={s.ctaPrimary} onClick={() => router.push('/register')}>
              Crear cuenta gratis
            </button>
            <button style={s.ctaSecondary} onClick={() => router.push('/login')}>
              Iniciar sesión →
            </button>
          </div>
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
            <span style={{ color: C.muted, fontSize: '13px' }}>
              Hecho con ❤️ en Chile 🇨🇱
            </span>
          </div>
        </div>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { background: ${C.bg}; }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
        @keyframes glow { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.7; } }
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

  // Navbar
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
    padding: '16px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navLogo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
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
  navActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
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

  // Hero
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
  heroContent: {
    flex: '1 1 480px',
    minWidth: '320px',
  },
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
    maxWidth: '500px',
  },
  heroCtas: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap' as const,
    marginBottom: '32px',
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
  heroSources: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap' as const,
  },
  heroSourcesLabel: {
    fontSize: '12px',
    color: C.muted,
    fontFamily: '"Space Mono", monospace',
  },
  sourceChip: {
    fontSize: '11px',
    fontFamily: '"Space Mono", monospace',
    color: C.muted,
    background: C.dim,
    border: `1px solid ${C.border}`,
    borderRadius: '4px',
    padding: '3px 8px',
  },
  heroTerminal: {
    flex: '1 1 420px',
    minWidth: '320px',
    animation: 'float 6s ease-in-out infinite',
  },

  // Terminal
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
  dot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    display: 'inline-block',
  },
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
  terminalLine: {
    fontFamily: '"Space Mono", monospace',
    fontSize: '13px',
    lineHeight: 1.5,
  },
  cursor: {
    animation: 'blink 1s infinite',
    display: 'inline-block',
    color: C.accent,
  },

  // Stats
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
  statItem: {
    textAlign: 'center' as const,
    padding: '20px',
    borderRight: `1px solid ${C.border}`,
  },
  statValue: {
    fontFamily: '"Space Mono", monospace',
    fontSize: '32px',
    fontWeight: 700,
    color: C.primary,
    marginBottom: '6px',
    letterSpacing: '-1px',
  },
  statLabel: {
    fontSize: '13px',
    color: C.muted,
    fontWeight: 600,
  },

  // Sections
  section: {
    position: 'relative',
    zIndex: 1,
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '100px 24px',
  },
  sectionHeader: {
    textAlign: 'center' as const,
    marginBottom: '64px',
  },
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
  sectionDesc: {
    fontSize: '16px',
    color: C.muted,
    maxWidth: '500px',
    margin: '0 auto',
    lineHeight: 1.7,
  },

  // Features grid
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
  featureIcon: {
    fontSize: '28px',
    marginBottom: '16px',
  },
  featureTitle: {
    fontSize: '17px',
    fontWeight: 700,
    color: C.text,
    marginBottom: '10px',
    letterSpacing: '-0.3px',
  },
  featureDesc: {
    fontSize: '14px',
    color: C.muted,
    lineHeight: 1.7,
  },

  // Stack
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
    transition: 'border-color 0.2s',
  },
  stackDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  stackLabel: {
    fontFamily: '"Space Mono", monospace',
    fontSize: '13px',
    color: C.text,
    fontWeight: 700,
  },

  // CTA final
  ctaSection: {
    position: 'relative',
    zIndex: 1,
    padding: '100px 24px',
    display: 'flex',
    justifyContent: 'center',
  },
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

  // Footer
  footer: {
    position: 'relative',
    zIndex: 1,
    borderTop: `1px solid ${C.border}`,
    background: C.surface,
  },
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
  footerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
};