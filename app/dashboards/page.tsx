'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import axios from 'axios';
import {
  Box, Paper, Typography, Card, CardContent, CircularProgress,
  Alert, Button, Chip, Divider, Select, MenuItem, FormControl,
  InputLabel, IconButton, Tooltip as MuiTooltip,
  ToggleButton, ToggleButtonGroup, Skeleton,
} from '@mui/material';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
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

const API_BASE_URL = 'http://localhost:5000';

// ══════════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════════

interface Locations {
  regions: string[];
  cities: string[];
  neighborhoods: string[];
  propertyTypes: string[];
}

interface ActiveFilters {
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

interface Bot {
  id: number;
  isActive: boolean;
  totalScraped?: number;
}

type UnknownRecord = Record<string, any>;

// ══════════════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════════════

const toArray = (v: any) => (Array.isArray(v) ? v : []);

const formatCLP = (value: number) => {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString('es-CL')}`;
};

const normalizePropertyType = (type?: string): string => {
  if (!type) return 'Otro';
  const lower = type.toLowerCase().trim();
  if (lower.includes('departamento') || lower.includes('depto') || lower.includes('dpto')) return 'Departamento';
  if (lower.includes('casa') && !lower.includes('prefab')) return 'Casa';
  if (lower.includes('prefab') || lower.includes('modular')) return 'Prefabricada';
  if (lower.includes('terreno') || lower.includes('parcela') || lower.includes('sitio')) return 'Terreno';
  if (lower.includes('oficina')) return 'Oficina';
  if (lower.includes('local') || lower.includes('comercial')) return 'Local Comercial';
  if (lower.includes('bodega') || lower.includes('galpon')) return 'Bodega';
  return type.charAt(0).toUpperCase() + type.slice(1);
};

// ══════════════════════════════════════════════════════════════════
// Paleta
// ══════════════════════════════════════════════════════════════════

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

// ══════════════════════════════════════════════════════════════════
// Componente principal
// ══════════════════════════════════════════════════════════════════

export default function Dashboard() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [trendsData, setTrendsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersLoading, setFiltersLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [priceFilter, setPriceFilter] = useState<'auto' | 'CLP' | 'UF'>('auto');

  // Opciones disponibles para los filtros (cargadas una sola vez)
  const [locations, setLocations] = useState<Locations>({ regions: [], cities: [], neighborhoods: [], propertyTypes: [] });

  // Filtros activos
  const [filters, setFilters] = useState<ActiveFilters>({ region: '', city: '', neighborhood: '', propertyType: '' });

  // Ciudades / comunas filtradas por la región seleccionada
  const [filteredCities, setFilteredCities] = useState<string[]>([]);
  const [filteredNeighborhoods, setFilteredNeighborhoods] = useState<string[]>([]);

  // ── Cargar opciones de filtros (solo una vez) ──────────────────
  useEffect(() => {
    const loadLocations = async () => {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/api/analytics/locations`);
        setLocations(data);
        setFilteredCities(data.cities);
        setFilteredNeighborhoods(data.neighborhoods);
      } catch (e) {
        console.error('Error loading locations', e);
      } finally {
        setFiltersLoading(false);
      }
    };
    loadLocations();
  }, []);

  // ── Cuando cambia la región, recalcular ciudades disponibles ──
  // (sin llamada extra al backend: ya tenemos todas las opciones)
  useEffect(() => {
    if (!filters.region) {
      setFilteredCities(locations.cities);
      setFilteredNeighborhoods(locations.neighborhoods);
    } else {
      // Solo hacemos una llamada liviana para obtener ciudades de esa región
      const fetchCitiesForRegion = async () => {
        try {
          const { data } = await axios.get(`${API_BASE_URL}/api/analytics/locations`, {
            params: { region: filters.region },
          });
          setFilteredCities(data.cities);
          setFilteredNeighborhoods(data.neighborhoods);
        } catch { /* fallback */ }
      };
      fetchCitiesForRegion();
      // Reset dependientes
      setFilters((prev) => ({ ...prev, city: '', neighborhood: '' }));
    }
  }, [filters.region]);

  useEffect(() => {
    if (!filters.city) {
      setFilteredNeighborhoods(locations.neighborhoods);
    } else {
      const fetchNeighborhoodsForCity = async () => {
        try {
          const { data } = await axios.get(`${API_BASE_URL}/api/analytics/locations`, {
            params: { region: filters.region || undefined, city: filters.city },
          });
          setFilteredNeighborhoods(data.neighborhoods);
        } catch { /* fallback */ }
      };
      fetchNeighborhoodsForCity();
      setFilters((prev) => ({ ...prev, neighborhood: '' }));
    }
  }, [filters.city]);

  // ── Cargar datos del dashboard (se re-ejecuta cuando cambian filtros) ──
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params: Record<string, string> = {};
    if (filters.region)       params.region = filters.region;
    if (filters.city)         params.city = filters.city;
    if (filters.neighborhood) params.neighborhood = filters.neighborhood;
    if (filters.propertyType) params.propertyType = filters.propertyType;

    try {
      const results = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/api/bots`),
        axios.get(`${API_BASE_URL}/api/analytics/market`, { params }),
        axios.get(`${API_BASE_URL}/api/analytics/trends`, { params }),
      ]);

      const [botsResult, marketResult, trendsResult] = results;

      setBots(botsResult.status === 'fulfilled' ? toArray(botsResult.value.data) : []);

      if (marketResult.status === 'fulfilled') {
        setMarketData(marketResult.value.data || null);
      } else {
        setMarketData(null);
      }

      if (trendsResult.status === 'fulfilled') {
        const d = trendsResult.value.data;
        setTrendsData(toArray(d?.items || d?.data || d?.trends || d));
      } else {
        setTrendsData([]);
      }

      if (results.some((r) => r.status === 'rejected')) {
        setError('Algunos datos no se pudieron cargar.');
      }
    } catch (err) {
      setError('No se pudo cargar la data del dashboard.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 60000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  // ── Helpers de filtros ─────────────────────────────────────────

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const clearFilters = () => setFilters({ region: '', city: '', neighborhood: '', propertyType: '' });

  // ── Datos computados ───────────────────────────────────────────

  const propertyTypeStats = useMemo(() => {
    if (!marketData?.byType) return [];
    return marketData.byType.map((t) => ({
      ...t,
      type: normalizePropertyType(t.type),
      color: PROPERTY_TYPE_COLORS[normalizePropertyType(t.type)] || '#adb5bd',
    })).sort((a, b) => b.count - a.count);
  }, [marketData]);

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
    // auto: usar la que tenga más datos
    return uf.length >= clp.length
      ? { currency: 'UF', data: uf }
      : { currency: 'CLP', data: clp };
  }, [marketData, priceFilter]);

  const topNeighborhoods = useMemo(() =>
    toArray(marketData?.topNeighborhoods).slice(0, 10),
    [marketData]
  );

  const propertySourceData = useMemo(() =>
    toArray(marketData?.sources).filter((s) => s.value > 0),
    [marketData]
  );

  const botStatusData = useMemo(() => [
    { name: 'Activos', value: bots.filter((b) => b.isActive).length },
    { name: 'Inactivos', value: bots.filter((b) => !b.isActive).length },
  ], [bots]);

  const executionData = useMemo(() =>
    trendsData.map((item: any) => ({
      mes: item.mes || item.month || item.label || '?',
      exitosas: item.exitosas ?? item.success ?? 0,
      fallidas: item.fallidas ?? item.failed ?? 0,
    })),
    [trendsData]
  );

  const radarData = useMemo(() => {
    const mainTypes = propertyTypeStats.filter((t) =>
      ['Departamento', 'Casa', 'Prefabricada'].includes(t.type)
    );
    if (mainTypes.length === 0) return [];

    const maxBedrooms = Math.max(...mainTypes.map((t) => t.avgBedrooms ?? 0), 1);
    const maxBathrooms = Math.max(...mainTypes.map((t) => t.avgBathrooms ?? 0), 1);
    const maxArea = Math.max(...mainTypes.map((t) => t.avgArea ?? 0), 1);
    const maxPrice = Math.max(...mainTypes.map((t) => t.avgPrice ?? 0), 1);
    const maxCount = Math.max(...mainTypes.map((t) => t.count), 1);

    return [
      { metric: 'Dormitorios', key: 'avgBedrooms', max: maxBedrooms, unit: '' },
      { metric: 'Baños', key: 'avgBathrooms', max: maxBathrooms, unit: '' },
      { metric: 'Superficie', key: 'avgArea', max: maxArea, unit: ' m²' },
      { metric: 'Precio', key: 'avgPrice', max: maxPrice, unit: '' },
      { metric: 'Cantidad', key: 'count', max: maxCount, unit: '' },
    ].map((m) => {
      const row: any = { metric: m.metric, unit: m.unit };
      mainTypes.forEach((t) => {
        const val = (t as any)[m.key] ?? 0;
        row[t.type] = Math.round((val / m.max) * 100);
        row[`${t.type}_real`] = m.key === 'avgPrice' ? formatCLP(val) : val;
      });
      return row;
    });
  }, [propertyTypeStats]);

  const radarTypes = useMemo(() =>
    propertyTypeStats.filter((t) => ['Departamento', 'Casa', 'Prefabricada'].includes(t.type)),
    [propertyTypeStats]
  );

  const totalProperties = marketData?.totalProperties ?? 0;

  // ── Sub-componentes ────────────────────────────────────────────

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
      <Typography variant="h6" sx={{ fontWeight: 700, color: COLORS.darkText, letterSpacing: '-0.3px' }}>
        {title}
      </Typography>
    </Box>
  );

  const ChartPaper = ({ children, sx: sx2 }: { children: React.ReactNode; sx?: any }) => (
    <Paper elevation={0} sx={{
      p: 3, borderRadius: 3, border: '1px solid #e9ecef',
      background: COLORS.cardBg, ...sx2,
    }}>
      {children}
    </Paper>
  );

  const EmptyState = ({ message }: { message: string }) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6, color: COLORS.mutedText }}>
      <Typography variant="body1" sx={{ fontWeight: 500, mb: 0.5 }}>Sin datos</Typography>
      <Typography variant="body2" sx={{ opacity: 0.7 }}>{message}</Typography>
    </Box>
  );

  // ── Render ──────────────────────────────────────────────────────

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, backgroundColor: COLORS.bg, minHeight: '100vh' }}>

      {/* ─── Header ─── */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: COLORS.darkText, letterSpacing: '-1px' }}>
            Dashboard Inmobiliario
          </Typography>
          <Typography variant="body2" sx={{ color: COLORS.mutedText, mt: 0.5 }}>
            {loading ? 'Cargando...' : `${totalProperties.toLocaleString('es-CL')} propiedades`}
            {activeFilterCount > 0 && ` · ${activeFilterCount} filtro${activeFilterCount > 1 ? 's' : ''} activo${activeFilterCount > 1 ? 's' : ''}`}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
          onClick={fetchDashboardData}
          disabled={loading}
          sx={{ bgcolor: COLORS.primary, textTransform: 'none', borderRadius: 2, px: 3, '&:hover': { bgcolor: '#0a3d68' } }}
        >
          Actualizar
        </Button>
      </Box>

      {error && <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

      {/* ─── Panel de Filtros ─── */}
      <ChartPaper sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <FilterListIcon sx={{ color: COLORS.primary }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: COLORS.darkText, flex: 1 }}>
            Filtros de Ubicación
          </Typography>
          {activeFilterCount > 0 && (
            <Button
              size="small"
              startIcon={<ClearIcon />}
              onClick={clearFilters}
              sx={{ textTransform: 'none', color: COLORS.mutedText }}
            >
              Limpiar filtros
            </Button>
          )}
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2 }}>
          {/* Región */}
          <FormControl size="small" fullWidth>
            <InputLabel>Región</InputLabel>
            <Select
              value={filters.region}
              label="Región"
              onChange={(e) => setFilters((prev) => ({ ...prev, region: e.target.value }))}
              disabled={filtersLoading}
              startAdornment={<MapIcon sx={{ color: COLORS.mutedText, mr: 0.5, fontSize: 18 }} />}
            >
              <MenuItem value=""><em>Todas las regiones</em></MenuItem>
              {locations.regions.map((r) => (
                <MenuItem key={r} value={r}>{r}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Ciudad */}
          <FormControl size="small" fullWidth>
            <InputLabel>Ciudad</InputLabel>
            <Select
              value={filters.city}
              label="Ciudad"
              onChange={(e) => setFilters((prev) => ({ ...prev, city: e.target.value }))}
              disabled={filtersLoading || filteredCities.length === 0}
            >
              <MenuItem value=""><em>Todas las ciudades</em></MenuItem>
              {filteredCities.map((c) => (
                <MenuItem key={c} value={c}>{c}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Comuna / Barrio */}
          <FormControl size="small" fullWidth>
            <InputLabel>Comuna / Barrio</InputLabel>
            <Select
              value={filters.neighborhood}
              label="Comuna / Barrio"
              onChange={(e) => setFilters((prev) => ({ ...prev, neighborhood: e.target.value }))}
              disabled={filtersLoading || filteredNeighborhoods.length === 0}
            >
              <MenuItem value=""><em>Todas las comunas</em></MenuItem>
              {filteredNeighborhoods.map((n) => (
                <MenuItem key={n} value={n}>{n}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Tipo de propiedad */}
          <FormControl size="small" fullWidth>
            <InputLabel>Tipo de Propiedad</InputLabel>
            <Select
              value={filters.propertyType}
              label="Tipo de Propiedad"
              onChange={(e) => setFilters((prev) => ({ ...prev, propertyType: e.target.value }))}
              disabled={filtersLoading}
            >
              <MenuItem value=""><em>Todos los tipos</em></MenuItem>
              {locations.propertyTypes.map((t) => (
                <MenuItem key={t} value={t}>{normalizePropertyType(t)}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Tags de filtros activos */}
        {activeFilterCount > 0 && (
          <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
            {filters.region && (
              <Chip size="small" label={`Región: ${filters.region}`} onDelete={() => setFilters((p) => ({ ...p, region: '' }))} color="primary" variant="outlined" />
            )}
            {filters.city && (
              <Chip size="small" label={`Ciudad: ${filters.city}`} onDelete={() => setFilters((p) => ({ ...p, city: '' }))} color="primary" variant="outlined" />
            )}
            {filters.neighborhood && (
              <Chip size="small" label={`Comuna: ${filters.neighborhood}`} onDelete={() => setFilters((p) => ({ ...p, neighborhood: '' }))} color="primary" variant="outlined" />
            )}
            {filters.propertyType && (
              <Chip size="small" label={`Tipo: ${normalizePropertyType(filters.propertyType)}`} onDelete={() => setFilters((p) => ({ ...p, propertyType: '' }))} color="primary" variant="outlined" />
            )}
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

      {/* ─── Fila 1: Distribución por tipo + Radar ─── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3, mb: 3 }}>
        <ChartPaper>
          <SectionHeader title="Distribución por Tipo" icon={<ApartmentIcon />} />
          {loading ? <Skeleton variant="rectangular" height={280} /> : propertyTypeStats.length === 0 ? (
            <EmptyState message="No hay propiedades para los filtros seleccionados" />
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <ResponsiveContainer width="55%" height={280}>
                <PieChart>
                  <Pie data={propertyTypeStats} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={100} innerRadius={50} paddingAngle={2}
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
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem', color: COLORS.darkText }}>{t.type}</Typography>
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
          {loading ? <Skeleton variant="rectangular" height={280} /> : radarData.length === 0 ? (
            <EmptyState message="Se necesitan datos de departamentos, casas o prefabricadas" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                <PolarGrid stroke="#e9ecef" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12, fill: COLORS.mutedText }} />
                <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                {radarTypes.map((t) => (
                  <Radar key={t.type} name={t.type} dataKey={t.type} stroke={t.color} fill={t.color} fillOpacity={0.15} strokeWidth={2} />
                ))}
                <Legend />
                <Tooltip content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const dp = payload[0]?.payload;
                  return (
                    <Paper elevation={3} sx={{ p: 1.5, bgcolor: 'white', border: '1px solid #e9ecef' }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>{label}</Typography>
                      {payload.map((e: any) => (
                        <Box key={e.name} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: e.color }} />
                          <Typography variant="caption" sx={{ color: COLORS.mutedText }}>{e.name}:</Typography>
                          <Typography variant="caption" sx={{ fontWeight: 600 }}>
                            {dp?.[`${e.name}_real`] !== undefined ? `${dp[`${e.name}_real`]}${dp.unit || ''}` : '—'}
                          </Typography>
                        </Box>
                      ))}
                    </Paper>
                  );
                }} />
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
              '& th': { p: 1.5, textAlign: 'left', borderBottom: '2px solid #e9ecef', fontSize: '0.8rem', color: COLORS.mutedText, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' },
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
                    <td style={{ textAlign: 'center' }}><Typography variant="body2">{t.avgBedrooms ? t.avgBedrooms.toFixed(1) : '—'}</Typography></td>
                    <td style={{ textAlign: 'center' }}><Typography variant="body2">{t.avgBathrooms ? t.avgBathrooms.toFixed(1) : '—'}</Typography></td>
                    <td style={{ textAlign: 'center' }}><Typography variant="body2">{t.avgArea ? `${Math.round(t.avgArea)} m²` : '—'}</Typography></td>
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

      {/* ─── Fila 3: Distribución precios + Baños/Dormitorios ─── */}
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
                <Tooltip formatter={(v: number) => [`${v} propiedades`]} labelFormatter={(l) => `Rango: ${l} ${priceDistribution.currency}`} />
                <Bar dataKey="cantidad" fill={COLORS.primary} radius={[4, 4, 0, 0]} name="Propiedades" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartPaper>

        <ChartPaper>
          <SectionHeader title="Baños y Dormitorios Promedio por Tipo" icon={<BathtubIcon />} />
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

      {/* ─── Fila 4: Top comunas + Ejecuciones ─── */}
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
                <Tooltip formatter={(v: number, n: string) => [n === 'count' ? `${v} propiedades` : formatCLP(v), n]} />
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

      {/* ─── Fila 5: Fuentes + Estado bots ─── */}
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