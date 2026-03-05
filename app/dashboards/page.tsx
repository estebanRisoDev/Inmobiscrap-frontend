'use client';
// app/dashboards/page.tsx
// FIXES:
// 1. Radar chart: tooltip muestra valores REALES (3.0 dormitorios, 98 m², etc.)
// 2. Barra de créditos siempre visible para usuarios base
// 3. Integración plan/role con AuthContext

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  Box, Paper, Typography, Card, CardContent, CircularProgress,
  Alert, Button, Chip, Select, MenuItem, FormControl,
  InputLabel, IconButton, Skeleton, Avatar, Divider,
  ToggleButton, ToggleButtonGroup, LinearProgress,
} from '@mui/material';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  AreaChart, Area,
} from 'recharts';
import RefreshIcon from '@mui/icons-material/Refresh';
import HomeIcon from '@mui/icons-material/Home';
import ApartmentIcon from '@mui/icons-material/Apartment';
import BathtubIcon from '@mui/icons-material/Bathtub';
import BedIcon from '@mui/icons-material/Bed';
import SquareFootIcon from '@mui/icons-material/SquareFoot';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import MapIcon from '@mui/icons-material/Map';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LogoutIcon from '@mui/icons-material/Logout';
import StarIcon from '@mui/icons-material/Star';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import TokenIcon from '@mui/icons-material/Token';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { authHeaders } from '@/lib/auth';

const API_BASE_URL = 'http://localhost:5000';
const INITIAL_CREDITS = 50; // Para la barra de progreso

// ── Types ──────────────────────────────────────────────────────────────────────

interface Locations {
  regions: string[];
  cities: string[];
  neighborhoods: string[];
  propertyTypes: string[];
}

interface Filters {
  region: string;
  city: string;
  neighborhood: string;
  propertyType: string;
}

interface MarketData {
  totalProperties: number;
  byType: Array<{
    type: string; count: number;
    avgPrice?: number; avgBedrooms?: number; avgBathrooms?: number; avgArea?: number;
    minPrice?: number; maxPrice?: number;
  }>;
  topNeighborhoods: Array<{ name: string; count: number; avgPrice?: number }>;
  globalAverages?: { avgPrice?: number; avgBedrooms?: number; avgBathrooms?: number; avgArea?: number };
  priceDistribution: {
    uf: Array<{ rango: string; cantidad: number }>;
    clp: Array<{ rango: string; cantidad: number }>;
  };
  sources: Array<{ name: string; value: number }>;
}

interface Bot { id: number; isActive: boolean; totalScraped?: number; }

// ── Helpers ────────────────────────────────────────────────────────────────────

const toArray = (v: any) => (Array.isArray(v) ? v : []);

const formatCLP = (value: number) => {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString('es-CL')}`;
};

const normalizePropertyType = (type?: string): string => {
  if (!type) return 'Otro';
  const l = type.toLowerCase().trim();
  if (l.includes('departamento') || l.includes('depto')) return 'Departamento';
  if (l.includes('casa') && !l.includes('prefab')) return 'Casa';
  if (l.includes('prefab') || l.includes('modular')) return 'Prefabricada';
  if (l.includes('terreno') || l.includes('parcela')) return 'Terreno';
  if (l.includes('oficina')) return 'Oficina';
  if (l.includes('local') || l.includes('comercial')) return 'Local Comercial';
  return type.charAt(0).toUpperCase() + type.slice(1);
};

// ── Paleta ─────────────────────────────────────────────────────────────────────

const COLORS = {
  primary: '#0f4c81', secondary: '#e8927c', accent: '#2ec4b6',
  warning: '#f4a261', error: '#e76f51', success: '#2a9d8f',
  neutral: '#264653', bg: '#f8f9fa', cardBg: '#ffffff',
  darkText: '#1a1a2e', mutedText: '#6c757d',
};

const PROPERTY_TYPE_COLORS: Record<string, string> = {
  'Departamento': '#0f4c81', 'Casa': '#2a9d8f', 'Prefabricada': '#e8927c',
  'Terreno': '#f4a261', 'Oficina': '#264653', 'Local Comercial': '#e76f51',
  'Bodega': '#8ecae6', 'Otro': '#adb5bd',
};

const PIE_COLORS = ['#0f4c81', '#2a9d8f', '#e8927c', '#f4a261', '#264653', '#e76f51', '#8ecae6', '#adb5bd'];

const EMPTY_FILTERS: Filters = { region: '', city: '', neighborhood: '', propertyType: '' };

// ══════════════════════════════════════════════════════════════════════════════
// RADAR TOOLTIP — Muestra valores reales, NO porcentajes normalizados
// ══════════════════════════════════════════════════════════════════════════════

const RadarTooltipContent = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  return (
    <Paper elevation={3} sx={{ p: 1.5, minWidth: 180, border: '1px solid #e0e0e0' }}>
      <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.75, color: COLORS.darkText }}>
        {label}
      </Typography>
      {payload.map((entry: any) => {
        // Leer el valor REAL desde el campo "{TipoPropiedad}_real"
        const realKey = `${entry.dataKey}_real`;
        const realValue = entry.payload?.[realKey];
        return (
          <Box key={entry.dataKey} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.4 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: entry.color, flexShrink: 0 }} />
            <Typography variant="caption" sx={{ color: COLORS.mutedText, minWidth: 80 }}>
              {entry.name}:
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, color: COLORS.darkText }}>
              {realValue ?? entry.value}
            </Typography>
          </Box>
        );
      })}
    </Paper>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// CREDIT BAR — Barra de créditos siempre visible para usuarios base
// ══════════════════════════════════════════════════════════════════════════════

function CreditBar({ credits, plan, role }: { credits: number; plan: string; role: string }) {
  // Admins y pro no ven la barra
  if (plan === 'pro' || role === 'admin') {
    return (
      <Paper elevation={0} sx={{
        px: 2.5, py: 1.5, mb: 3, borderRadius: 2,
        display: 'flex', alignItems: 'center', gap: 1.5,
        bgcolor: '#f0fdf4', border: '1px solid #bbf7d0',
      }}>
        <StarIcon sx={{ color: '#16a34a', fontSize: 20 }} />
        <Typography variant="body2" sx={{ color: '#15803d', fontWeight: 600 }}>
          {role === 'admin' ? 'Admin — Consultas ilimitadas' : 'Plan Pro — Consultas ilimitadas'}
        </Typography>
      </Paper>
    );
  }

  // Plan base: mostrar barra de créditos
  const percentage = Math.max(0, Math.min(100, (credits / INITIAL_CREDITS) * 100));
  const isLow = credits <= 10;
  const isEmpty = credits <= 0;

  const barColor = isEmpty ? '#ef4444' : isLow ? '#f59e0b' : '#3b82f6';
  const bgColor = isEmpty ? '#fef2f2' : isLow ? '#fffbeb' : '#eff6ff';
  const borderColor = isEmpty ? '#fecaca' : isLow ? '#fde68a' : '#bfdbfe';
  const textColor = isEmpty ? '#991b1b' : isLow ? '#92400e' : '#1e40af';

  return (
    <Paper elevation={0} sx={{
      px: 2.5, py: 1.5, mb: 3, borderRadius: 2,
      bgcolor: bgColor, border: `1px solid ${borderColor}`,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TokenIcon sx={{ color: barColor, fontSize: 20 }} />
          <Typography variant="body2" sx={{ fontWeight: 700, color: textColor }}>
            {isEmpty
              ? 'Sin créditos disponibles'
              : `${credits} crédito${credits !== 1 ? 's' : ''} restante${credits !== 1 ? 's' : ''}`}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="caption" sx={{ color: COLORS.mutedText }}>
            {credits} / {INITIAL_CREDITS}
          </Typography>
          {isEmpty && (
            <Button size="small" variant="contained"
              sx={{ textTransform: 'none', fontSize: '0.75rem', fontWeight: 700, px: 2, py: 0.25,
                    bgcolor: '#f59e0b', '&:hover': { bgcolor: '#d97706' }, borderRadius: 1.5 }}>
              Actualizar a Pro
            </Button>
          )}
          {isLow && !isEmpty && (
            <Chip label="Quedan pocas" size="small"
              sx={{ bgcolor: '#fef3c7', color: '#92400e', fontWeight: 600, fontSize: '0.7rem', height: 22 }} />
          )}
        </Box>
      </Box>
      <LinearProgress
        variant="determinate"
        value={percentage}
        sx={{
          height: 6, borderRadius: 3,
          bgcolor: `${barColor}20`,
          '& .MuiLinearProgress-bar': { borderRadius: 3, bgcolor: barColor },
        }}
      />
      <Typography variant="caption" sx={{ color: COLORS.mutedText, mt: 0.5, display: 'block' }}>
        Cada consulta al dashboard (filtros, actualización) consume 1 crédito.
        {!isEmpty && isLow && ' Considera actualizar a Pro para consultas ilimitadas.'}
      </Typography>
    </Paper>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function Dashboard() {
  const router = useRouter();
  const { user, logout, refreshCredits, isPro, isAdmin } = useAuth();

  // ── Estado ──────────────────────────────────────────────────────
  const [bots, setBots] = useState<Bot[]>([]);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [trendsData, setTrendsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersLoading, setFiltersLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [priceFilter, setPriceFilter] = useState<'auto' | 'CLP' | 'UF'>('auto');
  const [noCredits, setNoCredits] = useState(false);

  const [locations, setLocations] = useState<Locations>({
    regions: [], cities: [], neighborhoods: [], propertyTypes: [],
  });

  const [staged, setStaged] = useState<Filters>(EMPTY_FILTERS);
  const [committed, setCommitted] = useState<Filters>(EMPTY_FILTERS);
  const [filteredCities, setFilteredCities] = useState<string[]>([]);
  const [filteredNeighborhoods, setFilteredNeighborhoods] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setCommitted(staged), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [staged]);

  // Cascada de filtros
  useEffect(() => {
    if (!staged.region) {
      setFilteredCities(locations.cities);
      setFilteredNeighborhoods(locations.neighborhoods);
      return;
    }
    const load = async () => {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/api/analytics/locations`, {
          params: { region: staged.region }, headers: authHeaders(),
        });
        setFilteredCities(data.cities);
        setFilteredNeighborhoods(data.neighborhoods);
      } catch { /* fallback */ }
    };
    load();
    setStaged((prev) => ({ ...prev, city: '', neighborhood: '' }));
  }, [staged.region]);

  useEffect(() => {
    if (!staged.city) { setFilteredNeighborhoods(locations.neighborhoods); return; }
    const load = async () => {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/api/analytics/locations`, {
          params: { region: staged.region || undefined, city: staged.city }, headers: authHeaders(),
        });
        setFilteredNeighborhoods(data.neighborhoods);
      } catch { /* fallback */ }
    };
    load();
    setStaged((prev) => ({ ...prev, neighborhood: '' }));
  }, [staged.city]);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/api/analytics/locations`, { headers: authHeaders() });
        setLocations(data);
        setFilteredCities(data.cities);
        setFilteredNeighborhoods(data.neighborhoods);
      } catch { /* ignore */ }
      finally { setFiltersLoading(false); }
    };
    load();
  }, []);

  // ── Carga de datos ─────────────────────────────────────────────
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNoCredits(false);
    let creditsDepleted = false;

    const params: Record<string, string> = {};
    if (committed.region)       params.region = committed.region;
    if (committed.city)         params.city = committed.city;
    if (committed.neighborhood) params.neighborhood = committed.neighborhood;
    if (committed.propertyType) params.propertyType = committed.propertyType;

    const headers = authHeaders();

    try {
      const results = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/api/bots`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/api/analytics/market`, { params, headers }),
        axios.get(`${API_BASE_URL}/api/analytics/trends`, { params, headers }),
      ]);

      const [botsResult, marketResult, trendsResult] = results;
      setBots(botsResult.status === 'fulfilled' ? toArray(botsResult.value.data) : []);

      if (marketResult.status === 'rejected') {
        const err = (marketResult as PromiseRejectedResult).reason;
        if (err?.response?.status === 402) {
          creditsDepleted = true;
          setNoCredits(true);
          setError('Sin créditos disponibles. Actualiza a plan Pro para consultas ilimitadas.');
        }
      } else {
        setMarketData(marketResult.value.data || null);
        refreshCredits();
      }

      if (trendsResult.status === 'fulfilled') {
        const d = trendsResult.value.data;
        setTrendsData(toArray(d?.items || d?.data || d?.trends || d));
      }

      if (!creditsDepleted && results.some((r) => r.status === 'rejected'))
        setError('Algunos datos no se pudieron cargar.');
    } catch {
      setError('No se pudo cargar la data del dashboard.');
    } finally {
      setLoading(false);
    }
  }, [committed]);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  // ── Helpers ────────────────────────────────────────────────────
  const activeFilterCount = Object.values(staged).filter(Boolean).length;
  const clearFilters = () => { setStaged(EMPTY_FILTERS); setCommitted(EMPTY_FILTERS); };

  // ── Datos derivados ───────────────────────────────────────────
  const propertyTypeStats = useMemo(() =>
    (marketData?.byType ?? []).map((t) => ({
      ...t,
      type: normalizePropertyType(t.type),
      color: PROPERTY_TYPE_COLORS[normalizePropertyType(t.type)] || '#adb5bd',
    })).sort((a, b) => b.count - a.count),
    [marketData]);

  const globalAverages = useMemo(() => ({
    avgBedrooms: marketData?.globalAverages?.avgBedrooms ?? 0,
    avgBathrooms: marketData?.globalAverages?.avgBathrooms ?? 0,
    avgArea: marketData?.globalAverages?.avgArea ?? 0,
    avgPrice: marketData?.globalAverages?.avgPrice ?? 0,
  }), [marketData]);

  const priceDistribution = useMemo(() => {
    if (!marketData) return { currency: 'UF', data: [] };
    const uf = toArray(marketData.priceDistribution?.uf);
    const clp = toArray(marketData.priceDistribution?.clp);
    if (priceFilter === 'CLP') return { currency: 'CLP', data: clp };
    if (priceFilter === 'UF') return { currency: 'UF', data: uf };
    return uf.length >= clp.length ? { currency: 'UF', data: uf } : { currency: 'CLP', data: clp };
  }, [marketData, priceFilter]);

  const topNeighborhoods = useMemo(() => toArray(marketData?.topNeighborhoods).slice(0, 10), [marketData]);
  const propertySourceData = useMemo(() => toArray(marketData?.sources).filter((s) => s.value > 0), [marketData]);
  const botStatusData = useMemo(() => [
    { name: 'Activos', value: bots.filter((b) => b.isActive).length },
    { name: 'Inactivos', value: bots.filter((b) => !b.isActive).length },
  ], [bots]);
  const executionData = useMemo(() =>
    trendsData.map((item: any) => ({
      mes: item.mes || item.month || '?',
      exitosas: item.exitosas ?? 0,
      fallidas: item.fallidas ?? 0,
    })), [trendsData]);

  const radarTypes = useMemo(() =>
    propertyTypeStats.filter((t) => ['Departamento', 'Casa', 'Prefabricada'].includes(t.type)),
    [propertyTypeStats]);

  // ══════════════════════════════════════════════════════════════════
  // FIX RADAR: Normalización 0-100 para ejes + valores reales en _real
  //
  // El RadarChart de recharts necesita que todas las métricas estén
  // en la misma escala (0-100) para que el pentágono tenga sentido.
  // PERO el tooltip debe mostrar los valores reales.
  //
  // Solución: cada fila tiene:
  //   row["Casa"] = 100          → para el gráfico (normalizado)
  //   row["Casa_real"] = "3.0"   → para el tooltip (valor humano)
  // ══════════════════════════════════════════════════════════════════
  const radarData = useMemo(() => {
    if (radarTypes.length === 0) return [];

    const maxBedrooms  = Math.max(...radarTypes.map((t) => t.avgBedrooms ?? 0), 1);
    const maxBathrooms = Math.max(...radarTypes.map((t) => t.avgBathrooms ?? 0), 1);
    const maxArea      = Math.max(...radarTypes.map((t) => t.avgArea ?? 0), 1);
    const maxPrice     = Math.max(...radarTypes.map((t) => t.avgPrice ?? 0), 1);
    const maxCount     = Math.max(...radarTypes.map((t) => t.count), 1);

    const metrics = [
      { metric: 'Dormitorios', key: 'avgBedrooms',  max: maxBedrooms  },
      { metric: 'Baños',       key: 'avgBathrooms', max: maxBathrooms },
      { metric: 'Superficie',  key: 'avgArea',      max: maxArea      },
      { metric: 'Precio',      key: 'avgPrice',     max: maxPrice     },
      { metric: 'Cantidad',    key: 'count',        max: maxCount     },
    ];

    return metrics.map((m) => {
      const row: any = { metric: m.metric };

      radarTypes.forEach((t) => {
        const rawValue = (t as any)[m.key] ?? 0;

        // Valor normalizado (0-100) → lo que dibuja el gráfico
        row[t.type] = Math.round((rawValue / m.max) * 100);

        // Valor REAL → lo que muestra el tooltip
        switch (m.key) {
          case 'avgPrice':
            row[`${t.type}_real`] = formatCLP(rawValue);
            break;
          case 'avgArea':
            row[`${t.type}_real`] = `${rawValue.toFixed(1)} m²`;
            break;
          case 'avgBedrooms':
          case 'avgBathrooms':
            row[`${t.type}_real`] = rawValue.toFixed(1);
            break;
          case 'count':
            row[`${t.type}_real`] = rawValue.toLocaleString('es-CL');
            break;
          default:
            row[`${t.type}_real`] = rawValue;
        }
      });

      return row;
    });
  }, [radarTypes]);

  const totalProperties = marketData?.totalProperties ?? 0;

  // ── Sub-componentes ───────────────────────────────────────────

  const StatCard = ({ title, value, icon, color, subtitle }: {
    title: string; value: string | number; icon: React.ReactNode; color: string; subtitle?: string;
  }) => (
    <Card sx={{
      height: '100%',
      background: `linear-gradient(135deg, ${color}08 0%, ${color}15 100%)`,
      borderLeft: `4px solid ${color}`,
      transition: 'transform 0.2s, box-shadow 0.2s',
      '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 },
    }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" sx={{ color: COLORS.mutedText, fontWeight: 500, fontSize: '0.8rem' }}>
            {title}
          </Typography>
          <Box sx={{ color, opacity: 0.7 }}>{icon}</Box>
        </Box>
        {loading
          ? <Skeleton width="60%" height={40} />
          : <Typography variant="h4" sx={{ fontWeight: 700, color: COLORS.darkText, letterSpacing: '-0.5px' }}>{value}</Typography>
        }
        {subtitle && (
          <Typography variant="caption" sx={{ color: COLORS.mutedText, mt: 0.5, display: 'block' }}>
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  const SectionHeader = ({ title, icon }: { title: string; icon?: React.ReactNode }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
      {icon && <Box sx={{ color: COLORS.primary, display: 'flex' }}>{icon}</Box>}
      <Typography variant="h6" sx={{ fontWeight: 700, color: COLORS.darkText, letterSpacing: '-0.3px' }}>{title}</Typography>
    </Box>
  );

  const ChartPaper = ({ children, sx: sxProp }: { children: React.ReactNode; sx?: object }) => (
    <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e9ecef', background: COLORS.cardBg, ...sxProp }}>
      {children}
    </Paper>
  );

  const EmptyState = ({ message }: { message: string }) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, color: COLORS.mutedText }}>
      <Typography variant="body2">{message}</Typography>
    </Box>
  );

  // ── Render ───────────────────────────────────────────────────────

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, backgroundColor: COLORS.bg, minHeight: '100vh' }}>

      {/* ─── Header ─── */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button variant="outlined" startIcon={<ArrowBackIcon />}
            onClick={() => router.push(isAdmin ? '/botdashboard' : '/')}
            sx={{ textTransform: 'none', borderRadius: 2, borderColor: '#ddd', color: COLORS.mutedText,
              '&:hover': { borderColor: COLORS.primary, color: COLORS.primary } }}>
            Volver
          </Button>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: COLORS.darkText, letterSpacing: '-1px' }}>
              Dashboard Inmobiliario
            </Typography>
            <Typography variant="body2" sx={{ color: COLORS.mutedText, mt: 0.5 }}>
              {loading ? 'Cargando...' : `${totalProperties.toLocaleString('es-CL')} propiedades`}
              {activeFilterCount > 0 && ` · ${activeFilterCount} filtro${activeFilterCount > 1 ? 's' : ''} activo${activeFilterCount > 1 ? 's' : ''}`}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {user && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar src={user.avatarUrl} sx={{ width: 36, height: 36, bgcolor: COLORS.primary, fontSize: '0.85rem' }}>
                {user.name[0].toUpperCase()}
              </Avatar>
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>{user.name}</Typography>
                <Typography variant="caption" sx={{ color: COLORS.mutedText }}>{user.email}</Typography>
              </Box>
              <IconButton size="small" onClick={logout} title="Cerrar sesión">
                <LogoutIcon fontSize="small" sx={{ color: COLORS.mutedText }} />
              </IconButton>
            </Box>
          )}

          {isAdmin && (
            <Button variant="contained" startIcon={<SmartToyIcon />}
              onClick={() => router.push('/botdashboard')}
              sx={{ textTransform: 'none', borderRadius: 2, px: 3,
                    background: 'linear-gradient(45deg, #dc2626 30%, #ef4444 90%)',
                    boxShadow: '0 3px 5px 2px rgba(220,38,38,.2)' }}>
              Gestión de Bots
            </Button>
          )}

          <Button variant="contained"
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
            onClick={fetchDashboardData}
            disabled={loading || noCredits}
            sx={{ bgcolor: COLORS.primary, textTransform: 'none', borderRadius: 2, px: 3,
                  '&:hover': { bgcolor: '#0a3d68' } }}>
            Actualizar
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

      {/* ═══════════════════════════════════════════════════════════
          CREDIT BAR — Siempre visible
          ═══════════════════════════════════════════════════════════ */}
      {user && (
        <CreditBar credits={user.credits} plan={user.plan} role={user.role} />
      )}

      {/* ─── Panel de Filtros ─── */}
      <ChartPaper sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <FilterListIcon sx={{ color: COLORS.primary }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: COLORS.darkText, flex: 1 }}>
            Filtros de Ubicación
          </Typography>
          {activeFilterCount > 0 && (
            <Button size="small" startIcon={<ClearIcon />} onClick={clearFilters}
              sx={{ textTransform: 'none', color: COLORS.mutedText }}>
              Limpiar filtros
            </Button>
          )}
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2 }}>
          <FormControl size="small" fullWidth>
            <InputLabel>Región</InputLabel>
            <Select value={staged.region} label="Región"
              onChange={(e) => setStaged((p) => ({ ...p, region: e.target.value }))}
              disabled={filtersLoading || noCredits}
              startAdornment={<MapIcon sx={{ color: COLORS.mutedText, mr: 0.5, fontSize: 18 }} />}>
              <MenuItem value=""><em>Todas las regiones</em></MenuItem>
              {locations.regions.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth>
            <InputLabel>Ciudad</InputLabel>
            <Select value={staged.city} label="Ciudad"
              onChange={(e) => setStaged((p) => ({ ...p, city: e.target.value }))}
              disabled={filtersLoading || filteredCities.length === 0 || noCredits}>
              <MenuItem value=""><em>Todas las ciudades</em></MenuItem>
              {filteredCities.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth>
            <InputLabel>Comuna / Barrio</InputLabel>
            <Select value={staged.neighborhood} label="Comuna / Barrio"
              onChange={(e) => setStaged((p) => ({ ...p, neighborhood: e.target.value }))}
              disabled={filtersLoading || filteredNeighborhoods.length === 0 || noCredits}>
              <MenuItem value=""><em>Todas las comunas</em></MenuItem>
              {filteredNeighborhoods.map((n) => <MenuItem key={n} value={n}>{n}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth>
            <InputLabel>Tipo de Propiedad</InputLabel>
            <Select value={staged.propertyType} label="Tipo de Propiedad"
              onChange={(e) => setStaged((p) => ({ ...p, propertyType: e.target.value }))}
              disabled={filtersLoading || noCredits}>
              <MenuItem value=""><em>Todos los tipos</em></MenuItem>
              {locations.propertyTypes.map((t) => <MenuItem key={t} value={t}>{normalizePropertyType(t)}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>

        {activeFilterCount > 0 && (
          <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
            {staged.region && <Chip size="small" label={`Región: ${staged.region}`} onDelete={() => setStaged((p) => ({ ...p, region: '' }))} color="primary" variant="outlined" />}
            {staged.city && <Chip size="small" label={`Ciudad: ${staged.city}`} onDelete={() => setStaged((p) => ({ ...p, city: '' }))} color="primary" variant="outlined" />}
            {staged.neighborhood && <Chip size="small" label={`Comuna: ${staged.neighborhood}`} onDelete={() => setStaged((p) => ({ ...p, neighborhood: '' }))} color="primary" variant="outlined" />}
            {staged.propertyType && <Chip size="small" label={`Tipo: ${normalizePropertyType(staged.propertyType)}`} onDelete={() => setStaged((p) => ({ ...p, propertyType: '' }))} color="primary" variant="outlined" />}
          </Box>
        )}
      </ChartPaper>

      {/* ─── KPI Cards ─── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' }, gap: 2, mb: 4 }}>
        <StatCard title="Total Propiedades" value={totalProperties.toLocaleString('es-CL')} icon={<HomeIcon />} color={COLORS.primary} />
        <StatCard title="Bots Activos" value={`${botStatusData[0]?.value || 0} / ${bots.length}`} icon={<TrendingUpIcon />} color={COLORS.success} />
        <StatCard title="Prom. Dormitorios" value={globalAverages.avgBedrooms ? globalAverages.avgBedrooms.toFixed(1) : '—'} icon={<BedIcon />} color="#7c3aed" subtitle="Por propiedad" />
        <StatCard title="Prom. Baños" value={globalAverages.avgBathrooms ? globalAverages.avgBathrooms.toFixed(1) : '—'} icon={<BathtubIcon />} color={COLORS.secondary} subtitle="Por propiedad" />
        <StatCard title="Prom. Superficie" value={globalAverages.avgArea > 0 ? `${Math.round(globalAverages.avgArea)} m²` : '—'} icon={<SquareFootIcon />} color={COLORS.accent} subtitle="Metros cuadrados" />
        <StatCard title="Tipos Detectados" value={propertyTypeStats.length} icon={<ApartmentIcon />} color={COLORS.warning} subtitle={propertyTypeStats.slice(0, 2).map((t) => t.type).join(', ')} />
      </Box>

      {/* ─── Distribución por tipo + Radar ─── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3, mb: 3 }}>
        <ChartPaper>
          <SectionHeader title="Distribución por Tipo" icon={<ApartmentIcon />} />
          {loading ? <Skeleton variant="rectangular" height={280} /> : propertyTypeStats.length === 0 ? (
            <EmptyState message="No hay propiedades para los filtros seleccionados" />
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <ResponsiveContainer width="55%" height={280}>
                <PieChart>
                  <Pie data={propertyTypeStats} dataKey="count" nameKey="type" cx="50%" cy="50%"
                    outerRadius={100} innerRadius={50} paddingAngle={2}
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {propertyTypeStats.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number, n: string) => [`${v} propiedades`, n]} />
                </PieChart>
              </ResponsiveContainer>
              <Box sx={{ flex: 1 }}>
                {propertyTypeStats.map((t) => (
                  <Box key={t.type} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '3px', bgcolor: t.color, flexShrink: 0 }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{t.type}</Typography>
                      <Typography variant="caption" sx={{ color: COLORS.mutedText }}>
                        {t.count} ({totalProperties > 0 ? ((t.count / totalProperties) * 100).toFixed(0) : 0}%)
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </ChartPaper>

        {/* ══════════════════════════════════════════════════════════
            RADAR — FIX: Tooltip con RadarTooltipContent
            Ahora muestra "Casa: 3.0" en vez de "Casa: 100"
            ══════════════════════════════════════════════════════════ */}
        <ChartPaper>
          <SectionHeader title="Comparativa: Depto vs Casa vs Prefabricada" icon={<LocationCityIcon />} />
          {loading ? <Skeleton variant="rectangular" height={280} /> : radarData.length === 0 ? (
            <EmptyState message="Se necesitan datos de varios tipos de propiedad" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                <PolarGrid stroke="#e9ecef" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12, fill: COLORS.mutedText }} />
                <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                {radarTypes.map((t) => (
                  <Radar key={t.type} name={t.type} dataKey={t.type}
                    stroke={t.color} fill={t.color} fillOpacity={0.15} strokeWidth={2} />
                ))}
                <Legend />
                <Tooltip content={<RadarTooltipContent />} />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </ChartPaper>
      </Box>

      {/* ─── Tabla comparativa ─── */}
      {propertyTypeStats.length > 0 && (
        <ChartPaper sx={{ mb: 3 }}>
          <SectionHeader title="Promedios por Tipo de Propiedad" icon={<BathtubIcon />} />
          <Box sx={{ overflowX: 'auto' }}>
            <Box component="table" sx={{
              width: '100%', borderCollapse: 'collapse',
              '& th': { p: 1.5, textAlign: 'left', borderBottom: '2px solid #e9ecef', fontSize: '0.8rem', color: COLORS.mutedText, fontWeight: 600, textTransform: 'uppercase' },
              '& td': { p: 1.5, borderBottom: '1px solid #f0f0f0', fontSize: '0.9rem' },
              '& tr:hover td': { bgcolor: '#f8f9fa' },
            }}>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th style={{ textAlign: 'center' }}>Cantidad</th>
                  <th style={{ textAlign: 'center' }}>Prom. Dormitorios</th>
                  <th style={{ textAlign: 'center' }}>Prom. Baños</th>
                  <th style={{ textAlign: 'center' }}>Prom. m²</th>
                  <th style={{ textAlign: 'right' }}>Precio Promedio</th>
                  <th style={{ textAlign: 'right' }}>Rango de Precios</th>
                </tr>
              </thead>
              <tbody>
                {propertyTypeStats.map((t) => (
                  <tr key={t.type}>
                    <td>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: t.color }} />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{t.type}</Typography>
                      </Box>
                    </td>
                    <td style={{ textAlign: 'center' }}><Chip label={t.count} size="small" sx={{ fontWeight: 600 }} /></td>
                    <td style={{ textAlign: 'center' }}>{t.avgBedrooms ? t.avgBedrooms.toFixed(1) : '—'}</td>
                    <td style={{ textAlign: 'center' }}>{t.avgBathrooms ? t.avgBathrooms.toFixed(1) : '—'}</td>
                    <td style={{ textAlign: 'center' }}>{t.avgArea ? `${Math.round(t.avgArea)} m²` : '—'}</td>
                    <td style={{ textAlign: 'right' }}><Typography variant="body2" sx={{ fontWeight: 600, color: COLORS.primary }}>{t.avgPrice ? formatCLP(t.avgPrice) : '—'}</Typography></td>
                    <td style={{ textAlign: 'right' }}>
                      <Typography variant="caption" sx={{ color: COLORS.mutedText }}>
                        {t.minPrice ? `${formatCLP(t.minPrice)} – ${formatCLP(t.maxPrice ?? 0)}` : '—'}
                      </Typography>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Box>
          </Box>
        </ChartPaper>
      )}

      {/* ─── Distribución precios + Baños/Dormitorios ─── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3, mb: 3 }}>
        <ChartPaper>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <SectionHeader title="Distribución de Precios" icon={<AttachMoneyIcon />} />
            <ToggleButtonGroup value={priceFilter} exclusive onChange={(_, v) => v && setPriceFilter(v)} size="small">
              <ToggleButton value="auto" sx={{ textTransform: 'none', px: 2 }}>Auto</ToggleButton>
              <ToggleButton value="UF" sx={{ textTransform: 'none', px: 2 }}>UF</ToggleButton>
              <ToggleButton value="CLP" sx={{ textTransform: 'none', px: 2 }}>CLP</ToggleButton>
            </ToggleButtonGroup>
          </Box>
          {loading ? <Skeleton variant="rectangular" height={280} /> : priceDistribution.data.length === 0 ? (
            <EmptyState message="Sin datos de precios para los filtros seleccionados" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={priceDistribution.data} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="rango" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [`${v} propiedades`]} />
                <Bar dataKey="cantidad" fill={COLORS.primary} radius={[4, 4, 0, 0]} name="Propiedades" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartPaper>

        <ChartPaper>
          <SectionHeader title="Baños y Dormitorios por Tipo" icon={<BathtubIcon />} />
          {loading ? <Skeleton variant="rectangular" height={280} /> : propertyTypeStats.length === 0 ? (
            <EmptyState message="Sin datos" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={propertyTypeStats.slice(0, 6)} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="type" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="avgBedrooms" fill={COLORS.primary} name="Prom. Dormitorios" radius={[4, 4, 0, 0]} />
                <Bar dataKey="avgBathrooms" fill={COLORS.secondary} name="Prom. Baños" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartPaper>
      </Box>

      {/* ─── Top comunas + Ejecuciones ─── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3, mb: 3 }}>
        <ChartPaper>
          <SectionHeader title="Top Comunas / Ciudades" icon={<LocationCityIcon />} />
          {loading ? <Skeleton variant="rectangular" height={300} /> : topNeighborhoods.length === 0 ? (
            <EmptyState message="Sin datos de ubicación" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topNeighborhoods} layout="vertical" barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                <Tooltip />
                <Bar dataKey="count" fill={COLORS.accent} name="Propiedades" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartPaper>

        <ChartPaper>
          <SectionHeader title="Ejecuciones Mensuales" icon={<TrendingUpIcon />} />
          {loading ? <Skeleton variant="rectangular" height={300} /> : executionData.length === 0 ? (
            <EmptyState message="Sin datos de ejecuciones" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={executionData}>
                <defs>
                  <linearGradient id="gradSuccess" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.success} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradError" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.error} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.error} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="exitosas" stroke={COLORS.success} fill="url(#gradSuccess)" strokeWidth={2} name="Exitosas" />
                <Area type="monotone" dataKey="fallidas" stroke={COLORS.error} fill="url(#gradError)" strokeWidth={2} name="Fallidas" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartPaper>
      </Box>

      {/* ─── Fuentes + Estado bots ─── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3 }}>
        <ChartPaper>
          <SectionHeader title="Propiedades por Fuente" />
          {loading ? <Skeleton variant="rectangular" height={280} /> : propertySourceData.length === 0 ? (
            <EmptyState message="Sin datos de fuentes" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={propertySourceData} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill={COLORS.primary} name="Propiedades" radius={[4, 4, 0, 0]}>
                  {propertySourceData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartPaper>

        <ChartPaper>
          <SectionHeader title="Estado de Bots" />
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={botStatusData} cx="50%" cy="50%" labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={90} innerRadius={45} dataKey="value" paddingAngle={3}>
                <Cell fill={COLORS.success} />
                <Cell fill="#dee2e6" />
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartPaper>
      </Box>
    </Box>
  );
}