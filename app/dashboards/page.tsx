'use client';

import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  Box, Paper, Typography, Card, CardContent, CircularProgress,
  Alert, Button, Chip, Divider, Tooltip as MuiTooltip,
  ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  AreaChart, Area, ComposedChart,
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

const API_BASE_URL = 'http://localhost:5000';

type BotStatus = 'idle' | 'running' | 'completed' | 'error' | 'failed' | 'success' | string;

interface Bot {
  id: number;
  name?: string;
  source?: string;
  isActive?: boolean;
  status?: BotStatus;
  totalScraped?: number;
  createdAt?: string;
  updatedAt?: string;
  lastRunAt?: string;
}

interface Property {
  id: number;
  title?: string;
  price?: number;
  currency?: string;
  propertyType?: string;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  city?: string;
  neighborhood?: string;
  region?: string;
  sourceUrl?: string;
}

interface ExecutionBucket {
  key: string;
  mes: string;
  exitosas: number;
  fallidas: number;
}

interface SourceBucket {
  name: string;
  value: number;
  count: number;
}

type UnknownRecord = Record<string, any>;

const toArray = (value: any) => (Array.isArray(value) ? value : []);

const toNumber = (value: any) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const pickNumber = (obj: UnknownRecord, keys: string[]) => {
  for (const key of keys) {
    const value = toNumber(obj[key]);
    if (value !== undefined) return value;
  }
  return undefined;
};

const pickLabel = (obj: UnknownRecord, keys: string[]) => {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
};

// ═══════════════════════════════════════════════════════
// Helpers de formateo
// ═══════════════════════════════════════════════════════

const formatCLP = (value: number) => {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString('es-CL')}`;
};

const formatUF = (value: number) => `UF ${value.toLocaleString('es-CL', { maximumFractionDigits: 0 })}`;

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

// ═══════════════════════════════════════════════════════
// Paleta de colores
// ═══════════════════════════════════════════════════════

const COLORS = {
  primary: '#0f4c81',
  secondary: '#e8927c',
  accent: '#2ec4b6',
  warning: '#f4a261',
  error: '#e76f51',
  success: '#2a9d8f',
  neutral: '#264653',
  light: '#e9ecef',
  bg: '#f8f9fa',
  cardBg: '#ffffff',
  darkText: '#1a1a2e',
  mutedText: '#6c757d',
};

const PROPERTY_TYPE_COLORS: Record<string, string> = {
  'Departamento': '#0f4c81',
  'Casa': '#2a9d8f',
  'Prefabricada': '#e8927c',
  'Terreno': '#f4a261',
  'Oficina': '#264653',
  'Local Comercial': '#e76f51',
  'Bodega': '#8ecae6',
  'Otro': '#adb5bd',
};

const PIE_COLORS = ['#0f4c81', '#2a9d8f', '#e8927c', '#f4a261', '#264653', '#e76f51', '#8ecae6', '#adb5bd'];

// ═══════════════════════════════════════════════════════
// Componente principal
// ═══════════════════════════════════════════════════════

export default function Dashboard() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [marketData, setMarketData] = useState<UnknownRecord | null>(null);
  const [trendsData, setTrendsData] = useState<any[]>([]);
  const [compareData, setCompareData] = useState<UnknownRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [priceFilter, setPriceFilter] = useState<'all' | 'CLP' | 'UF'>('all');

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/api/bots`),
        axios.get(`${API_BASE_URL}/api/analytics/market`),
        axios.get(`${API_BASE_URL}/api/analytics/trends`),
        axios.get(`${API_BASE_URL}/api/analytics/compare`),
        axios.get(`${API_BASE_URL}/api/properties`),
      ]);

      const [botsResult, marketResult, trendsResult, compareResult, propertiesResult] = results;

      setBots(botsResult.status === 'fulfilled' ? toArray(botsResult.value.data) : []);
      setMarketData(marketResult.status === 'fulfilled' ? (marketResult.value.data || null) : null);

      if (trendsResult.status === 'fulfilled') {
        const data = trendsResult.value.data;
        setTrendsData(toArray(data?.items || data?.data || data?.trends || data));
      } else {
        setTrendsData([]);
      }

      setCompareData(compareResult.status === 'fulfilled' ? (compareResult.value.data || null) : null);

      if (propertiesResult.status === 'fulfilled') {
        const propData = propertiesResult.value.data;
        setProperties(toArray(propData?.items || propData?.data || propData?.properties || propData));
      } else {
        setProperties([]);
      }

      if (results.some((r) => r.status === 'rejected')) {
        setError('Algunos datos del dashboard no se pudieron cargar.');
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('No se pudo cargar la data del dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 60000);
    return () => clearInterval(interval);
  }, []);

  // ═══════════════════════════════════════════════════
  // Métricas computadas
  // ═══════════════════════════════════════════════════

  const totalProperties = useMemo(() => {
    if (properties.length > 0) return properties.length;
    const marketTotal = marketData
      ? pickNumber(marketData, ['totalProperties', 'total', 'properties', 'count'])
      : undefined;
    if (marketTotal !== undefined) return marketTotal;
    return bots.reduce((sum, bot) => sum + (bot.totalScraped || 0), 0);
  }, [bots, marketData, properties]);

  // Agrupar por tipo de propiedad
  const propertyTypeStats = useMemo(() => {
    const groups: Record<string, { count: number; totalPrice: number; priceCount: number; totalBedrooms: number; bedroomCount: number; totalBathrooms: number; bathroomCount: number; totalArea: number; areaCount: number; prices: number[] }> = {};

    properties.forEach((p) => {
      const type = normalizePropertyType(p.propertyType);
      if (!groups[type]) {
        groups[type] = { count: 0, totalPrice: 0, priceCount: 0, totalBedrooms: 0, bedroomCount: 0, totalBathrooms: 0, bathroomCount: 0, totalArea: 0, areaCount: 0, prices: [] };
      }
      const g = groups[type];
      g.count++;
      if (p.price && p.price > 0) {
        g.totalPrice += p.price;
        g.priceCount++;
        g.prices.push(p.price);
      }
      if (p.bedrooms && p.bedrooms > 0) { g.totalBedrooms += p.bedrooms; g.bedroomCount++; }
      if (p.bathrooms && p.bathrooms > 0) { g.totalBathrooms += p.bathrooms; g.bathroomCount++; }
      if (p.area && p.area > 0) { g.totalArea += p.area; g.areaCount++; }
    });

    return Object.entries(groups)
      .map(([type, g]) => ({
        type,
        count: g.count,
        avgPrice: g.priceCount > 0 ? Math.round(g.totalPrice / g.priceCount) : 0,
        avgBedrooms: g.bedroomCount > 0 ? +(g.totalBedrooms / g.bedroomCount).toFixed(1) : 0,
        avgBathrooms: g.bathroomCount > 0 ? +(g.totalBathrooms / g.bathroomCount).toFixed(1) : 0,
        avgArea: g.areaCount > 0 ? Math.round(g.totalArea / g.areaCount) : 0,
        minPrice: g.prices.length > 0 ? Math.min(...g.prices) : 0,
        maxPrice: g.prices.length > 0 ? Math.max(...g.prices) : 0,
        color: PROPERTY_TYPE_COLORS[type] || '#adb5bd',
      }))
      .sort((a, b) => b.count - a.count);
  }, [properties]);

  // Promedios globales
  const globalAverages = useMemo(() => {
    const withBathrooms = properties.filter((p) => p.bathrooms && p.bathrooms > 0);
    const withBedrooms = properties.filter((p) => p.bedrooms && p.bedrooms > 0);
    const withArea = properties.filter((p) => p.area && p.area > 0);
    const withPrice = properties.filter((p) => p.price && p.price > 0);

    return {
      avgBathrooms: withBathrooms.length > 0
        ? +(withBathrooms.reduce((s, p) => s + (p.bathrooms || 0), 0) / withBathrooms.length).toFixed(1)
        : 0,
      avgBedrooms: withBedrooms.length > 0
        ? +(withBedrooms.reduce((s, p) => s + (p.bedrooms || 0), 0) / withBedrooms.length).toFixed(1)
        : 0,
      avgArea: withArea.length > 0
        ? Math.round(withArea.reduce((s, p) => s + (p.area || 0), 0) / withArea.length)
        : 0,
      avgPrice: withPrice.length > 0
        ? Math.round(withPrice.reduce((s, p) => s + (p.price || 0), 0) / withPrice.length)
        : 0,
    };
  }, [properties]);

  // Datos para radar chart comparativo
  // Guarda valores normalizados (para la forma del radar) Y valores reales (para el tooltip)
  const radarData = useMemo(() => {
    const mainTypes = propertyTypeStats.filter((t) =>
      ['Departamento', 'Casa', 'Prefabricada'].includes(t.type)
    );
    if (mainTypes.length === 0) return [];

    const maxBedrooms = Math.max(...mainTypes.map((t) => t.avgBedrooms), 1);
    const maxBathrooms = Math.max(...mainTypes.map((t) => t.avgBathrooms), 1);
    const maxArea = Math.max(...mainTypes.map((t) => t.avgArea), 1);
    const maxPrice = Math.max(...mainTypes.map((t) => t.avgPrice), 1);
    const maxCount = Math.max(...mainTypes.map((t) => t.count), 1);

    const metrics = [
      { metric: 'Dormitorios', key: 'avgBedrooms', max: maxBedrooms, unit: '' },
      { metric: 'Baños', key: 'avgBathrooms', max: maxBathrooms, unit: '' },
      { metric: 'Superficie', key: 'avgArea', max: maxArea, unit: ' m²' },
      { metric: 'Precio', key: 'avgPrice', max: maxPrice, unit: '' },
      { metric: 'Cantidad', key: 'count', max: maxCount, unit: '' },
    ];

    return metrics.map((m) => {
      const row: any = { metric: m.metric, unit: m.unit };
      mainTypes.forEach((t) => {
        // Valor normalizado 0-100 para el eje visual
        row[t.type] = Math.round(((t as any)[m.key] / m.max) * 100);
        // Valor REAL para mostrar en tooltip
        row[`${t.type}_real`] = m.key === 'avgPrice'
          ? formatCLP((t as any)[m.key])
          : (t as any)[m.key];
      });
      return row;
    });
  }, [propertyTypeStats]);

  // Tipos presentes en el radar (para iterar)
  const radarTypes = useMemo(() => {
    return propertyTypeStats.filter((t) =>
      ['Departamento', 'Casa', 'Prefabricada'].includes(t.type)
    );
  }, [propertyTypeStats]);

  // Distribución de precios por rangos
  const priceDistribution = useMemo(() => {
    const ufProps = properties.filter((p) => p.price && p.price > 0 && p.currency === 'UF');
    const clpProps = properties.filter((p) => p.price && p.price > 0 && p.currency === 'CLP');

    if (priceFilter === 'UF' || (priceFilter === 'all' && ufProps.length >= clpProps.length)) {
      const ranges = [
        { label: '< 1.000', min: 0, max: 1000 },
        { label: '1K - 2K', min: 1000, max: 2000 },
        { label: '2K - 3K', min: 2000, max: 3000 },
        { label: '3K - 5K', min: 3000, max: 5000 },
        { label: '5K - 8K', min: 5000, max: 8000 },
        { label: '8K - 15K', min: 8000, max: 15000 },
        { label: '> 15K', min: 15000, max: Infinity },
      ];
      const source = priceFilter === 'all' ? ufProps : ufProps;
      return { currency: 'UF', data: ranges.map((r) => ({
        rango: r.label,
        cantidad: source.filter((p) => (p.price || 0) >= r.min && (p.price || 0) < r.max).length,
      })).filter((d) => d.cantidad > 0) };
    } else {
      const ranges = [
        { label: '< 50M', min: 0, max: 50_000_000 },
        { label: '50M - 80M', min: 50_000_000, max: 80_000_000 },
        { label: '80M - 120M', min: 80_000_000, max: 120_000_000 },
        { label: '120M - 180M', min: 120_000_000, max: 180_000_000 },
        { label: '180M - 300M', min: 180_000_000, max: 300_000_000 },
        { label: '> 300M', min: 300_000_000, max: Infinity },
      ];
      return { currency: 'CLP', data: ranges.map((r) => ({
        rango: r.label,
        cantidad: clpProps.filter((p) => (p.price || 0) >= r.min && (p.price || 0) < r.max).length,
      })).filter((d) => d.cantidad > 0) };
    }
  }, [properties, priceFilter]);

  // Top comunas
  const topNeighborhoods = useMemo(() => {
    const counts: Record<string, { count: number; totalPrice: number; priceCount: number }> = {};
    properties.forEach((p) => {
      const name = p.neighborhood || p.city || 'Sin dato';
      if (!counts[name]) counts[name] = { count: 0, totalPrice: 0, priceCount: 0 };
      counts[name].count++;
      if (p.price && p.price > 0) {
        counts[name].totalPrice += p.price;
        counts[name].priceCount++;
      }
    });
    return Object.entries(counts)
      .map(([name, data]) => ({
        name,
        cantidad: data.count,
        precioPromedio: data.priceCount > 0 ? Math.round(data.totalPrice / data.priceCount) : 0,
      }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 10);
  }, [properties]);

  // Bot status
  const botStatusData = useMemo(() => {
    const active = bots.filter((b) => b.isActive).length;
    return [
      { name: 'Activos', value: active },
      { name: 'Inactivos', value: bots.length - active },
    ];
  }, [bots]);

  // Ejecuciones mensuales
  const executionData = useMemo(() => {
    const buckets = new Map<string, ExecutionBucket>();
    if (trendsData.length === 0) return [];

    trendsData.forEach((item: any, index: number) => {
      const label = pickLabel(item, ['mes', 'month', 'label', 'period', 'date']);
      const dateCandidate = pickLabel(item, ['date', 'period']);
      const date = dateCandidate ? new Date(dateCandidate) : null;
      const isValidDate = date && !Number.isNaN(date.getTime());
      const key = isValidDate
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        : `idx-${String(index).padStart(3, '0')}`;
      const mes = label || (isValidDate ? date!.toLocaleString('es-CL', { month: 'short' }) : `#${index + 1}`);

      const bucket = buckets.get(key) || { key, mes, exitosas: 0, fallidas: 0 };
      const exitosas = pickNumber(item, ['exitosas', 'success', 'successful', 'ok', 'completed', 'successes']);
      const fallidas = pickNumber(item, ['fallidas', 'failed', 'errors', 'error', 'failures']);
      const total = pickNumber(item, ['total', 'count']);

      let computedExitosas = exitosas;
      let computedFallidas = fallidas;
      if (computedExitosas === undefined && total !== undefined) computedExitosas = Math.max(0, total - (computedFallidas || 0));
      if (computedFallidas === undefined && total !== undefined && computedExitosas !== undefined) computedFallidas = Math.max(0, total - computedExitosas);

      bucket.exitosas += computedExitosas || 0;
      bucket.fallidas += computedFallidas || 0;
      buckets.set(key, bucket);
    });

    return Array.from(buckets.values())
      .sort((a, b) => a.key.localeCompare(b.key))
      .map(({ key, ...rest }) => rest);
  }, [trendsData]);

  // Fuentes
  const propertySourceData = useMemo(() => {
    const sources = new Map<string, SourceBucket>();
    const sourceItems = toArray(
      marketData?.sources || marketData?.bySource || marketData?.propertiesBySource ||
      compareData?.sources || compareData?.bySource || compareData?.propertiesBySource
    );

    if (sourceItems.length > 0) {
      sourceItems.forEach((item: any) => {
        const name = pickLabel(item, ['name', 'source', 'portal', 'label']) || 'N/A';
        const entry = sources.get(name) || { name, value: 0, count: 0 };
        entry.value += pickNumber(item, ['value', 'total', 'count', 'properties']) || 0;
        entry.count += 1;
        sources.set(name, entry);
      });
    } else {
      bots.forEach((bot) => {
        const name = bot.source || 'N/A';
        const entry = sources.get(name) || { name, value: 0, count: 0 };
        entry.value += bot.totalScraped || 0;
        entry.count += 1;
        sources.set(name, entry);
      });
    }

    const values = Array.from(sources.values());
    const hasTotals = values.some((e) => e.value > 0);
    return values.map((e) => ({ name: e.name, value: hasTotals ? e.value : e.count }));
  }, [bots, marketData, compareData]);

  // ═══════════════════════════════════════════════════
  // Componentes internos
  // ═══════════════════════════════════════════════════

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
        <Typography variant="h4" sx={{ fontWeight: 700, color: COLORS.darkText, letterSpacing: '-0.5px' }}>
          {value}
        </Typography>
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

  const ChartPaper = ({ children, ...props }: any) => (
    <Paper elevation={0} sx={{
      p: 3, borderRadius: 3, border: '1px solid #e9ecef',
      background: COLORS.cardBg, ...props.sx,
    }}>
      {children}
    </Paper>
  );

  const noData = properties.length === 0;

  // ═══════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, backgroundColor: COLORS.bg, minHeight: '100vh' }}>

      {/* ─── Header ─── */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: COLORS.darkText, letterSpacing: '-1px' }}>
            Dashboard Inmobiliario
          </Typography>
          <Typography variant="body2" sx={{ color: COLORS.mutedText, mt: 0.5 }}>
            Análisis de mercado y monitoreo de bots · {properties.length > 0 ? `${properties.length} propiedades` : 'Sin datos de propiedades'}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
          onClick={fetchDashboardData}
          disabled={loading}
          sx={{
            bgcolor: COLORS.primary, textTransform: 'none', borderRadius: 2, px: 3,
            '&:hover': { bgcolor: '#0a3d68' },
          }}
        >
          Actualizar
        </Button>
      </Box>

      {error && <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

      {/* ─── KPI Cards ─── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' }, gap: 2, mb: 4 }}>
        <StatCard
          title="Total Propiedades"
          value={totalProperties.toLocaleString('es-CL')}
          icon={<HomeIcon />}
          color={COLORS.primary}
        />
        <StatCard
          title="Bots Activos"
          value={`${botStatusData[0]?.value || 0} / ${bots.length}`}
          icon={<TrendingUpIcon />}
          color={COLORS.success}
        />
        <StatCard
          title="Prom. Dormitorios"
          value={globalAverages.avgBedrooms || '—'}
          icon={<BedIcon />}
          color="#7c3aed"
          subtitle="Por propiedad"
        />
        <StatCard
          title="Prom. Baños"
          value={globalAverages.avgBathrooms || '—'}
          icon={<BathtubIcon />}
          color={COLORS.secondary}
          subtitle="Por propiedad"
        />
        <StatCard
          title="Prom. Superficie"
          value={globalAverages.avgArea > 0 ? `${globalAverages.avgArea} m²` : '—'}
          icon={<SquareFootIcon />}
          color={COLORS.accent}
          subtitle="Metros cuadrados"
        />
        <StatCard
          title="Tipos Detectados"
          value={propertyTypeStats.length}
          icon={<ApartmentIcon />}
          color={COLORS.warning}
          subtitle={propertyTypeStats.slice(0, 3).map((t) => t.type).join(', ')}
        />
      </Box>

      {/* ─── Fila 1: Tipo de Propiedad (Pie) + Comparativa (Radar) ─── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3, mb: 3 }}>

        {/* Distribución por tipo */}
        <ChartPaper>
          <SectionHeader title="Distribución por Tipo" icon={<ApartmentIcon />} />
          {noData ? (
            <EmptyState message="Ejecuta bots para ver distribución por tipo" />
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <ResponsiveContainer width="55%" height={280}>
                <PieChart>
                  <Pie
                    data={propertyTypeStats}
                    dataKey="count"
                    nameKey="type"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={50}
                    paddingAngle={2}
                    label={({ type, percent }) => `${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {propertyTypeStats.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number, name: string) => [`${value} propiedades`, name]} />
                </PieChart>
              </ResponsiveContainer>
              <Box sx={{ flex: 1 }}>
                {propertyTypeStats.map((t) => (
                  <Box key={t.type} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '3px', bgcolor: t.color, flexShrink: 0 }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem', color: COLORS.darkText }}>
                        {t.type}
                      </Typography>
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

        {/* Radar comparativo */}
        <ChartPaper>
          <SectionHeader title="Comparativa: Depto vs Casa vs Prefabricada" icon={<LocationCityIcon />} />
          {radarData.length === 0 ? (
            <EmptyState message="Se necesitan datos de departamentos, casas o prefabricadas para comparar" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                <PolarGrid stroke="#e9ecef" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12, fill: COLORS.mutedText }} />
                <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                {radarTypes.map((t) => (
                  <Radar
                    key={t.type}
                    name={t.type}
                    dataKey={t.type}
                    stroke={t.color}
                    fill={t.color}
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                ))}
                <Legend />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const dataPoint = payload[0]?.payload;
                    const unit = dataPoint?.unit || '';
                    return (
                      <Paper elevation={3} sx={{ p: 1.5, bgcolor: 'white', border: '1px solid #e9ecef' }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>{label}</Typography>
                        {payload.map((entry: any) => {
                          const realValue = dataPoint?.[`${entry.name}_real`];
                          return (
                            <Box key={entry.name} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: entry.color }} />
                              <Typography variant="caption" sx={{ color: COLORS.mutedText }}>
                                {entry.name}:
                              </Typography>
                              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                {realValue !== undefined ? `${realValue}${unit}` : '—'}
                              </Typography>
                            </Box>
                          );
                        })}
                      </Paper>
                    );
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </ChartPaper>
      </Box>

      {/* ─── Fila 2: Tabla comparativa por tipo ─── */}
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
                    <td style={{ textAlign: 'center' }}>
                      <Chip label={t.count} size="small" sx={{ fontWeight: 600 }} />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {t.avgBedrooms > 0 ? t.avgBedrooms : '—'}
                      </Typography>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {t.avgBathrooms > 0 ? t.avgBathrooms : '—'}
                      </Typography>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {t.avgArea > 0 ? `${t.avgArea} m²` : '—'}
                      </Typography>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: COLORS.primary }}>
                        {t.avgPrice > 0 ? formatCLP(t.avgPrice) : '—'}
                      </Typography>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Typography variant="caption" sx={{ color: COLORS.mutedText }}>
                        {t.minPrice > 0 ? `${formatCLP(t.minPrice)} – ${formatCLP(t.maxPrice)}` : '—'}
                      </Typography>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Box>
          </Box>
        </ChartPaper>
      )}

      {/* ─── Fila 3: Distribución de precios + Baños/Dormitorios por tipo ─── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3, mb: 3 }}>

        {/* Distribución de precios */}
        <ChartPaper>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <SectionHeader title="Distribución de Precios" icon={<AttachMoneyIcon />} />
            <ToggleButtonGroup
              value={priceFilter}
              exclusive
              onChange={(_, v) => v && setPriceFilter(v)}
              size="small"
            >
              <ToggleButton value="all" sx={{ textTransform: 'none', px: 2 }}>Auto</ToggleButton>
              <ToggleButton value="UF" sx={{ textTransform: 'none', px: 2 }}>UF</ToggleButton>
              <ToggleButton value="CLP" sx={{ textTransform: 'none', px: 2 }}>CLP</ToggleButton>
            </ToggleButtonGroup>
          </Box>
          {priceDistribution.data.length === 0 ? (
            <EmptyState message="Sin datos de precios" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={priceDistribution.data} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="rango" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number) => [`${value} propiedades`]}
                  labelFormatter={(label) => `Rango: ${label} ${priceDistribution.currency}`}
                />
                <Bar dataKey="cantidad" fill={COLORS.primary} radius={[4, 4, 0, 0]} name="Propiedades" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartPaper>

        {/* Baños y dormitorios por tipo */}
        <ChartPaper>
          <SectionHeader title="Baños y Dormitorios Promedio por Tipo" icon={<BathtubIcon />} />
          {propertyTypeStats.length === 0 ? (
            <EmptyState message="Sin datos de propiedades" />
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

        {/* Top comunas */}
        <ChartPaper>
          <SectionHeader title="Top Comunas / Ciudades" icon={<LocationCityIcon />} />
          {topNeighborhoods.length === 0 ? (
            <EmptyState message="Sin datos de ubicación" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topNeighborhoods} layout="vertical" barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                <Tooltip formatter={(value: number, name: string) => [
                  name === 'cantidad' ? `${value} propiedades` : formatCLP(value), name
                ]} />
                <Bar dataKey="cantidad" fill={COLORS.accent} name="Propiedades" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartPaper>

        {/* Ejecuciones mensuales */}
        <ChartPaper>
          <SectionHeader title="Ejecuciones Mensuales" icon={<TrendingUpIcon />} />
          {executionData.length === 0 ? (
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

      {/* ─── Fila 5: Fuentes + Estado de bots ─── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3 }}>

        {/* Por fuente */}
        <ChartPaper>
          <SectionHeader title="Propiedades por Fuente" />
          {propertySourceData.length === 0 ? (
            <EmptyState message="Sin datos de fuentes" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={propertySourceData} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill={COLORS.primary} name="Propiedades" radius={[4, 4, 0, 0]}>
                  {propertySourceData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartPaper>

        {/* Estado de bots */}
        <ChartPaper>
          <SectionHeader title="Estado de Bots" />
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={botStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={90}
                innerRadius={45}
                fill="#8884d8"
                dataKey="value"
                paddingAngle={3}
              >
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

// ═══════════════════════════════════════════════════════
// Empty state
// ═══════════════════════════════════════════════════════

function EmptyState({ message }: { message: string }) {
  return (
    <Box sx={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', py: 6, color: COLORS.mutedText,
    }}>
      <Typography variant="body1" sx={{ fontWeight: 500, mb: 0.5 }}>Sin datos</Typography>
      <Typography variant="body2" sx={{ opacity: 0.7 }}>{message}</Typography>
    </Box>
  );
}