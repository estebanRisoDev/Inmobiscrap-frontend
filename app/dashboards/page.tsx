'use client';
// app/dashboards/page.tsx
// REFACTOR: Eliminados gráficos de bots → movidos a modal en botdashboard.
// NUEVO: Gráficos de historial de propiedades (precios, cambios, tracking).

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  Box, Paper, Typography, Card, CardContent, CircularProgress,
  Alert, Button, Chip, Select, MenuItem, FormControl,
  InputLabel, IconButton, Skeleton, Avatar, Divider,
  ToggleButton, ToggleButtonGroup, LinearProgress, Tooltip,
} from '@mui/material';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip, Legend, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  AreaChart, Area, LineChart, Line, ComposedChart,
} from 'recharts';
import RefreshIcon       from '@mui/icons-material/Refresh';
import HomeIcon          from '@mui/icons-material/Home';
import ApartmentIcon     from '@mui/icons-material/Apartment';
import BathtubIcon       from '@mui/icons-material/Bathtub';
import BedIcon           from '@mui/icons-material/Bed';
import SquareFootIcon    from '@mui/icons-material/SquareFoot';
import AttachMoneyIcon   from '@mui/icons-material/AttachMoney';
import TrendingUpIcon    from '@mui/icons-material/TrendingUp';
import TrendingDownIcon  from '@mui/icons-material/TrendingDown';
import LocationCityIcon  from '@mui/icons-material/LocationCity';
import FilterListIcon    from '@mui/icons-material/FilterList';
import ClearIcon         from '@mui/icons-material/Clear';
import MapIcon           from '@mui/icons-material/Map';
import ArrowBackIcon     from '@mui/icons-material/ArrowBack';
import LogoutIcon        from '@mui/icons-material/Logout';
import StarIcon          from '@mui/icons-material/Star';
import SmartToyIcon      from '@mui/icons-material/SmartToy';
import TokenIcon         from '@mui/icons-material/Token';
import TimelineIcon      from '@mui/icons-material/Timeline';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import ChangeCircleIcon  from '@mui/icons-material/ChangeCircle';
import NewReleasesIcon   from '@mui/icons-material/NewReleases';
import { useRouter }     from 'next/navigation';
import { useAuth }       from '@/context/AuthContext';
import { authHeaders }   from '@/lib/auth';

const API_BASE_URL = 'http://localhost:5000';
const INITIAL_CREDITS = 50;

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

interface TrackingStats {
  totalTracked: number;
  newProperties: number;
  priceChanges: number;
  delisted: number;
  unchanged: number;
  priceHistory?: Array<{ mes: string; avgPrice: number; count: number; minPrice?: number; maxPrice?: number }>;
  priceChangeBreakdown?: Array<{ label: string; value: number }>;
}

interface PriceChangeItem {
  id: number;
  title: string;
  neighborhood?: string;
  city?: string;
  propertyType?: string;
  oldPrice: number;
  newPrice: number;
  priceDiff: number;
  priceDiffPct: number;
  currency: string;
  changedAt: string;
  url?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const toArray = (v: any) => (Array.isArray(v) ? v : []);

const formatCLP = (value: number | undefined | null) => {
  if (value == null || isNaN(value)) return '—';
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000)     return `$${(value / 1_000_000).toFixed(0)}M`;
  if (value >= 1_000)         return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString('es-CL')}`;
};

const normalizePropertyType = (type?: string): string => {
  if (!type) return 'Otro';
  const l = type.toLowerCase().trim();
  if (l.includes('departamento') || l.includes('depto')) return 'Departamento';
  if (l.includes('casa') && !l.includes('prefab'))        return 'Casa';
  if (l.includes('prefab') || l.includes('modular'))      return 'Prefabricada';
  if (l.includes('terreno') || l.includes('parcela'))     return 'Terreno';
  if (l.includes('oficina'))                              return 'Oficina';
  if (l.includes('local') || l.includes('comercial'))     return 'Local Comercial';
  return type.charAt(0).toUpperCase() + type.slice(1);
};

// ── Paleta ─────────────────────────────────────────────────────────────────────

const COLORS = {
  primary:  '#0f4c81',
  secondary:'#e8927c',
  accent:   '#2ec4b6',
  warning:  '#f4a261',
  error:    '#e76f51',
  success:  '#2a9d8f',
  neutral:  '#264653',
  up:       '#16a34a',
  down:     '#dc2626',
  bg:       '#f8f9fa',
  cardBg:   '#ffffff',
  darkText: '#1a1a2e',
  mutedText:'#6c757d',
};

const PROPERTY_TYPE_COLORS: Record<string, string> = {
  'Departamento':    '#0f4c81',
  'Casa':            '#2a9d8f',
  'Prefabricada':    '#e8927c',
  'Terreno':         '#f4a261',
  'Oficina':         '#264653',
  'Local Comercial': '#e76f51',
  'Bodega':          '#8ecae6',
  'Otro':            '#adb5bd',
};

const PIE_COLORS   = ['#0f4c81','#2a9d8f','#e8927c','#f4a261','#264653','#e76f51','#8ecae6','#adb5bd'];
const EMPTY_FILTERS: Filters = { region: '', city: '', neighborhood: '', propertyType: '' };

// ── Radar Tooltip ──────────────────────────────────────────────────────────────

const RadarTooltipContent = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <Paper elevation={3} sx={{ p: 1.5, minWidth: 180, border: '1px solid #e0e0e0' }}>
      <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.75, color: COLORS.darkText }}>{label}</Typography>
      {payload.map((entry: any) => {
        const realValue = entry.payload?.[`${entry.dataKey}_real`];
        return (
          <Box key={entry.dataKey} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.4 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: entry.color, flexShrink: 0 }} />
            <Typography variant="caption" sx={{ color: COLORS.mutedText, minWidth: 80 }}>{entry.name}:</Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, color: COLORS.darkText }}>{realValue ?? entry.value}</Typography>
          </Box>
        );
      })}
    </Paper>
  );
};

// ── Price History Tooltip ──────────────────────────────────────────────────────

const PriceHistoryTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <Paper elevation={3} sx={{ p: 1.5, minWidth: 200, border: '1px solid #e0e0e0' }}>
      <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.75 }}>{label}</Typography>
      {payload.map((entry: any) => (
        <Box key={entry.dataKey} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 0.4 }}>
          <Typography variant="caption" sx={{ color: entry.color }}>{entry.name}:</Typography>
          <Typography variant="caption" sx={{ fontWeight: 700 }}>
            {entry.dataKey === 'count'
              ? entry.value.toLocaleString('es-CL')
              : formatCLP(entry.value)}
          </Typography>
        </Box>
      ))}
    </Paper>
  );
};

// ── Credit Bar ─────────────────────────────────────────────────────────────────

function CreditBar({ credits, plan, role }: { credits: number; plan: string; role: string }) {
  if (plan === 'pro' || role === 'admin') {
    return (
      <Paper elevation={0} sx={{ px: 2.5, py: 1.5, mb: 3, borderRadius: 2,
        display: 'flex', alignItems: 'center', gap: 1.5,
        bgcolor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
        <StarIcon sx={{ color: '#16a34a', fontSize: 20 }} />
        <Typography variant="body2" sx={{ color: '#15803d', fontWeight: 600 }}>
          {role === 'admin' ? 'Admin — Consultas ilimitadas' : 'Plan Pro — Consultas ilimitadas'}
        </Typography>
      </Paper>
    );
  }
  const percentage  = Math.max(0, Math.min(100, (credits / INITIAL_CREDITS) * 100));
  const isLow       = credits <= 10;
  const isEmpty     = credits <= 0;
  const barColor    = isEmpty ? '#ef4444' : isLow ? '#f59e0b' : '#3b82f6';
  const bgColor     = isEmpty ? '#fef2f2' : isLow ? '#fffbeb' : '#eff6ff';
  const borderColor = isEmpty ? '#fecaca' : isLow ? '#fde68a' : '#bfdbfe';
  const textColor   = isEmpty ? '#991b1b' : isLow ? '#92400e' : '#1e40af';

  return (
    <Paper elevation={0} sx={{ px: 2.5, py: 1.5, mb: 3, borderRadius: 2, bgcolor: bgColor, border: `1px solid ${borderColor}` }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TokenIcon sx={{ color: barColor, fontSize: 20 }} />
          <Typography variant="body2" sx={{ fontWeight: 700, color: textColor }}>
            {isEmpty ? 'Sin créditos disponibles' : `${credits} crédito${credits !== 1 ? 's' : ''} restante${credits !== 1 ? 's' : ''}`}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="caption" sx={{ color: COLORS.mutedText }}>{credits} / {INITIAL_CREDITS}</Typography>
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
      <LinearProgress variant="determinate" value={percentage}
        sx={{ height: 6, borderRadius: 3, bgcolor: `${barColor}20`,
              '& .MuiLinearProgress-bar': { borderRadius: 3, bgcolor: barColor } }} />
      <Typography variant="caption" sx={{ color: COLORS.mutedText, mt: 0.5, display: 'block' }}>
        Cada consulta al dashboard (filtros, actualización) consume 1 crédito.
        {!isEmpty && isLow && ' Considera actualizar a Pro para consultas ilimitadas.'}
      </Typography>
    </Paper>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════

export default function Dashboard() {
  const router = useRouter();
  const { user, logout, refreshCredits, isPro, isAdmin } = useAuth();

  // ── Estado ──────────────────────────────────────────────────────
  const [marketData,    setMarketData]    = useState<MarketData | null>(null);
  const [trackingStats, setTrackingStats] = useState<TrackingStats | null>(null);
  const [priceChanges,  setPriceChanges]  = useState<PriceChangeItem[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [filtersLoading,setFiltersLoading]= useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [priceFilter,   setPriceFilter]   = useState<'auto' | 'CLP' | 'UF'>('auto');
  const [noCredits,     setNoCredits]     = useState(false);

  const [locations, setLocations] = useState<Locations>({
    regions: [], cities: [], neighborhoods: [], propertyTypes: [],
  });
  const [staged,    setStaged]    = useState<Filters>(EMPTY_FILTERS);
  const [committed, setCommitted] = useState<Filters>(EMPTY_FILTERS);
  const [filteredCities,        setFilteredCities]        = useState<string[]>([]);
  const [filteredNeighborhoods, setFilteredNeighborhoods] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setCommitted(staged), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [staged]);

  // Cascada de filtros
  useEffect(() => {
    if (!staged.region) { setFilteredCities(locations.cities); setFilteredNeighborhoods(locations.neighborhoods); return; }
    const load = async () => {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/api/analytics/locations`,
          { params: { region: staged.region }, headers: authHeaders() });
        setFilteredCities(data.cities);
        setFilteredNeighborhoods(data.neighborhoods);
      } catch { /* fallback */ }
    };
    load();
    setStaged((p) => ({ ...p, city: '', neighborhood: '' }));
  }, [staged.region]);

  useEffect(() => {
    if (!staged.city) { setFilteredNeighborhoods(locations.neighborhoods); return; }
    const load = async () => {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/api/analytics/locations`,
          { params: { region: staged.region || undefined, city: staged.city }, headers: authHeaders() });
        setFilteredNeighborhoods(data.neighborhoods);
      } catch { /* fallback */ }
    };
    load();
    setStaged((p) => ({ ...p, neighborhood: '' }));
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
    if (committed.region)       params.region       = committed.region;
    if (committed.city)         params.city         = committed.city;
    if (committed.neighborhood) params.neighborhood = committed.neighborhood;
    if (committed.propertyType) params.propertyType = committed.propertyType;

    const headers = authHeaders();

    try {
      const results = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/api/analytics/market`,          { params, headers }),
        axios.get(`${API_BASE_URL}/api/properties/tracking-stats`, { params, headers }),
        axios.get(`${API_BASE_URL}/api/properties/price-changes`,  { params: { ...params, limit: 10 }, headers }),
      ]);

      const [marketResult, trackingResult, priceChangesResult] = results;

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

      if (trackingResult.status === 'fulfilled') {
        setTrackingStats(trackingResult.value.data || null);
      }

      if (priceChangesResult.status === 'fulfilled') {
        const d = priceChangesResult.value.data;
        setPriceChanges(toArray(d?.items || d?.data || d));
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

  // ── Datos derivados ────────────────────────────────────────────
  const propertyTypeStats = useMemo(() =>
    (marketData?.byType ?? []).map((t) => ({
      ...t,
      type:  normalizePropertyType(t.type),
      color: PROPERTY_TYPE_COLORS[normalizePropertyType(t.type)] || '#adb5bd',
    })).sort((a, b) => b.count - a.count),
    [marketData]);

  const globalAverages = useMemo(() => ({
    avgBedrooms:  marketData?.globalAverages?.avgBedrooms  ?? 0,
    avgBathrooms: marketData?.globalAverages?.avgBathrooms ?? 0,
    avgArea:      marketData?.globalAverages?.avgArea      ?? 0,
    avgPrice:     marketData?.globalAverages?.avgPrice     ?? 0,
  }), [marketData]);

  const priceDistribution = useMemo(() => {
    if (!marketData) return { currency: 'UF', data: [] };
    const uf  = toArray(marketData.priceDistribution?.uf);
    const clp = toArray(marketData.priceDistribution?.clp);
    if (priceFilter === 'CLP') return { currency: 'CLP', data: clp };
    if (priceFilter === 'UF')  return { currency: 'UF',  data: uf };
    return uf.length >= clp.length ? { currency: 'UF', data: uf } : { currency: 'CLP', data: clp };
  }, [marketData, priceFilter]);

  const topNeighborhoods  = useMemo(() => toArray(marketData?.topNeighborhoods).slice(0, 10), [marketData]);
  const propertySourceData = useMemo(() => toArray(marketData?.sources).filter((s) => s.value > 0), [marketData]);

  // Price history con fallback
  const priceHistory = useMemo(() =>
    toArray(trackingStats?.priceHistory).map((item: any) => ({
      mes:      item.mes || item.month || '?',
      avgPrice: item.avgPrice ?? 0,
      count:    item.count    ?? 0,
      minPrice: item.minPrice ?? 0,
      maxPrice: item.maxPrice ?? 0,
    })),
    [trackingStats]);

  const radarTypes = useMemo(() =>
    propertyTypeStats.filter((t) => ['Departamento', 'Casa', 'Prefabricada'].includes(t.type)),
    [propertyTypeStats]);

  const radarData = useMemo(() => {
    if (radarTypes.length === 0) return [];
    const maxBedrooms  = Math.max(...radarTypes.map((t) => t.avgBedrooms  ?? 0), 1);
    const maxBathrooms = Math.max(...radarTypes.map((t) => t.avgBathrooms ?? 0), 1);
    const maxArea      = Math.max(...radarTypes.map((t) => t.avgArea      ?? 0), 1);
    const maxPrice     = Math.max(...radarTypes.map((t) => t.avgPrice     ?? 0), 1);
    const maxCount     = Math.max(...radarTypes.map((t) => t.count), 1);

    return [
      { metric: 'Dormitorios', key: 'avgBedrooms',  max: maxBedrooms  },
      { metric: 'Baños',       key: 'avgBathrooms', max: maxBathrooms },
      { metric: 'Superficie',  key: 'avgArea',      max: maxArea      },
      { metric: 'Precio',      key: 'avgPrice',     max: maxPrice     },
      { metric: 'Cantidad',    key: 'count',        max: maxCount     },
    ].map((m) => {
      const row: any = { metric: m.metric };
      radarTypes.forEach((t) => {
        const rawValue = (t as any)[m.key] ?? 0;
        row[t.type] = Math.round((rawValue / m.max) * 100);
        switch (m.key) {
          case 'avgPrice':    row[`${t.type}_real`] = formatCLP(rawValue); break;
          case 'avgArea':     row[`${t.type}_real`] = `${rawValue.toFixed(1)} m²`; break;
          case 'avgBedrooms':
          case 'avgBathrooms':row[`${t.type}_real`] = rawValue.toFixed(1); break;
          case 'count':       row[`${t.type}_real`] = rawValue.toLocaleString('es-CL'); break;
          default:            row[`${t.type}_real`] = rawValue;
        }
      });
      return row;
    });
  }, [radarTypes]);

  const totalProperties = marketData?.totalProperties ?? 0;

  // ── Sub-componentes ──────────────────────────────────────────────

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
          <Typography variant="caption" sx={{ color: COLORS.mutedText, mt: 0.5, display: 'block' }}>{subtitle}</Typography>
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

  // ── Render ────────────────────────────────────────────────────────

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

      {user && <CreditBar credits={user.credits} plan={user.plan} role={user.role} />}

      {/* ─── Panel de Filtros ─── */}
      <ChartPaper sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <FilterListIcon sx={{ color: COLORS.primary }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: COLORS.darkText, flex: 1 }}>Filtros de Ubicación</Typography>
          {activeFilterCount > 0 && (
            <Button size="small" startIcon={<ClearIcon />} onClick={clearFilters} sx={{ textTransform: 'none', color: COLORS.mutedText }}>
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
            {staged.region       && <Chip size="small" label={`Región: ${staged.region}`}       onDelete={() => setStaged((p) => ({ ...p, region: '' }))}       color="primary" variant="outlined" />}
            {staged.city         && <Chip size="small" label={`Ciudad: ${staged.city}`}         onDelete={() => setStaged((p) => ({ ...p, city: '' }))}         color="primary" variant="outlined" />}
            {staged.neighborhood && <Chip size="small" label={`Comuna: ${staged.neighborhood}`} onDelete={() => setStaged((p) => ({ ...p, neighborhood: '' }))} color="primary" variant="outlined" />}
            {staged.propertyType && <Chip size="small" label={`Tipo: ${normalizePropertyType(staged.propertyType)}`} onDelete={() => setStaged((p) => ({ ...p, propertyType: '' }))} color="primary" variant="outlined" />}
          </Box>
        )}
      </ChartPaper>

      {/* ─── KPI Cards ─── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' }, gap: 2, mb: 4 }}>
        <StatCard title="Total Propiedades" value={totalProperties.toLocaleString('es-CL')} icon={<HomeIcon />}       color={COLORS.primary} />
        <StatCard title="Tipos Detectados"  value={propertyTypeStats.length}                icon={<ApartmentIcon />}  color={COLORS.warning} subtitle={propertyTypeStats.slice(0, 2).map((t) => t.type).join(', ')} />
        <StatCard title="Prom. Dormitorios" value={globalAverages.avgBedrooms  ? globalAverages.avgBedrooms.toFixed(1)  : '—'} icon={<BedIcon />}         color="#7c3aed" subtitle="Por propiedad" />
        <StatCard title="Prom. Baños"       value={globalAverages.avgBathrooms ? globalAverages.avgBathrooms.toFixed(1) : '—'} icon={<BathtubIcon />}     color={COLORS.secondary} subtitle="Por propiedad" />
        <StatCard title="Prom. Superficie"  value={globalAverages.avgArea > 0  ? `${Math.round(globalAverages.avgArea)} m²` : '—'} icon={<SquareFootIcon />}  color={COLORS.accent}   subtitle="Metros cuadrados" />
        <StatCard title="Precio Promedio"   value={globalAverages.avgPrice > 0 ? formatCLP(globalAverages.avgPrice) : '—'} icon={<AttachMoneyIcon />} color={COLORS.success}  subtitle="Precio de mercado" />
      </Box>

      {/* ══════════════════════════════════════════════════════════════
          SECCIÓN TRACKING: KPIs de historial de propiedades
          ══════════════════════════════════════════════════════════════ */}
      <ChartPaper sx={{ mb: 3 }}>
        <SectionHeader title="Seguimiento y Cambios de Propiedades" icon={<TimelineIcon />} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2 }}>
          {[
            {
              label:    'Nuevas (última ejecución)',
              value:    trackingStats?.newProperties ?? '—',
              icon:     <NewReleasesIcon />,
              color:    '#2563eb',
              bg:       '#eff6ff',
              border:   '#bfdbfe',
            },
            {
              label:    'Cambios de precio detectados',
              value:    trackingStats?.priceChanges ?? '—',
              icon:     <ChangeCircleIcon />,
              color:    '#d97706',
              bg:       '#fffbeb',
              border:   '#fde68a',
            },
            {
              label:    'Despublicadas / eliminadas',
              value:    trackingStats?.delisted ?? '—',
              icon:     <VisibilityOffIcon />,
              color:    '#dc2626',
              bg:       '#fef2f2',
              border:   '#fecaca',
            },
            {
              label:    'Sin cambios',
              value:    trackingStats?.unchanged ?? '—',
              icon:     <NotificationsActiveIcon />,
              color:    '#16a34a',
              bg:       '#f0fdf4',
              border:   '#bbf7d0',
            },
          ].map((item) => (
            <Paper key={item.label} elevation={0}
              sx={{ p: 2, borderRadius: 2, bgcolor: item.bg, border: `1px solid ${item.border}`,
                    transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-2px)' } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Box sx={{ color: item.color, display: 'flex' }}>{item.icon}</Box>
                <Typography variant="caption" sx={{ color: item.color, fontWeight: 600, fontSize: '0.75rem' }}>
                  {item.label}
                </Typography>
              </Box>
              {loading
                ? <Skeleton width="50%" height={36} />
                : <Typography variant="h4" sx={{ fontWeight: 800, color: item.color, letterSpacing: '-1px' }}>
                    {typeof item.value === 'number' ? item.value.toLocaleString('es-CL') : item.value}
                  </Typography>
              }
            </Paper>
          ))}
        </Box>
      </ChartPaper>

      {/* ══════════════════════════════════════════════════════════════
          PRECIO: Evolución temporal (gráfico principal)
          ══════════════════════════════════════════════════════════════ */}
      <ChartPaper sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AttachMoneyIcon sx={{ color: COLORS.primary }} />
            <Typography variant="h6" sx={{ fontWeight: 700, color: COLORS.darkText }}>
              Evolución del Precio Promedio
            </Typography>
          </Box>
          <Chip label="Histórico mensual" size="small" sx={{ bgcolor: '#e0f2fe', color: '#0369a1', fontWeight: 600 }} />
        </Box>
        {loading ? <Skeleton variant="rectangular" height={320} sx={{ borderRadius: 2 }} /> :
         priceHistory.length === 0 ? (
          <EmptyState message="Sin historial de precios. Los datos aparecerán tras varias ejecuciones de los bots." />
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={priceHistory}>
              <defs>
                <linearGradient id="gradPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={COLORS.primary} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}    />
                </linearGradient>
                <linearGradient id="gradCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={COLORS.accent} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={COLORS.accent} stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="price" orientation="left"  tick={{ fontSize: 11 }} tickFormatter={(v) => formatCLP(v)} />
              <YAxis yAxisId="count" orientation="right" tick={{ fontSize: 11 }} />
              <RechartTooltip content={<PriceHistoryTooltip />} />
              <Legend />
              <Area  yAxisId="price" type="monotone" dataKey="avgPrice" stroke={COLORS.primary} fill="url(#gradPrice)" strokeWidth={2.5} name="Precio promedio" dot={{ r: 4, fill: COLORS.primary }} />
              <Bar   yAxisId="count" dataKey="count" fill={COLORS.accent} fillOpacity={0.35} radius={[3, 3, 0, 0]} name="Propiedades" />
              {priceHistory[0]?.minPrice !== undefined && (
                <Line yAxisId="price" type="monotone" dataKey="minPrice" stroke="#94a3b8" strokeDasharray="4 2" strokeWidth={1.5} dot={false} name="Precio mínimo" />
              )}
              {priceHistory[0]?.maxPrice !== undefined && (
                <Line yAxisId="price" type="monotone" dataKey="maxPrice" stroke="#f97316" strokeDasharray="4 2" strokeWidth={1.5} dot={false} name="Precio máximo" />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </ChartPaper>

      {/* ══════════════════════════════════════════════════════════════
          CAMBIOS DE PRECIO RECIENTES + DISTRIBUCIÓN DE PRECIOS
          ══════════════════════════════════════════════════════════════ */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3, mb: 3 }}>

        {/* Cambios de precio recientes */}
        <ChartPaper>
          <SectionHeader title="Cambios de Precio Recientes" icon={<TrendingUpIcon />} />
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height={52} sx={{ mb: 1, borderRadius: 1 }} />)
          ) : priceChanges.length === 0 ? (
            <EmptyState message="Sin cambios de precio detectados recientemente" />
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {priceChanges.slice(0, 8).map((item, idx) => {
                const isUp   = item.priceDiff > 0;
                const color  = isUp ? COLORS.down : COLORS.up;
                const bg     = isUp ? '#fef2f2' : '#f0fdf4';
                const border = isUp ? '#fecaca' : '#bbf7d0';
                return (
                  <Paper key={item.id ?? idx} elevation={0}
                    sx={{ p: 1.5, bgcolor: bg, border: `1px solid ${border}`, borderRadius: 2,
                          transition: 'box-shadow 0.15s', '&:hover': { boxShadow: 2 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box sx={{ flex: 1, minWidth: 0, mr: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.82rem',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.title}
                        </Typography>
                        <Typography variant="caption" sx={{ color: COLORS.mutedText }}>
                          {[item.neighborhood, item.city].filter(Boolean).join(', ') || '—'}
                          {item.propertyType && ` · ${normalizePropertyType(item.propertyType)}`}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end' }}>
                          {isUp ? <TrendingUpIcon sx={{ fontSize: 16, color }} /> : <TrendingDownIcon sx={{ fontSize: 16, color }} />}
                          <Typography variant="body2" sx={{ fontWeight: 800, color, fontSize: '0.85rem' }}>
                            {isUp ? '+' : ''}{item.priceDiffPct?.toFixed(1)}%
                          </Typography>
                        </Box>
                        <Typography variant="caption" sx={{ color: COLORS.mutedText, fontSize: '0.7rem' }}>
                          {formatCLP(item.oldPrice)} → {formatCLP(item.newPrice)}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          )}
        </ChartPaper>

        {/* Distribución de precios */}
        <ChartPaper>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <SectionHeader title="Distribución de Precios" icon={<AttachMoneyIcon />} />
            <ToggleButtonGroup value={priceFilter} exclusive onChange={(_, v) => v && setPriceFilter(v)} size="small">
              <ToggleButton value="auto" sx={{ textTransform: 'none', px: 2 }}>Auto</ToggleButton>
              <ToggleButton value="UF"   sx={{ textTransform: 'none', px: 2 }}>UF</ToggleButton>
              <ToggleButton value="CLP"  sx={{ textTransform: 'none', px: 2 }}>CLP</ToggleButton>
            </ToggleButtonGroup>
          </Box>
          {loading ? <Skeleton variant="rectangular" height={280} /> :
           priceDistribution.data.length === 0 ? (
            <EmptyState message="Sin datos de precios para los filtros seleccionados" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={priceDistribution.data} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="rango" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <RechartTooltip formatter={(v: number) => [`${v} propiedades`]} />
                <Bar dataKey="cantidad" fill={COLORS.primary} radius={[4, 4, 0, 0]} name="Propiedades" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartPaper>
      </Box>

      {/* ─── Distribución por tipo + Radar ─── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3, mb: 3 }}>
        <ChartPaper>
          <SectionHeader title="Distribución por Tipo" icon={<ApartmentIcon />} />
          {loading ? <Skeleton variant="rectangular" height={280} /> :
           propertyTypeStats.length === 0 ? (
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
                  <RechartTooltip formatter={(v: number, n: string) => [`${v} propiedades`, n]} />
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

        <ChartPaper>
          <SectionHeader title="Comparativa: Depto vs Casa vs Prefabricada" icon={<LocationCityIcon />} />
          {loading ? <Skeleton variant="rectangular" height={280} /> :
           radarData.length === 0 ? (
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
                <RechartTooltip content={<RadarTooltipContent />} />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </ChartPaper>
      </Box>

      {/* ─── Tabla comparativa por tipo ─── */}
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
                  <th style={{ textAlign: 'right'  }}>Precio Promedio</th>
                  <th style={{ textAlign: 'right'  }}>Rango de Precios</th>
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
                    <td style={{ textAlign: 'center' }}>{t.avgBedrooms  ? t.avgBedrooms.toFixed(1)  : '—'}</td>
                    <td style={{ textAlign: 'center' }}>{t.avgBathrooms ? t.avgBathrooms.toFixed(1) : '—'}</td>
                    <td style={{ textAlign: 'center' }}>{t.avgArea ? `${Math.round(t.avgArea)} m²` : '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: COLORS.primary }}>
                        {t.avgPrice ? formatCLP(t.avgPrice) : '—'}
                      </Typography>
                    </td>
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

      {/* ─── Baños/Dormitorios + Top comunas ─── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3, mb: 3 }}>
        <ChartPaper>
          <SectionHeader title="Baños y Dormitorios por Tipo" icon={<BathtubIcon />} />
          {loading ? <Skeleton variant="rectangular" height={280} /> :
           propertyTypeStats.length === 0 ? <EmptyState message="Sin datos" /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={propertyTypeStats.slice(0, 6)} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="type" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <RechartTooltip />
                <Legend />
                <Bar dataKey="avgBedrooms"  fill={COLORS.primary}   name="Prom. Dormitorios" radius={[4, 4, 0, 0]} />
                <Bar dataKey="avgBathrooms" fill={COLORS.secondary} name="Prom. Baños"        radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartPaper>

        <ChartPaper>
          <SectionHeader title="Top Comunas / Ciudades" icon={<LocationCityIcon />} />
          {loading ? <Skeleton variant="rectangular" height={280} /> :
           topNeighborhoods.length === 0 ? <EmptyState message="Sin datos de ubicación" /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topNeighborhoods} layout="vertical" barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                <RechartTooltip />
                <Bar dataKey="count" fill={COLORS.accent} name="Propiedades" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartPaper>
      </Box>

      {/* ─── Propiedades por Fuente ─── */}
      <ChartPaper>
        <SectionHeader title="Propiedades por Fuente" />
        {loading ? <Skeleton variant="rectangular" height={280} /> :
         propertySourceData.length === 0 ? <EmptyState message="Sin datos de fuentes" /> : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={propertySourceData} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <RechartTooltip />
              <Bar dataKey="value" fill={COLORS.primary} name="Propiedades" radius={[4, 4, 0, 0]}>
                {propertySourceData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartPaper>
    </Box>
  );
}