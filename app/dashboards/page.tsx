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
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TableSortLabel, TablePagination, Checkbox,
  Dialog, DialogTitle, DialogContent, DialogActions,
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
import LocationOnIcon    from '@mui/icons-material/LocationOn';
import AttachMoneyIcon   from '@mui/icons-material/AttachMoney';
import TrendingUpIcon    from '@mui/icons-material/TrendingUp';
import TrendingDownIcon  from '@mui/icons-material/TrendingDown';
import LocationCityIcon  from '@mui/icons-material/LocationCity';
import FilterListIcon    from '@mui/icons-material/FilterList';
import ClearIcon         from '@mui/icons-material/Clear';
import MapIcon           from '@mui/icons-material/Map';
import ArrowBackIcon     from '@mui/icons-material/ArrowBack';
import DownloadIcon      from '@mui/icons-material/Download';
import PictureAsPdfIcon  from '@mui/icons-material/PictureAsPdf';
import LogoutIcon        from '@mui/icons-material/Logout';
import StarIcon          from '@mui/icons-material/Star';
import SmartToyIcon      from '@mui/icons-material/SmartToy';
import TokenIcon         from '@mui/icons-material/Token';
import TimelineIcon      from '@mui/icons-material/Timeline';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import ChangeCircleIcon  from '@mui/icons-material/ChangeCircle';
import NewReleasesIcon   from '@mui/icons-material/NewReleases';
import CompareIcon       from '@mui/icons-material/Compare';
import AnalyticsIcon     from '@mui/icons-material/Analytics';
import TableChartIcon    from '@mui/icons-material/TableChart';
import OpenInNewIcon     from '@mui/icons-material/OpenInNew';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon    from '@mui/icons-material/AccessTime';
import CheckCircleIcon   from '@mui/icons-material/CheckCircle';
import BarChartIcon      from '@mui/icons-material/BarChart';
import HistoryIcon       from '@mui/icons-material/History';
import CloseIcon         from '@mui/icons-material/Close';
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
    type: string; count: number; currency?: string;
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

type PriceHistoryPoint = { mes: string; avgPrice: number; count: number; minPrice?: number; maxPrice?: number };
type PriceHistoryGranularPoint = {
  year: number;
  month: number;
  day: number;
  hour: number | null;
  dayOfWeek: number;        // 0=Dom, 1=Lun … 6=Sáb
  avgPrice: number;
  minPrice?: number;
  maxPrice?: number;
  count: number;
};
type PriceTimeRange = 'day' | 'week' | 'month';

interface TrackingStats {
  totalTracked: number;
  newProperties: number;
  priceChanges: number;
  delisted: number;
  unchanged: number;
  priceHistory?:    PriceHistoryPoint[];
  priceHistoryCLP?: PriceHistoryPoint[];
  priceHistoryUF?:  PriceHistoryPoint[];
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

// ── Metrics Types ──────────────────────────────────────────────────────────────

interface GeneralMetrics {
  totalProperties: number;
  conditionDistribution: Array<{ condition: string; count: number }>;
  avgDaysOnMarket: number | null;
  publicationByMonth: Array<{ month: string; count: number }>;
  priceByCondition: Array<{
    condition: string; currency: string; count: number;
    avgPrice: number; minPrice: number; maxPrice: number;
  }>;
  priceByAge: Array<{ range: string; count: number; avgPrice: number }>;
  conditionByType: Array<{ propertyType: string; condition: string; count: number }>;
  propertiesWithPubDate: number;
  propertiesWithCondition: number;
  avgPricePerSqm: Array<{ currency: string; count: number; avg: number; min: number; max: number }>;
  pricePerSqmByType: Array<{ propertyType: string; currency: string; count: number; avg: number }>;
  pricePerSqmByCity: Array<{ city: string; currency: string; count: number; avg: number }>;
  pricePerSqmByCondition: Array<{ condition: string; currency: string; count: number; avg: number }>;
}

interface PropertyMetricItem {
  id: number;
  title: string;
  price: number | null;
  currency: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area: number | null;
  propertyType: string | null;
  city: string | null;
  region: string | null;
  neighborhood: string | null;
  condition: string | null;
  publicationDate: string | null;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  timesScraped: number;
  listingStatus: string | null;
  sourceUrl: string | null;
  daysOnMarket: number | null;
  daysOnMarketSource: 'publicationDate' | 'firstSeenAt' | null;
  pricePerSqm: number | null;
}

interface PropertyListResponse {
  items: PropertyMetricItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface CompareResponse {
  properties: PropertyMetricItem[];
}

interface TimelineSnapshot {
  id: number;
  scrapedAt: string;
  botId: number;
  price: number | null;
  currency: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area: number | null;
  propertyType: string | null;
  title: string | null;
  hasChanges: boolean;
  changedFields: string | null;
}

interface PropertyTimeline {
  property: {
    id: number; title: string; sourceUrl: string | null;
    price: number | null; previousPrice: number | null; currency: string | null;
    city: string | null; region: string | null; neighborhood: string | null;
    firstSeenAt: string | null; lastSeenAt: string | null;
    timesScraped: number; listingStatus: string | null; priceChangedAt: string | null;
  };
  totalSnapshots: number;
  snapshotsWithChanges: number;
  firstSeen: string | null;
  lastSeen: string | null;
  snapshots: TimelineSnapshot[];
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

const formatUF = (value: number | undefined | null) => {
  if (value == null || isNaN(value)) return '—';
  return `${value.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} UF`;
};

const formatPrice = (value: number | undefined | null, currency?: string | null) =>
  (currency ?? '').toUpperCase() === 'UF' ? formatUF(value) : formatCLP(value);

const formatDate = (d: string | null | undefined) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
};

const normalizePropertyType = (type?: string | null): string => {
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

// ── Chile Map Data ─────────────────────────────────────────────────────────────

const CHILE_REGIONS_SVG = [
  { id: 'arica',         name: 'Arica y Parinacota',  short: 'Arica y P.',   x: 50, y: 0,   w: 80,  h: 24 },
  { id: 'tarapaca',      name: 'Tarapacá',             short: 'Tarapacá',     x: 48, y: 24,  w: 84,  h: 34 },
  { id: 'antofagasta',   name: 'Antofagasta',          short: 'Antofagasta',  x: 44, y: 58,  w: 90,  h: 69 },
  { id: 'atacama',       name: 'Atacama',              short: 'Atacama',      x: 38, y: 127, w: 98,  h: 47 },
  { id: 'coquimbo',      name: 'Coquimbo',             short: 'Coquimbo',     x: 30, y: 174, w: 110, h: 38 },
  { id: 'valparaiso',    name: 'Valparaíso',           short: 'Valparaíso',   x: 20, y: 212, w: 125, h: 20 },
  { id: 'metropolitana', name: 'Metropolitana',        short: 'R.M.',         x: 18, y: 232, w: 130, h: 16 },
  { id: 'ohiggins',      name: "O'Higgins",            short: "O'Higgins",    x: 16, y: 248, w: 132, h: 19 },
  { id: 'maule',         name: 'Maule',                short: 'Maule',        x: 14, y: 267, w: 136, h: 22 },
  { id: 'nuble',         name: 'Ñuble',                short: 'Ñuble',        x: 12, y: 289, w: 138, h: 17 },
  { id: 'biobio',        name: 'Biobío',               short: 'Biobío',       x: 10, y: 306, w: 142, h: 22 },
  { id: 'araucania',     name: 'La Araucanía',         short: 'Araucanía',    x: 8,  y: 328, w: 144, h: 26 },
  { id: 'losrios',       name: 'Los Ríos',             short: 'Los Ríos',     x: 6,  y: 354, w: 148, h: 19 },
  { id: 'loslagos',      name: 'Los Lagos',            short: 'Los Lagos',    x: 4,  y: 373, w: 152, h: 36 },
  { id: 'aysen',         name: 'Aysén',                short: 'Aysén',        x: 2,  y: 409, w: 156, h: 58 },
  { id: 'magallanes',    name: 'Magallanes',           short: 'Magallanes',   x: 0,  y: 467, w: 160, h: 53 },
] as const;

function normalizeStr(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}

function findSvgRegionId(apiRegion: string): string | null {
  const an = normalizeStr(apiRegion);
  for (const r of CHILE_REGIONS_SVG) {
    const rn = normalizeStr(r.name);
    if (an.includes(rn) || rn.includes(an)) return r.id;
  }
  return null;
}

function findApiRegion(svgId: string, apiRegions: string[]): string | null {
  const svg = CHILE_REGIONS_SVG.find((r) => r.id === svgId);
  if (!svg) return null;
  const sn = normalizeStr(svg.name);
  let best: string | null = null, bestLen = 0;
  for (const ar of apiRegions) {
    const an = normalizeStr(ar);
    if (an.includes(sn) || sn.includes(an)) {
      const len = Math.min(an.length, sn.length);
      if (len > bestLen) { best = ar; bestLen = len; }
    }
  }
  return best;
}

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

function CreditBar({ credits, plan, role, sessionStart, onRecharge }: {
  credits: number; plan: string; role: string; sessionStart: number; onRecharge: () => void;
}) {
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

  const maxCredits  = sessionStart > 0 ? sessionStart : Math.max(credits, INITIAL_CREDITS);
  const used        = sessionStart > 0 ? Math.max(0, sessionStart - credits) : 0;
  const percentage  = Math.max(0, Math.min(100, (credits / maxCredits) * 100));
  const isLow       = credits <= 10;
  const isEmpty     = credits <= 0;
  const barColor    = isEmpty ? '#ef4444' : isLow ? '#f59e0b' : '#3b82f6';
  const bgColor     = isEmpty ? '#fef2f2' : isLow ? '#fffbeb' : '#eff6ff';
  const borderColor = isEmpty ? '#fecaca' : isLow ? '#fde68a' : '#bfdbfe';
  const textColor   = isEmpty ? '#991b1b' : isLow ? '#92400e' : '#1e40af';

  return (
    <Paper elevation={0} sx={{ px: 2.5, py: 1.5, mb: 3, borderRadius: 2, bgcolor: bgColor, border: `1px solid ${borderColor}` }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <TokenIcon sx={{ color: barColor, fontSize: 20 }} />
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700, color: textColor, lineHeight: 1.2 }}>
              {isEmpty ? 'Sin créditos disponibles' : `${credits} crédito${credits !== 1 ? 's' : ''} restante${credits !== 1 ? 's' : ''}`}
            </Typography>
            {used > 0 && (
              <Typography variant="caption" sx={{ color: COLORS.mutedText }}>
                Usados esta sesión: <strong style={{ color: textColor }}>{used}</strong>
              </Typography>
            )}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="caption" sx={{ color: COLORS.mutedText }}>{credits} / {maxCredits}</Typography>
          {(isEmpty || isLow) && (
            <Button size="small" variant="contained" onClick={onRecharge}
              sx={{ textTransform: 'none', fontSize: '0.75rem', fontWeight: 700, px: 2, py: 0.25,
                    bgcolor: isEmpty ? '#ef4444' : '#f59e0b',
                    '&:hover': { bgcolor: isEmpty ? '#dc2626' : '#d97706' }, borderRadius: 1.5 }}>
              {isEmpty ? 'Recargar créditos' : 'Recargar'}
            </Button>
          )}
        </Box>
      </Box>
      <LinearProgress variant="determinate" value={percentage}
        sx={{ height: 6, borderRadius: 3, bgcolor: `${barColor}20`,
              '& .MuiLinearProgress-bar': { borderRadius: 3, bgcolor: barColor } }} />
      <Typography variant="caption" sx={{ color: COLORS.mutedText, mt: 0.5, display: 'block' }}>
        Cada consulta consume 5 créditos. Comparar propiedades: 5 créditos por cada una.
        {!isEmpty && isLow && ' Considera recargar para seguir consultando.'}
      </Typography>
    </Paper>
  );
}

// ── Chile Map Panel ────────────────────────────────────────────────────────────

function ChileMapPanel({
  selectedRegion, availableRegions, onRegionClick,
}: {
  selectedRegion: string; availableRegions: string[]; onRegionClick: (region: string) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  const selectedId   = selectedRegion ? findSvgRegionId(selectedRegion) : null;
  const availableIds = useMemo(
    () => new Set(availableRegions.map((r) => findSvgRegionId(r)).filter(Boolean) as string[]),
    [availableRegions],
  );

  return (
    <Box sx={{ display: 'flex', gap: 2.5, alignItems: 'flex-start', pt: 0.5 }}>
      {/* SVG Map */}
      <Box sx={{ flexShrink: 0 }}>
        <svg viewBox="0 0 160 520" width={130} height={430} style={{ display: 'block' }}>
          {CHILE_REGIONS_SVG.map((region) => {
            const isSelected  = selectedId === region.id;
            const isAvailable = availableIds.has(region.id);
            const isHovered   = hovered === region.id && isAvailable;

            const fill   = isSelected  ? '#0f4c81'
                         : isHovered   ? '#93c5fd'
                         : isAvailable ? '#bfdbfe'
                         : '#e9ecef';
            const stroke = isSelected  ? '#0a3d68'
                         : isHovered   ? '#3b82f6'
                         : isAvailable ? '#93c5fd'
                         : '#d1d5db';

            return (
              <g key={region.id}
                style={{ cursor: isAvailable ? 'pointer' : 'default' }}
                onMouseEnter={() => isAvailable && setHovered(region.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => {
                  if (!isAvailable) return;
                  if (isSelected) { onRegionClick(''); return; }
                  const apiRegion = findApiRegion(region.id, availableRegions);
                  if (apiRegion) onRegionClick(apiRegion);
                }}
              >
                <rect
                  x={region.x} y={region.y} width={region.w} height={region.h}
                  fill={fill} stroke={stroke} strokeWidth={1} rx={2}
                  style={{ transition: 'fill 0.15s ease' }}
                />
                {region.h >= 15 && (
                  <text
                    x={region.x + region.w / 2} y={region.y + region.h / 2 + 3.5}
                    textAnchor="middle"
                    fontSize={Math.min(8.5, region.h - 5)}
                    fill={isSelected ? '#fff' : '#374151'}
                    fontFamily="Inter, system-ui, sans-serif"
                    fontWeight={isSelected ? 700 : 400}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {region.short}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </Box>

      {/* Leyenda + tooltip */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography variant="caption" sx={{ color: COLORS.mutedText, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Mapa de Chile
        </Typography>
        {hovered && isHoveredAvailable(hovered, availableIds) && (
          <Typography variant="body2" sx={{ fontWeight: 600, color: COLORS.primary }}>
            {CHILE_REGIONS_SVG.find((r) => r.id === hovered)?.name}
          </Typography>
        )}
        {selectedRegion && (
          <Box sx={{ bgcolor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 1.5, px: 1.5, py: 0.75 }}>
            <Typography variant="caption" sx={{ color: COLORS.mutedText, display: 'block' }}>Seleccionada</Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: COLORS.primary, fontSize: '0.8rem' }}>{selectedRegion}</Typography>
          </Box>
        )}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          {[
            { color: '#0f4c81', label: 'Seleccionada' },
            { color: '#bfdbfe', label: `Con datos (${availableIds.size})` },
            { color: '#e9ecef', label: 'Sin datos' },
          ].map((item) => (
            <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 11, height: 11, bgcolor: item.color, borderRadius: '2px', border: '1px solid #d1d5db', flexShrink: 0 }} />
              <Typography variant="caption" sx={{ color: COLORS.mutedText }}>{item.label}</Typography>
            </Box>
          ))}
        </Box>
        {selectedRegion && (
          <Button size="small" onClick={() => onRegionClick('')}
            sx={{ textTransform: 'none', fontSize: '0.75rem', color: COLORS.error, p: 0, minWidth: 0, alignSelf: 'flex-start', mt: 0.5 }}>
            × Limpiar región
          </Button>
        )}
      </Box>
    </Box>
  );
}

function isHoveredAvailable(id: string | null, set: Set<string>) {
  return id !== null && set.has(id);
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
  const [priceHistoryCurrency,  setPriceHistoryCurrency]  = useState<'auto' | 'CLP' | 'UF'>('auto');
  const [priceTimeRange,        setPriceTimeRange]        = useState<PriceTimeRange>('month');
  const [priceHistoryGranular,  setPriceHistoryGranular]  = useState<PriceHistoryGranularPoint[]>([]);
  const [priceHistoryLoading,   setPriceHistoryLoading]   = useState(false);
  const [noCredits,         setNoCredits]         = useState(false);
  const [reportDownloading, setReportDownloading] = useState(false);
  const [reportError,       setReportError]       = useState<string | null>(null);

  // ── Metrics State ──────────────────────────────────────────────
  const [metricsMode, setMetricsMode]       = useState<'general' | 'individual'>('general');
  const [generalMetrics, setGeneralMetrics] = useState<GeneralMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [propertyList, setPropertyList]     = useState<PropertyListResponse | null>(null);
  const [loadingPropertyList, setLoadingPropertyList] = useState(false);
  const [metricsSortBy, setMetricsSortBy]   = useState('price');
  const [metricsSortDir, setMetricsSortDir] = useState<'asc' | 'desc'>('asc');
  const [metricsPage, setMetricsPage]       = useState(0);
  const [metricsPageSize, setMetricsPageSize] = useState(25);
  const [metricsCondition, setMetricsCondition] = useState('');
  const [metricsCurrency, setMetricsCurrency]   = useState('');
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<Set<number>>(new Set());
  const [compareData, setCompareData]       = useState<CompareResponse | null>(null);
  const [loadingCompare, setLoadingCompare] = useState(false);
  const [compareTimelines, setCompareTimelines] = useState<Map<number, PropertyTimeline>>(new Map());
  const [loadingCompareTimelines, setLoadingCompareTimelines] = useState(false);
  const [timelineOpen,    setTimelineOpen]    = useState(false);
  const [timelineData,    setTimelineData]    = useState<PropertyTimeline | null>(null);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  const [locations, setLocations] = useState<Locations>({
    regions: [], cities: [], neighborhoods: [], propertyTypes: [],
  });
  const [staged,    setStaged]    = useState<Filters>(EMPTY_FILTERS);
  const [committed, setCommitted] = useState<Filters>(EMPTY_FILTERS);
  const [filteredCities,        setFilteredCities]        = useState<string[]>([]);
  const [filteredNeighborhoods, setFilteredNeighborhoods] = useState<string[]>([]);
  const [showChileMap,          setShowChileMap]          = useState(false);
  const sessionStartRef = useRef<number | null>(null);
  const [sessionStart,  setSessionStart]  = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setCommitted(staged), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [staged]);

  // Captura de créditos iniciales (solo la primera vez que user tiene datos)
  useEffect(() => {
    if (user && sessionStartRef.current === null) {
      sessionStartRef.current = user.credits;
      setSessionStart(user.credits);
    }
  }, [user]);

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
        const rawItems = toArray(d?.items || d?.data || d);
        setPriceChanges(rawItems.map((item: any) => ({
          id:           item.id,
          title:        item.title,
          neighborhood: item.neighborhood,
          city:         item.city,
          propertyType: item.propertyType,
          currency:     item.currency,
          changedAt:    item.priceChangedAt ?? item.changedAt,
          url:          item.sourceUrl ?? item.url,
          oldPrice:     item.previousPrice ?? item.oldPrice ?? 0,
          newPrice:     item.currentPrice  ?? item.newPrice  ?? 0,
          priceDiff:    item.priceChange   ?? item.priceDiff ?? 0,
          priceDiffPct: item.changePercent ?? item.priceDiffPct ?? 0,
        })));
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

  // ── Historial granular de precios (Día / Semana / Mes) ──────────
  const fetchPriceHistory = useCallback(async () => {
    setPriceHistoryLoading(true);
    try {
      const params = new URLSearchParams({ range: priceTimeRange });
      if (priceHistoryCurrency !== 'auto') params.set('currency', priceHistoryCurrency);
      // Pasar los mismos filtros geográficos/tipo que el resto del dashboard
      if (committed.region)       params.set('region',       committed.region);
      if (committed.city)         params.set('city',         committed.city);
      if (committed.neighborhood) params.set('neighborhood', committed.neighborhood);
      if (committed.propertyType) params.set('propertyType', committed.propertyType);
      const res = await fetch(`${API_BASE_URL}/api/properties/price-history?${params}`, {
        headers: authHeaders() as HeadersInit,
      });
      if (res.ok) {
        const data = await res.json();
        setPriceHistoryGranular(data);
      }
    } catch { /* silencioso */ }
    finally { setPriceHistoryLoading(false); }
  }, [priceTimeRange, priceHistoryCurrency, committed]);

  useEffect(() => { fetchPriceHistory(); }, [fetchPriceHistory]);

  // ── Métricas: General ──────────────────────────────────────────
  const fetchGeneralMetrics = useCallback(async () => {
    setLoadingMetrics(true);
    try {
      const params: Record<string, string> = {};
      if (committed.region)       params.region = committed.region;
      if (committed.city)         params.city = committed.city;
      if (committed.neighborhood) params.neighborhood = committed.neighborhood;
      if (committed.propertyType) params.propertyType = committed.propertyType;
      const { data } = await axios.get(`${API_BASE_URL}/api/metrics/general`, { params, headers: authHeaders() });
      setGeneralMetrics(data);
    } catch { /* silent */ }
    finally { setLoadingMetrics(false); }
  }, [committed]);

  // ── Métricas: Lista de propiedades ─────────────────────────────
  const fetchPropertyList = useCallback(async () => {
    setLoadingPropertyList(true);
    try {
      const params: Record<string, string | number> = {
        sortBy: metricsSortBy, sortDir: metricsSortDir,
        page: metricsPage + 1, pageSize: metricsPageSize,
      };
      if (committed.region)       params.region = committed.region;
      if (committed.city)         params.city = committed.city;
      if (committed.neighborhood) params.neighborhood = committed.neighborhood;
      if (committed.propertyType) params.propertyType = committed.propertyType;
      if (metricsCondition)       params.condition = metricsCondition;
      if (metricsCurrency)        params.currency = metricsCurrency;
      const { data } = await axios.get(`${API_BASE_URL}/api/metrics/properties`, { params, headers: authHeaders() });
      setPropertyList(data);
    } catch { /* silent */ }
    finally { setLoadingPropertyList(false); }
  }, [committed, metricsSortBy, metricsSortDir, metricsPage, metricsPageSize, metricsCondition, metricsCurrency]);

  // ── Métricas: Comparación ──────────────────────────────────────
  const fetchCompareData = useCallback(async () => {
    if (selectedPropertyIds.size < 2) { setCompareData(null); return; }
    setLoadingCompare(true);
    try {
      const ids = Array.from(selectedPropertyIds).join(',');
      const { data } = await axios.get(`${API_BASE_URL}/api/metrics/compare`, { params: { ids }, headers: authHeaders() });
      setCompareData(data);
    } catch { /* silent */ }
    finally { setLoadingCompare(false); }
  }, [selectedPropertyIds]);

  // ── Timelines para comparación (evolución en el tiempo) ───────
  const fetchCompareTimelines = useCallback(async (ids: number[]) => {
    if (ids.length < 2) { setCompareTimelines(new Map()); return; }
    setLoadingCompareTimelines(true);
    try {
      const results = await Promise.allSettled(
        ids.map(id => axios.get(`${API_BASE_URL}/api/properties/${id}/timeline`, { headers: authHeaders() }))
      );
      const map = new Map<number, PropertyTimeline>();
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') map.set(ids[i], r.value.data);
      });
      setCompareTimelines(map);
    } catch { /* silent */ }
    finally { setLoadingCompareTimelines(false); }
  }, []);

  // ── Timeline individual de propiedad ──────────────────────────
  const fetchTimeline = useCallback(async (propertyId: number) => {
    setLoadingTimeline(true);
    setTimelineData(null);
    setTimelineOpen(true);
    try {
      const { data } = await axios.get(
        `${API_BASE_URL}/api/properties/${propertyId}/timeline`,
        { headers: authHeaders() },
      );
      setTimelineData(data);
    } catch { /* silent */ }
    finally { setLoadingTimeline(false); }
  }, []);

  useEffect(() => { if (metricsMode === 'general') fetchGeneralMetrics(); }, [metricsMode, fetchGeneralMetrics]);
  useEffect(() => { if (metricsMode === 'individual') fetchPropertyList(); }, [metricsMode, fetchPropertyList]);
  useEffect(() => {
    if (selectedPropertyIds.size >= 2) {
      fetchCompareData();
      fetchCompareTimelines(Array.from(selectedPropertyIds));
    } else {
      setCompareData(null);
      setCompareTimelines(new Map());
    }
  }, [selectedPropertyIds, fetchCompareData, fetchCompareTimelines]);

  // Metrics helpers
  const handleMetricsSort = (col: string) => {
    if (metricsSortBy === col) setMetricsSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setMetricsSortBy(col); setMetricsSortDir('asc'); }
    setMetricsPage(0);
  };
  const MAX_COMPARE = 20;
  const togglePropertySelect = (id: number) => {
    setSelectedPropertyIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) { n.delete(id); }
      else if (n.size < MAX_COMPARE) { n.add(id); }
      return n;
    });
  };
  const selectAllOnPage = () => {
    if (!propertyList) return;
    const ids = propertyList.items.map(p => p.id);
    const allSelected = ids.every(id => selectedPropertyIds.has(id));
    setSelectedPropertyIds(prev => {
      const n = new Set(prev);
      if (allSelected) { ids.forEach(id => n.delete(id)); }
      else { ids.forEach(id => { if (n.size < MAX_COMPARE) n.add(id); }); }
      return n;
    });
  };
  const atMaxSelection = selectedPropertyIds.size >= MAX_COMPARE;

  // Price evolution over time (multi-property)
  const comparePriceEvolutionData = useMemo(() => {
    if (!compareData?.properties?.length || compareTimelines.size === 0) return { series: [], labels: [] };

    const props = compareData.properties;
    // Build per-property price series (deduplicated by day)
    const perProp: Array<{ key: string; label: string; points: Map<string, number> }> = props.map((p, i) => {
      const tl = compareTimelines.get(p.id);
      const points = new Map<string, number>();
      if (tl) {
        tl.snapshots
          .filter(s => s.price != null && s.price > 0)
          .forEach(s => {
            const dayKey = new Date(s.scrapedAt).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
            // last snapshot of the day wins
            points.set(dayKey, s.price!);
          });
      }
      return { key: `P${i + 1}`, label: `P${i + 1}: ${(p.title ?? '').substring(0, 22)}${(p.title ?? '').length > 22 ? '…' : ''}`, points };
    });

    // Collect and sort all date labels
    const allDates = Array.from(new Set(perProp.flatMap(pp => Array.from(pp.points.keys()))))
      .sort((a, b) => {
        // parse es-CL date labels back to comparable value
        const parse = (s: string) => {
          const [d, m, y] = s.split(' ');
          const months: Record<string, number> = { ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5, jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11 };
          return new Date(parseInt(y), months[m?.toLowerCase()] ?? 0, parseInt(d)).getTime();
        };
        return parse(a) - parse(b);
      });

    const merged = allDates.map(date => {
      const row: Record<string, string | number | null> = { date };
      perProp.forEach(pp => { row[pp.key] = pp.points.get(date) ?? null; });
      return row;
    });

    return { series: perProp, labels: allDates, data: merged };
  }, [compareData, compareTimelines]);

  // Comparison chart data
  const comparisonBarData = useMemo(() => {
    if (!compareData?.properties?.length) return [];
    return compareData.properties.map(p => ({
      name: (p.title ?? '').substring(0, 20) + ((p.title ?? '').length > 20 ? '...' : ''),
      id: p.id, price: p.price ?? 0, area: p.area ?? 0,
      bedrooms: p.bedrooms ?? 0, bathrooms: p.bathrooms ?? 0,
      daysOnMarket: p.daysOnMarket ?? 0, currency: p.currency ?? 'CLP',
      condition: p.condition ?? '—',
      pricePerSqm: p.pricePerSqm ?? 0,
    }));
  }, [compareData]);

  const comparisonRadarData = useMemo(() => {
    if (!compareData?.properties?.length) return [];
    const props = compareData.properties;
    const maxP = Math.max(...props.map(p => p.price ?? 0), 1);
    const maxA = Math.max(...props.map(p => p.area ?? 0), 1);
    const maxB = Math.max(...props.map(p => p.bedrooms ?? 0), 1);
    const maxBa = Math.max(...props.map(p => p.bathrooms ?? 0), 1);
    const maxD = Math.max(...props.map(p => p.daysOnMarket ?? 0), 1);
    const maxPSqm = Math.max(...props.map(p => p.pricePerSqm ?? 0), 1);
    return ['Precio', 'Superficie', 'Precio/m²', 'Dormitorios', 'Baños', 'Días publicado'].map(metric => {
      const row: Record<string, any> = { metric };
      props.forEach((p, i) => {
        const key = `P${i + 1}`;
        switch (metric) {
          case 'Precio':      row[key] = ((p.price ?? 0) / maxP) * 100; row[`${key}_real`] = formatPrice(p.price, p.currency); break;
          case 'Superficie':  row[key] = ((p.area ?? 0) / maxA) * 100; row[`${key}_real`] = `${p.area ?? 0} m²`; break;
          case 'Precio/m²':   row[key] = ((p.pricePerSqm ?? 0) / maxPSqm) * 100; row[`${key}_real`] = `${(p.pricePerSqm ?? 0).toLocaleString()} ${p.currency ?? ''}/m²`; break;
          case 'Dormitorios': row[key] = ((p.bedrooms ?? 0) / maxB) * 100; row[`${key}_real`] = p.bedrooms ?? 0; break;
          case 'Baños':       row[key] = ((p.bathrooms ?? 0) / maxBa) * 100; row[`${key}_real`] = p.bathrooms ?? 0; break;
          case 'Días publicado': row[key] = ((p.daysOnMarket ?? 0) / maxD) * 100; row[`${key}_real`] = `${p.daysOnMarket ?? 0} días`; break;
        }
      });
      return row;
    });
  }, [compareData]);

  // ── Descarga de informe PDF ────────────────────────────────────
  const downloadReport = useCallback(async () => {
    setReportDownloading(true);
    setReportError(null);

    // Determinar qué tipo de informe generar
    const isComparison = metricsMode === 'individual' && selectedPropertyIds.size >= 2;
    let url: string;

    if (isComparison) {
      const ids = Array.from(selectedPropertyIds).join(',');
      url = `${API_BASE_URL}/api/reports/compare?ids=${ids}`;
    } else {
      const params = new URLSearchParams();
      if (committed.region)       params.set('region',       committed.region);
      if (committed.city)         params.set('city',         committed.city);
      if (committed.neighborhood) params.set('neighborhood', committed.neighborhood);
      if (committed.propertyType) params.set('propertyType', committed.propertyType);
      url = `${API_BASE_URL}/api/reports/market?${params.toString()}`;
    }

    try {
      const response = await fetch(url, { headers: authHeaders() as HeadersInit });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.message ?? `Error ${response.status}`);
      }

      const blob = await response.blob();

      const disposition = response.headers.get('content-disposition') ?? '';
      const match        = disposition.match(/filename[^;=\n]*=((['""]).*?\2|[^;\n]*)/);
      const filename     = match?.[1]?.replace(/['"]/g, '')
        ?? (isComparison ? 'comparativa-propiedades.pdf' : 'informe-inmobiliario.pdf');

      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href  = blobUrl;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
      setReportError(err?.message ?? 'No se pudo generar el informe.');
    } finally {
      setReportDownloading(false);
    }
  }, [committed, metricsMode, selectedPropertyIds]);

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

  // Price history separado por moneda — nunca mezclar CLP con UF
  const { priceHistory, priceHistoryCurrencyLabel } = useMemo(() => {
    const normalize = (arr: any[]): PriceHistoryPoint[] =>
      toArray(arr).map((item: any) => ({
        mes:      item.mes || item.month || '?',
        avgPrice: item.avgPrice ?? 0,
        count:    item.count    ?? 0,
        minPrice: item.minPrice ?? undefined,
        maxPrice: item.maxPrice ?? undefined,
      }));

    const clp = normalize(trackingStats?.priceHistoryCLP ?? trackingStats?.priceHistory ?? []);
    const uf  = normalize(trackingStats?.priceHistoryUF  ?? []);

    // Si solo hay una moneda con datos, usarla directamente
    const hasCLP = clp.length > 0;
    const hasUF  = uf.length  > 0;

    if (priceHistoryCurrency === 'CLP') return { priceHistory: clp, priceHistoryCurrencyLabel: 'CLP' };
    if (priceHistoryCurrency === 'UF')  return { priceHistory: uf,  priceHistoryCurrencyLabel: 'UF'  };
    // auto: preferir la moneda con más puntos
    if (hasUF && (!hasCLP || uf.length >= clp.length)) return { priceHistory: uf,  priceHistoryCurrencyLabel: 'UF'  };
    return { priceHistory: clp, priceHistoryCurrencyLabel: 'CLP' };
  }, [trackingStats, priceHistoryCurrency]);

  const hasBothCurrencies = useMemo(() =>
    toArray(trackingStats?.priceHistoryCLP).length > 0 &&
    toArray(trackingStats?.priceHistoryUF).length  > 0,
    [trackingStats]);

  // ── Helpers de label para el gráfico granular ──────────────────
  const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const DAY_NAMES_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const MONTH_NAMES_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  const buildLabel = (p: PriceHistoryGranularPoint, range: PriceTimeRange): string => {
    if (range === 'day')   return `${String(p.hour ?? 0).padStart(2, '0')}:00`;
    if (range === 'week')  return `${DAY_NAMES[p.dayOfWeek]} ${String(p.day).padStart(2, '0')}`;
    return `${String(p.day).padStart(2, '0')}/${MONTH_NAMES_SHORT[p.month - 1]}`;
  };

  const buildTooltipTitle = (p: PriceHistoryGranularPoint, range: PriceTimeRange): string => {
    if (range === 'day')  return `${String(p.hour ?? 0).padStart(2, '0')}:00 · ${String(p.day).padStart(2, '0')}/${MONTH_NAMES_SHORT[p.month - 1]}/${p.year}`;
    if (range === 'week') return `${DAY_NAMES_FULL[p.dayOfWeek]} ${String(p.day).padStart(2, '0')} de ${MONTH_NAMES_SHORT[p.month - 1]}`;
    return `${String(p.day).padStart(2, '0')} de ${MONTH_NAMES_SHORT[p.month - 1]} ${p.year}`;
  };

  // Pre-computa los labels para el eje X (recharts necesita dataKey simple)
  const priceHistoryGranularWithLabel = useMemo(
    () => priceHistoryGranular.map(p => ({ ...p, _label: buildLabel(p, priceTimeRange) })),
    [priceHistoryGranular, priceTimeRange]   // eslint-disable-line react-hooks/exhaustive-deps
  );

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
    <>
    <Box sx={{ p: { xs: 2, md: 4 }, backgroundColor: COLORS.bg, minHeight: '100vh' }}>

      {/* ─── Header ─── */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
        {/* Left: Title */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button variant="outlined" startIcon={<ArrowBackIcon />}
            onClick={() => router.push(isAdmin ? '/botdashboard' : '/')}
            sx={{ textTransform: 'none', borderRadius: 2, borderColor: '#ddd', color: COLORS.mutedText,
              '&:hover': { borderColor: COLORS.primary, color: COLORS.primary } }}>
            Volver
          </Button>
          <Box sx={{ whiteSpace: 'nowrap' }}>
            <Typography variant="h4" sx={{ fontWeight: 800, color: COLORS.darkText, letterSpacing: '-1px' }}>
              Dashboard Inmobiliario
            </Typography>
            <Typography variant="body2" sx={{ color: COLORS.mutedText, mt: 0.5 }}>
              {loading ? 'Cargando...' : `${totalProperties.toLocaleString('es-CL')} propiedades`}
              {activeFilterCount > 0 && ` · ${activeFilterCount} filtro${activeFilterCount > 1 ? 's' : ''} activo${activeFilterCount > 1 ? 's' : ''}`}
            </Typography>
          </Box>
        </Box>

        {/* Right: User + Buttons */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'flex-end', ml: 'auto', whiteSpace: 'nowrap' }}>
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

          <Tooltip title={reportError ?? (metricsMode === 'individual' && selectedPropertyIds.size >= 2 ? 'Descargar informe comparativo de propiedades seleccionadas' : 'Descargar informe PDF con los filtros activos')} arrow>
            <span>
              <Button
                variant="outlined"
                startIcon={reportDownloading ? <CircularProgress size={16} color="inherit" /> : <PictureAsPdfIcon />}
                onClick={downloadReport}
                disabled={reportDownloading || loading || noCredits || (metricsMode === 'individual' && selectedPropertyIds.size < 2)}
                sx={{
                  textTransform: 'none', borderRadius: 2, px: 3,
                  borderColor: reportError ? COLORS.error : '#e0522a',
                  color:       reportError ? COLORS.error : '#e0522a',
                  '&:hover': {
                    bgcolor: '#fff3f0',
                    borderColor: '#c0391a',
                  },
                }}>
                {reportDownloading ? 'Generando…' : metricsMode === 'individual' && selectedPropertyIds.size >= 2 ? 'Informe Comparativo' : 'Informe PDF'}
              </Button>
            </span>
          </Tooltip>

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
      {reportError && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setReportError(null)}>
          {reportError}
        </Alert>
      )}

      {user && <CreditBar credits={user.credits} plan={user.plan} role={user.role} sessionStart={0} onRecharge={() => window.location.href = '/billing'} />}

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

      {/* ─── Toggle General / Individual ─── */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
        <ToggleButtonGroup
          value={metricsMode}
          exclusive
          onChange={(_, v) => { if (v) { setMetricsMode(v); setSelectedPropertyIds(new Set()); } }}
          sx={{ '& .MuiToggleButton-root': { textTransform: 'none', px: 3, py: 1, fontSize: '0.95rem', fontWeight: 600 } }}
        >
          <ToggleButton value="general">
            <BarChartIcon sx={{ mr: 1, fontSize: 20 }} /> General
          </ToggleButton>
          <ToggleButton value="individual">
            <TableChartIcon sx={{ mr: 1, fontSize: 20 }} /> Individual
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* ══════════════════════════════════════════════════════════════════
          MODO GENERAL — Promedios, gráficos, métricas agregadas
          ══════════════════════════════════════════════════════════════════ */}
      {metricsMode === 'general' && (<>

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
              label:    'Nuevas (últ. 7 días)',
              value:    (() => {
                const n = trackingStats?.newProperties;
                const total = trackingStats?.totalTracked ?? 0;
                if (n == null) return '—';
                if (n === 0) return '—';
                if (total > 0 && n === total) return 'Primera ejecución';
                return `+${n.toLocaleString('es-CL')}`;
              })(),
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
        {/* ── Header ─────────────────────────────────────────────── */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AttachMoneyIcon sx={{ color: COLORS.primary }} />
            <Typography variant="h6" sx={{ fontWeight: 700, color: COLORS.darkText }}>
              Evolución del Precio Promedio
            </Typography>
            <Chip
              label={priceHistoryCurrencyLabel}
              size="small"
              sx={{ bgcolor: priceHistoryCurrencyLabel === 'UF' ? '#f0fdf4' : '#eff6ff',
                    color:  priceHistoryCurrencyLabel === 'UF' ? '#15803d' : '#1d4ed8',
                    fontWeight: 700, fontSize: '0.7rem' }}
            />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            {/* Selector de periodo */}
            <ToggleButtonGroup
              value={priceTimeRange}
              exclusive
              onChange={(_, v) => v && setPriceTimeRange(v)}
              size="small"
            >
              <ToggleButton value="day"   sx={{ textTransform: 'none', px: 1.5, fontSize: '0.75rem' }}>Día</ToggleButton>
              <ToggleButton value="week"  sx={{ textTransform: 'none', px: 1.5, fontSize: '0.75rem' }}>Semana</ToggleButton>
              <ToggleButton value="month" sx={{ textTransform: 'none', px: 1.5, fontSize: '0.75rem' }}>Mes</ToggleButton>
            </ToggleButtonGroup>
            {/* Selector de moneda */}
            <ToggleButtonGroup
              value={priceHistoryCurrency}
              exclusive
              onChange={(_, v) => v && setPriceHistoryCurrency(v)}
              size="small"
            >
              <ToggleButton value="auto" sx={{ textTransform: 'none', px: 1.5, fontSize: '0.75rem' }}>Auto</ToggleButton>
              <ToggleButton value="UF"   sx={{ textTransform: 'none', px: 1.5, fontSize: '0.75rem' }}>UF</ToggleButton>
              <ToggleButton value="CLP"  sx={{ textTransform: 'none', px: 1.5, fontSize: '0.75rem' }}>CLP</ToggleButton>
            </ToggleButtonGroup>
            {/* Chip dinámico según rango */}
            <Chip
              label={priceTimeRange === 'day' ? 'Últimas 24h · por hora' : priceTimeRange === 'week' ? 'Últimos 7 días' : 'Últimos 30 días'}
              size="small"
              sx={{ bgcolor: '#e0f2fe', color: '#0369a1', fontWeight: 600 }}
            />
          </Box>
        </Box>

        {/* ── Subtítulo de observaciones ──────────────────────────── */}
        {!priceHistoryLoading && priceHistoryGranular.length > 0 && (
          <Typography variant="caption" sx={{ color: COLORS.mutedText, display: 'block', mb: 1.5 }}>
            {priceHistoryGranular.reduce((s, p) => s + p.count, 0).toLocaleString('es-CL')} observaciones ·{' '}
            {priceHistoryGranular.length} puntos de datos · {priceHistoryCurrencyLabel}
          </Typography>
        )}

        {/* ── Contenido ───────────────────────────────────────────── */}
        {(loading || priceHistoryLoading) ? (
          <Skeleton variant="rectangular" height={320} sx={{ borderRadius: 2 }} />
        ) : priceHistoryGranular.length === 0 ? (
          <EmptyState message={
            priceTimeRange === 'day'  ? 'Sin datos en las últimas 24 horas. Ejecuta un bot para registrar snapshots.' :
            priceTimeRange === 'week' ? 'Sin datos en los últimos 7 días. Los datos aparecerán tras ejecutar bots esta semana.' :
                                        'Sin historial de precios. Los datos aparecerán tras varias ejecuciones de los bots.'
          } />
        ) : priceHistoryGranular.length === 1 ? (
          // ── Un solo punto: tarjetas ──────────────────────────────
          <Box>
            <Typography variant="caption" sx={{ color: COLORS.mutedText, display: 'block', mb: 2 }}>
              {buildTooltipTitle(priceHistoryGranular[0], priceTimeRange)}
              {' · '}{priceHistoryGranular[0].count} propiedades en {priceHistoryCurrencyLabel}
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
              {[
                { label: 'Precio promedio', value: priceHistoryGranular[0].avgPrice, color: COLORS.primary },
                { label: 'Precio mínimo',   value: priceHistoryGranular[0].minPrice, color: COLORS.success },
                { label: 'Precio máximo',   value: priceHistoryGranular[0].maxPrice, color: COLORS.error   },
              ].map((item) => (
                <Paper key={item.label} elevation={0} sx={{
                  p: 2.5, borderRadius: 2, textAlign: 'center',
                  border: `1px solid ${item.color}30`, bgcolor: `${item.color}08`,
                }}>
                  <Typography variant="caption" sx={{
                    color: COLORS.mutedText, fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.5,
                  }}>
                    {item.label}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: item.color }}>
                    {priceHistoryCurrencyLabel === 'UF'
                      ? `${item.value?.toLocaleString('es-CL', { maximumFractionDigits: 0 })} UF`
                      : formatCLP(item.value)}
                  </Typography>
                </Paper>
              ))}
            </Box>
            <Typography variant="caption" sx={{ color: COLORS.mutedText, mt: 2, display: 'block' }}>
              {priceTimeRange === 'day'  ? 'El gráfico aparecerá cuando haya datos de más de una hora.' :
               priceTimeRange === 'week' ? 'El gráfico aparecerá cuando haya datos de más de un día.' :
                                           'El gráfico aparecerá cuando haya datos de más de un día.'}
            </Typography>
          </Box>
        ) : (
          // ── Múltiples puntos: gráfico ────────────────────────────
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={priceHistoryGranularWithLabel} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="gradAvg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={COLORS.primary} stopOpacity={0.18} />
                  <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="_label"
                tick={{ fontSize: 12, fill: COLORS.mutedText }}
                axisLine={false}
                tickLine={false}
                interval={priceHistoryGranularWithLabel.length > 15 ? Math.ceil(priceHistoryGranularWithLabel.length / 10) - 1 : 0}
              />
              <YAxis
                tickFormatter={(v) =>
                  priceHistoryCurrencyLabel === 'UF'
                    ? `${(v as number).toLocaleString('es-CL', { maximumFractionDigits: 0 })} UF`
                    : formatCLP(v)
                }
                tick={{ fontSize: 11, fill: COLORS.mutedText }}
                axisLine={false}
                tickLine={false}
                width={90}
              />
              <RechartTooltip
                content={({ active, payload }: any) => {
                  if (!active || !payload?.length) return null;
                  const point: PriceHistoryGranularPoint = payload[0]?.payload;
                  const fmt = (v: number) =>
                    priceHistoryCurrencyLabel === 'UF'
                      ? `${v?.toLocaleString('es-CL', { maximumFractionDigits: 0 })} UF`
                      : formatCLP(v);
                  return (
                    <Paper elevation={4} sx={{ p: 2, minWidth: 220, borderRadius: 2, border: '1px solid #e9ecef' }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, mb: 1, color: COLORS.darkText }}>
                        {buildTooltipTitle(point, priceTimeRange)}
                      </Typography>
                      {payload.map((entry: any) => (
                        <Box key={entry.dataKey} sx={{ display: 'flex', justifyContent: 'space-between', gap: 3, mb: 0.4 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: entry.color, flexShrink: 0 }} />
                            <Typography variant="caption" sx={{ color: COLORS.mutedText }}>{entry.name}</Typography>
                          </Box>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: COLORS.darkText }}>
                            {fmt(entry.value)}
                          </Typography>
                        </Box>
                      ))}
                      <Typography variant="caption" sx={{ color: COLORS.mutedText, mt: 0.5, display: 'block' }}>
                        {point.count} propiedades · {priceHistoryCurrencyLabel}
                      </Typography>
                    </Paper>
                  );
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                formatter={(value: string) => <span style={{ color: COLORS.mutedText }}>{value}</span>}
              />
              <Area
                type="monotone"
                dataKey="avgPrice"
                stroke={COLORS.primary}
                strokeWidth={2.5}
                fill="url(#gradAvg)"
                dot={priceHistoryGranularWithLabel.length <= 15 ? { r: 4, fill: COLORS.primary, strokeWidth: 2, stroke: '#fff' } : false}
                activeDot={{ r: 6 }}
                name="Precio promedio"
              />
              <Line
                type="monotone"
                dataKey="minPrice"
                stroke={COLORS.success}
                strokeWidth={1.5}
                strokeDasharray="5 3"
                dot={false}
                name="Precio mínimo"
              />
              <Line
                type="monotone"
                dataKey="maxPrice"
                stroke={COLORS.error}
                strokeWidth={1.5}
                strokeDasharray="5 3"
                dot={false}
                name="Precio máximo"
              />
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
                  <th style={{ textAlign: 'center' }}>Moneda</th>
                  <th style={{ textAlign: 'center' }}>Prom. Dorm.</th>
                  <th style={{ textAlign: 'center' }}>Prom. Baños</th>
                  <th style={{ textAlign: 'center' }}>Prom. m²</th>
                  <th style={{ textAlign: 'right'  }}>Precio Promedio</th>
                  <th style={{ textAlign: 'right'  }}>Rango de Precios</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const ufRows  = propertyTypeStats.filter((t) => (t.currency ?? '').toUpperCase() === 'UF');
                  const clpRows = propertyTypeStats.filter((t) => (t.currency ?? '').toUpperCase() !== 'UF');
                  const renderRow = (t: typeof propertyTypeStats[0]) => (
                    <tr key={t.type}>
                      <td>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: t.color }} />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{t.type}</Typography>
                        </Box>
                      </td>
                      <td style={{ textAlign: 'center' }}><Chip label={t.count} size="small" sx={{ fontWeight: 600 }} /></td>
                      <td style={{ textAlign: 'center' }}>
                        <Chip size="small" label={(t.currency ?? 'CLP').toUpperCase()}
                          sx={{ fontWeight: 700, fontSize: '0.7rem',
                            bgcolor: (t.currency ?? '').toUpperCase() === 'UF' ? '#dbeafe' : '#dcfce7',
                            color:   (t.currency ?? '').toUpperCase() === 'UF' ? '#1d4ed8' : '#15803d' }} />
                      </td>
                      <td style={{ textAlign: 'center' }}>{t.avgBedrooms  ? t.avgBedrooms.toFixed(1)  : '—'}</td>
                      <td style={{ textAlign: 'center' }}>{t.avgBathrooms ? t.avgBathrooms.toFixed(1) : '—'}</td>
                      <td style={{ textAlign: 'center' }}>{t.avgArea ? `${Math.round(t.avgArea)} m²` : '—'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: COLORS.primary }}>
                          {t.avgPrice ? formatPrice(t.avgPrice, t.currency) : '—'}
                        </Typography>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Typography variant="caption" sx={{ color: COLORS.mutedText }}>
                          {t.minPrice ? `${formatPrice(t.minPrice, t.currency)} – ${formatPrice(t.maxPrice ?? 0, t.currency)}` : '—'}
                        </Typography>
                      </td>
                    </tr>
                  );
                  return (
                    <>
                      {ufRows.length > 0 && (
                        <>
                          <tr>
                            <td colSpan={8} style={{ paddingTop: 8, paddingBottom: 4 }}>
                              <Typography variant="caption" sx={{ color: COLORS.mutedText, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Propiedades en UF
                              </Typography>
                            </td>
                          </tr>
                          {ufRows.map(renderRow)}
                        </>
                      )}
                      {clpRows.length > 0 && (
                        <>
                          <tr>
                            <td colSpan={8} style={{ paddingTop: ufRows.length > 0 ? 16 : 8, paddingBottom: 4, borderTop: ufRows.length > 0 ? '2px solid #e9ecef' : 'none' }}>
                              <Typography variant="caption" sx={{ color: COLORS.mutedText, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Propiedades en CLP
                              </Typography>
                            </td>
                          </tr>
                          {clpRows.map(renderRow)}
                        </>
                      )}
                    </>
                  );
                })()}
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

      {/* ─── Métricas de Publicación (Nuevo/Usado, Antigüedad) ─── */}
      {loadingMetrics && !generalMetrics ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
          ) : generalMetrics && (
            <>
              {/* KPI Cards */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2.5, mb: 4 }}>
                <StatCard title="Total Propiedades" value={generalMetrics.totalProperties.toLocaleString('es-CL')}
                  icon={<HomeIcon />} color={COLORS.primary} />
                <StatCard title="Prom. días en mercado"
                  value={generalMetrics.avgDaysOnMarket != null ? `${generalMetrics.avgDaysOnMarket}` : '—'}
                  icon={<AccessTimeIcon />} color={COLORS.accent}
                  subtitle={`${generalMetrics.propertiesWithPubDate} con fecha de publicación`} />
                <StatCard title="Propiedades Nuevas"
                  value={generalMetrics.conditionDistribution?.find(c => c.condition === 'Nuevo')?.count ?? 0}
                  icon={<NewReleasesIcon />} color={COLORS.success}
                  subtitle={`${generalMetrics.propertiesWithCondition} con estado informado`} />
                <StatCard title="Propiedades Usadas"
                  value={generalMetrics.conditionDistribution?.find(c => c.condition === 'Usado')?.count ?? 0}
                  icon={<CheckCircleIcon />} color={COLORS.warning} />
              </Box>

              {/* Row 1: Condition Pie + Price by Condition */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mb: 3 }}>
                <ChartPaper>
                  <SectionHeader title="Distribución Nuevo / Usado" icon={<NewReleasesIcon />} />
                  {(generalMetrics.conditionDistribution?.length ?? 0) > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie data={generalMetrics.conditionDistribution}
                          dataKey="count" nameKey="condition"
                          cx="50%" cy="50%" outerRadius={100}
                          label={({ name, percent }: any) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}>
                          {(generalMetrics.conditionDistribution ?? []).map((_, i) => (
                            <Cell key={i} fill={i === 0 ? COLORS.success : COLORS.warning} />
                          ))}
                        </Pie>
                        <RechartTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <EmptyState message="Sin datos de estado disponibles" />}
                </ChartPaper>

                <ChartPaper>
                  <SectionHeader title="Precio promedio por estado" icon={<AttachMoneyIcon />} />
                  {(generalMetrics.priceByCondition?.length ?? 0) > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={generalMetrics.priceByCondition}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                        <XAxis dataKey="condition" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 11 }}
                          tickFormatter={v => v >= 1e6 ? `${(v / 1e6).toFixed(0)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : `${v}`} />
                        <RechartTooltip formatter={(value: any) => formatCLP(value)} />
                        <Legend />
                        <Bar dataKey="avgPrice" name="Promedio" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="minPrice" name="Mínimo" fill={COLORS.accent} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="maxPrice" name="Máximo" fill={COLORS.secondary} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <EmptyState message="Sin datos de precio por estado" />}
                </ChartPaper>
              </Box>

              {/* Row 2: Publication Timeline + Price by Age */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mb: 3 }}>
                <ChartPaper>
                  <SectionHeader title="Publicaciones por mes" icon={<CalendarTodayIcon />} />
                  {(generalMetrics.publicationByMonth?.length ?? 0) > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={generalMetrics.publicationByMonth}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <RechartTooltip />
                        <Area type="monotone" dataKey="count" name="Publicaciones"
                          stroke={COLORS.primary} fill={COLORS.primary} fillOpacity={0.2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : <EmptyState message="Sin datos de publicación" />}
                </ChartPaper>

                <ChartPaper>
                  <SectionHeader title="Precio promedio por antigüedad" icon={<TrendingUpIcon />} />
                  {(generalMetrics.priceByAge?.length ?? 0) > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={generalMetrics.priceByAge}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                        <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }}
                          tickFormatter={v => v >= 1e6 ? `${(v / 1e6).toFixed(0)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : `${v}`} />
                        <RechartTooltip formatter={(value: any) => formatCLP(value)} />
                        <Bar dataKey="avgPrice" name="Precio promedio" radius={[4, 4, 0, 0]}>
                          {(generalMetrics.priceByAge ?? []).map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <EmptyState message="Sin datos de antigüedad" />}
                </ChartPaper>
              </Box>

              {/* Row 3: Condition by Property Type */}
              {(generalMetrics.conditionByType?.length ?? 0) > 0 && (
                <ChartPaper sx={{ mb: 3 }}>
                  <SectionHeader title="Estado por tipo de propiedad" icon={<ApartmentIcon />} />
                  {(() => {
                    const types = [...new Set((generalMetrics.conditionByType ?? []).map(c => normalizePropertyType(c.propertyType)))];
                    const data = types.map(t => {
                      const items = (generalMetrics.conditionByType ?? []).filter(c => normalizePropertyType(c.propertyType) === t);
                      return {
                        type: t,
                        Nuevo: items.find(c => c.condition === 'Nuevo')?.count ?? 0,
                        Usado: items.find(c => c.condition === 'Usado')?.count ?? 0,
                      };
                    });
                    return (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                          <XAxis dataKey="type" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <RechartTooltip />
                          <Legend />
                          <Bar dataKey="Nuevo" name="Nuevo" fill={COLORS.success} radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Usado" name="Usado" fill={COLORS.warning} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    );
                  })()}
                </ChartPaper>
              )}

              {/* Row 4: Price per m² */}
              {(generalMetrics.avgPricePerSqm?.length ?? 0) > 0 && (
                <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                  {(generalMetrics.avgPricePerSqm ?? []).map(item => (
                    <ChartPaper key={item.currency} sx={{ flex: '1 1 250px', mb: 0 }}>
                      <SectionHeader title={`Precio/m² promedio (${item.currency})`} icon={<BarChartIcon />} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-around', py: 2 }}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h5" fontWeight="bold" color="primary">{item.avg.toLocaleString()}</Typography>
                          <Typography variant="caption" color="text.secondary">Promedio</Typography>
                        </Box>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h6" color="success.main">{item.min.toLocaleString()}</Typography>
                          <Typography variant="caption" color="text.secondary">Mínimo</Typography>
                        </Box>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h6" color="error.main">{item.max.toLocaleString()}</Typography>
                          <Typography variant="caption" color="text.secondary">Máximo</Typography>
                        </Box>
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
                        Basado en {item.count} propiedades con precio y superficie
                      </Typography>
                    </ChartPaper>
                  ))}
                </Box>
              )}

              {(generalMetrics.pricePerSqmByType?.length ?? 0) > 0 && (
                <ChartPaper sx={{ mb: 3 }}>
                  <SectionHeader title="Precio/m² por tipo de propiedad" icon={<ApartmentIcon />} />
                  {(() => {
                    const currencies = [...new Set((generalMetrics.pricePerSqmByType ?? []).map(x => x.currency))];
                    const types = [...new Set((generalMetrics.pricePerSqmByType ?? []).map(x => normalizePropertyType(x.propertyType)))];
                    const data = types.map(t => {
                      const row: Record<string, string | number> = { type: t };
                      currencies.forEach(c => {
                        const item = (generalMetrics.pricePerSqmByType ?? []).find(x => normalizePropertyType(x.propertyType) === t && x.currency === c);
                        row[c] = item?.avg ?? 0;
                      });
                      return row;
                    });
                    const barColors = ['#e0522a', '#2563eb', '#16a34a', '#f59e0b'];
                    return (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                          <XAxis dataKey="type" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <RechartTooltip />
                          <Legend />
                          {currencies.map((c, i) => (
                            <Bar key={c} dataKey={c} name={`${c}/m²`} fill={barColors[i % barColors.length]} radius={[4, 4, 0, 0]} />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    );
                  })()}
                </ChartPaper>
              )}

              {(generalMetrics.pricePerSqmByCity?.length ?? 0) > 0 && (
                <ChartPaper sx={{ mb: 3 }}>
                  <SectionHeader title="Precio/m² por ciudad (Top 20)" icon={<LocationOnIcon />} />
                  <ResponsiveContainer width="100%" height={Math.max(300, (generalMetrics.pricePerSqmByCity?.length ?? 0) * 30)}>
                    <BarChart data={generalMetrics.pricePerSqmByCity} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis dataKey="city" type="category" width={120} tick={{ fontSize: 10 }} />
                      <RechartTooltip formatter={(v: number) => v.toLocaleString()} />
                      <Bar dataKey="avg" name="Precio/m² promedio" fill="#e0522a" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartPaper>
              )}

              {(generalMetrics.pricePerSqmByCondition?.length ?? 0) > 0 && (
                <ChartPaper sx={{ mb: 3 }}>
                  <SectionHeader title="Precio/m² por estado (Nuevo vs Usado)" icon={<CheckCircleIcon />} />
                  {(() => {
                    const currencies = [...new Set((generalMetrics.pricePerSqmByCondition ?? []).map(x => x.currency))];
                    const data = currencies.map(c => {
                      const items = (generalMetrics.pricePerSqmByCondition ?? []).filter(x => x.currency === c);
                      const row: Record<string, string | number> = { currency: c };
                      items.forEach(item => { row[item.condition] = item.avg; });
                      return row;
                    });
                    return (
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={data}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                          <XAxis dataKey="currency" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <RechartTooltip />
                          <Legend />
                          <Bar dataKey="Nuevo" name="Nuevo" fill={COLORS.success} radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Usado" name="Usado" fill={COLORS.warning} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    );
                  })()}
                </ChartPaper>
              )}
            </>
          )}

      </>)}

      {/* ─── INDIVIDUAL METRICS ─── */}
      {metricsMode === 'individual' && (
        <>
          {/* Extra filters for individual mode */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>Estado</InputLabel>
              <Select value={metricsCondition} label="Estado"
                onChange={e => { setMetricsCondition(e.target.value); setMetricsPage(0); }}>
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="Nuevo">Nuevo</MenuItem>
                <MenuItem value="Usado">Usado</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Moneda</InputLabel>
              <Select value={metricsCurrency} label="Moneda"
                onChange={e => { setMetricsCurrency(e.target.value); setMetricsPage(0); }}>
                <MenuItem value="">Todas</MenuItem>
                <MenuItem value="CLP">CLP</MenuItem>
                <MenuItem value="UF">UF</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Selection bar */}
          {selectedPropertyIds.size > 0 && (
            <Paper elevation={0} sx={{
              px: 2.5, py: 1.5, mb: 2, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2,
              bgcolor: selectedPropertyIds.size >= 2 ? '#f0fdf4' : '#fffbeb',
              border: `1px solid ${selectedPropertyIds.size >= 2 ? '#bbf7d0' : '#fde68a'}`,
            }}>
              <CompareIcon sx={{ color: selectedPropertyIds.size >= 2 ? COLORS.success : COLORS.warning, fontSize: 20 }} />
              <Typography variant="body2" sx={{ fontWeight: 600, color: selectedPropertyIds.size >= 2 ? '#15803d' : '#92400e' }}>
                {selectedPropertyIds.size} / {MAX_COMPARE} {selectedPropertyIds.size === 1 ? 'propiedad seleccionada' : 'propiedades seleccionadas'}
                {selectedPropertyIds.size === 1 && ' — Selecciona al menos 2 para comparar'}
                {atMaxSelection && ' — Límite máximo alcanzado'}
              </Typography>
              <Button size="small" onClick={() => setSelectedPropertyIds(new Set())}
                sx={{ ml: 'auto', textTransform: 'none' }}>
                Limpiar selección
              </Button>
            </Paper>
          )}

          {/* Data Table */}
          <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #e9ecef', mb: 3, overflow: 'hidden' }}>
            {loadingPropertyList && !propertyList ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
            ) : (
              <>
                <TableContainer sx={{ maxHeight: 600 }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox">
                          <Checkbox
                            indeterminate={selectedPropertyIds.size > 0 && propertyList?.items
                              ? !propertyList.items.every(p => selectedPropertyIds.has(p.id)) && propertyList.items.some(p => selectedPropertyIds.has(p.id))
                              : false}
                            checked={propertyList?.items ? propertyList.items.every(p => selectedPropertyIds.has(p.id)) && propertyList.items.length > 0 : false}
                            onChange={selectAllOnPage}
                          />
                        </TableCell>
                        {[
                          { id: 'title', label: 'Título', w: 250 },
                          { id: 'price', label: 'Precio', w: 130 },
                          { id: 'propertyType', label: 'Tipo', w: 100 },
                          { id: 'condition', label: 'Estado', w: 85 },
                          { id: 'bedrooms', label: 'Dorm.', w: 65 },
                          { id: 'bathrooms', label: 'Baños', w: 65 },
                          { id: 'area', label: 'm²', w: 75 },
                          { id: 'pricepersqm', label: 'Precio/m²', w: 100 },
                          { id: 'city', label: 'Ciudad', w: 110 },
                          { id: 'publicationdate', label: 'Publicado', w: 100 },
                          { id: 'firstseenat', label: 'Detectado', w: 100 },
                        ].map(col => (
                          <TableCell key={col.id} sx={{ fontWeight: 700, fontSize: '0.75rem', minWidth: col.w }}>
                            <TableSortLabel active={metricsSortBy === col.id}
                              direction={metricsSortBy === col.id ? metricsSortDir : 'asc'}
                              onClick={() => handleMetricsSort(col.id)}>
                              {col.label}
                            </TableSortLabel>
                          </TableCell>
                        ))}
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', width: 50 }}>Historial</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', width: 50 }}>Link</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {propertyList?.items.map(p => (
                        <TableRow key={p.id} hover selected={selectedPropertyIds.has(p.id)}
                          sx={{
                            cursor: (!selectedPropertyIds.has(p.id) && atMaxSelection) ? 'not-allowed' : 'pointer',
                            '&.Mui-selected': { bgcolor: '#f0f9ff' },
                            opacity: (!selectedPropertyIds.has(p.id) && atMaxSelection) ? 0.5 : 1,
                          }}
                          onClick={() => togglePropertySelect(p.id)}>
                          <TableCell padding="checkbox">
                            <Checkbox checked={selectedPropertyIds.has(p.id)}
                              disabled={!selectedPropertyIds.has(p.id) && atMaxSelection} />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 500, maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {p.title}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: COLORS.primary }}>
                              {formatPrice(p.price, p.currency)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={normalizePropertyType(p.propertyType)} size="small" sx={{ fontSize: '0.7rem', height: 22 }} />
                          </TableCell>
                          <TableCell>
                            {p.condition ? (
                              <Chip label={p.condition} size="small"
                                color={p.condition === 'Nuevo' ? 'success' : 'warning'}
                                sx={{ fontSize: '0.7rem', height: 22 }} />
                            ) : '—'}
                          </TableCell>
                          <TableCell align="center">{p.bedrooms ?? '—'}</TableCell>
                          <TableCell align="center">{p.bathrooms ?? '—'}</TableCell>
                          <TableCell>{p.area ? `${p.area} m²` : '—'}</TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontSize: '0.8rem', color: COLORS.primary }}>
                              {p.pricePerSqm ? `${p.pricePerSqm.toLocaleString()} ${p.currency ?? ''}` : '—'}
                            </Typography>
                          </TableCell>
                          <TableCell><Typography variant="caption">{p.city ?? '—'}</Typography></TableCell>
                          <TableCell>
                            {p.publicationDate ? (
                              <Typography variant="caption">{formatDate(p.publicationDate)}</Typography>
                            ) : (
                              <Tooltip title="Fecha de publicación desconocida — estimado desde fecha de detección">
                                <Typography variant="caption" sx={{ color: COLORS.mutedText, fontStyle: 'italic' }}>
                                  ~{formatDate(p.firstSeenAt)}
                                </Typography>
                              </Tooltip>
                            )}
                          </TableCell>
                          <TableCell><Typography variant="caption">{formatDate(p.firstSeenAt)}</Typography></TableCell>
                          <TableCell>
                            <Tooltip title={p.timesScraped > 1 ? 'Ver historial de precios' : 'Solo 1 snapshot disponible'}>
                              <span>
                                <IconButton size="small"
                                  onClick={e => { e.stopPropagation(); fetchTimeline(p.id); }}
                                  sx={{ color: p.timesScraped > 1 ? COLORS.primary : COLORS.mutedText }}>
                                  <HistoryIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            {p.sourceUrl && (
                              <IconButton size="small" onClick={e => { e.stopPropagation(); window.open(p.sourceUrl!, '_blank'); }}>
                                <OpenInNewIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!propertyList?.items || propertyList.items.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={14} sx={{ textAlign: 'center', py: 4, color: COLORS.mutedText }}>
                            No se encontraron propiedades con los filtros aplicados
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                {propertyList && (
                  <TablePagination component="div" count={propertyList.totalCount}
                    page={metricsPage} onPageChange={(_, p) => setMetricsPage(p)}
                    rowsPerPage={metricsPageSize}
                    onRowsPerPageChange={e => { setMetricsPageSize(parseInt(e.target.value, 10)); setMetricsPage(0); }}
                    rowsPerPageOptions={[10, 25, 50, 100]}
                    labelRowsPerPage="Por página:"
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`} />
                )}
              </>
            )}
          </Paper>

          {/* ─── COMPARISON CHARTS (2+ selected) ─── */}
          {selectedPropertyIds.size >= 2 && (
            <>
              <SectionHeader title={`Comparación de ${selectedPropertyIds.size} propiedades`} icon={<CompareIcon />} />

              {loadingCompare ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
              ) : compareData && (
                <>
                  {/* Property cards */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: `repeat(${Math.min(compareData.properties.length, 4)}, 1fr)` }, gap: 2, mb: 3 }}>
                    {compareData.properties.map((p, i) => (
                      <Card key={p.id} sx={{
                        borderTop: `4px solid ${PIE_COLORS[i % PIE_COLORS.length]}`,
                        transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 },
                      }}>
                        <CardContent sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Chip label={`P${i + 1}`} size="small"
                              sx={{ bgcolor: PIE_COLORS[i % PIE_COLORS.length], color: '#fff', fontWeight: 700 }} />
                            <Typography variant="body2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {p.title}
                            </Typography>
                          </Box>
                          <Divider sx={{ my: 1 }} />
                          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5 }}>
                            <Typography variant="caption" color="textSecondary">Precio:</Typography>
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>{formatPrice(p.price, p.currency)}</Typography>
                            <Typography variant="caption" color="textSecondary">Tipo:</Typography>
                            <Typography variant="caption">{normalizePropertyType(p.propertyType)}</Typography>
                            <Typography variant="caption" color="textSecondary">Estado:</Typography>
                            <Typography variant="caption">{p.condition ?? '—'}</Typography>
                            <Typography variant="caption" color="textSecondary">Dorm/Baños:</Typography>
                            <Typography variant="caption">{p.bedrooms ?? '—'} / {p.bathrooms ?? '—'}</Typography>
                            <Typography variant="caption" color="textSecondary">Superficie:</Typography>
                            <Typography variant="caption">{p.area ? `${p.area} m²` : '—'}</Typography>
                            <Typography variant="caption" color="textSecondary">Ciudad:</Typography>
                            <Typography variant="caption">{p.city ?? '—'}</Typography>
                            <Typography variant="caption" color="textSecondary">
                              Días{p.daysOnMarketSource === 'firstSeenAt' ? ' (est.)' : ' publicado'}:
                            </Typography>
                            <Tooltip title={p.daysOnMarketSource === 'firstSeenAt' ? 'Estimado desde fecha de detección (sin fecha de publicación)' : ''} disableHoverListener={p.daysOnMarketSource !== 'firstSeenAt'}>
                              <Typography variant="caption" sx={{ fontStyle: p.daysOnMarketSource === 'firstSeenAt' ? 'italic' : 'normal', color: p.daysOnMarketSource === 'firstSeenAt' ? COLORS.mutedText : 'inherit' }}>
                                {p.daysOnMarket != null ? `~${p.daysOnMarket}` : '—'}
                                {p.daysOnMarketSource === 'firstSeenAt' ? ' *' : ''}
                              </Typography>
                            </Tooltip>
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>

                  {/* Charts */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mb: 3 }}>
                    <ChartPaper>
                      <SectionHeader title="Comparación de precios" icon={<AttachMoneyIcon />} />
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={comparisonBarData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={60} />
                          <YAxis tick={{ fontSize: 11 }}
                            tickFormatter={v => v >= 1e6 ? `${(v / 1e6).toFixed(0)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : `${v}`} />
                          <RechartTooltip formatter={(value: any, _: any, props: any) => [formatPrice(value, props.payload?.currency), 'Precio']} />
                          <Bar dataKey="price" name="Precio" radius={[4, 4, 0, 0]}>
                            {comparisonBarData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartPaper>

                    <ChartPaper sx={{ overflow: 'visible', position: 'relative', zIndex: 10 }}>
                      <SectionHeader title="Comparación multidimensional" icon={<AnalyticsIcon />} />
                      <ResponsiveContainer width="100%" height={300}>
                        <RadarChart data={comparisonRadarData}>
                          <PolarGrid stroke="#e9ecef" />
                          <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                          <PolarRadiusAxis tick={false} domain={[0, 100]} />
                          <RechartTooltip
                            wrapperStyle={{ zIndex: 1000, pointerEvents: 'none' }}
                            position={{ x: 0, y: -10 }}
                            content={({ active, payload, label }: any) => {
                            if (!active || !payload?.length) return null;
                            return (
                              <Paper elevation={6} sx={{ p: 1.5, minWidth: 180, maxHeight: 320, overflow: 'auto', border: '1px solid #e0e0e0', bgcolor: 'rgba(255,255,255,0.97)' }}>
                                <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.75 }}>{label}</Typography>
                                {payload.map((entry: any) => {
                                  const realV = entry.payload?.[`${entry.dataKey}_real`];
                                  return (
                                    <Box key={entry.dataKey} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.4 }}>
                                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: entry.color, flexShrink: 0 }} />
                                      <Typography variant="caption" sx={{ color: COLORS.mutedText, minWidth: 30 }}>{entry.name}:</Typography>
                                      <Typography variant="caption" sx={{ fontWeight: 700 }}>{realV ?? entry.value}</Typography>
                                    </Box>
                                  );
                                })}
                              </Paper>
                            );
                          }} />
                          <Legend />
                          {compareData.properties.map((p, i) => (
                            <Radar key={p.id} name={`P${i + 1}`} dataKey={`P${i + 1}`}
                              stroke={PIE_COLORS[i % PIE_COLORS.length]} fill={PIE_COLORS[i % PIE_COLORS.length]} fillOpacity={0.15} />
                          ))}
                        </RadarChart>
                      </ResponsiveContainer>
                    </ChartPaper>
                  </Box>

                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 3, mb: 3 }}>
                    <ChartPaper>
                      <SectionHeader title="Superficie (m²)" icon={<SquareFootIcon />} />
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={comparisonBarData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={60} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <RechartTooltip formatter={(value: any) => [`${value} m²`, 'Superficie']} />
                          <Bar dataKey="area" name="m²" radius={[4, 4, 0, 0]}>
                            {comparisonBarData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartPaper>

                    <ChartPaper>
                      <SectionHeader title="Precio por m²" icon={<BarChartIcon />} />
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={comparisonBarData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={60} />
                          <YAxis tick={{ fontSize: 11 }}
                            tickFormatter={v => v >= 1e6 ? `${(v / 1e6).toFixed(0)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : `${v}`} />
                          <RechartTooltip formatter={(value: any, _: any, props: any) => [`${Number(value).toLocaleString()} ${props.payload?.currency}/m²`, 'Precio/m²']} />
                          <Bar dataKey="pricePerSqm" name="Precio/m²" radius={[4, 4, 0, 0]}>
                            {comparisonBarData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartPaper>

                    <ChartPaper>
                      <SectionHeader title="Días en mercado" icon={<AccessTimeIcon />} />
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={comparisonBarData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={60} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <RechartTooltip formatter={(value: any) => [`${value} días`, 'Tiempo']} />
                          <Bar dataKey="daysOnMarket" name="Días" radius={[4, 4, 0, 0]}>
                            {comparisonBarData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartPaper>
                  </Box>

                  {/* ─── Evolución de precio en el tiempo ─── */}
                  <ChartPaper sx={{ mb: 3 }}>
                    <SectionHeader title="Evolución de precio en el tiempo" icon={<TimelineIcon />} />
                    {loadingCompareTimelines ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} /></Box>
                    ) : comparePriceEvolutionData.data && comparePriceEvolutionData.data.length >= 1 ? (
                      <>
                        <ResponsiveContainer width="100%" height={300}>
                          <ComposedChart data={comparePriceEvolutionData.data} margin={{ top: 8, right: 16, left: 8, bottom: 50 }}>
                            <defs>
                              {comparePriceEvolutionData.series.map((s, i) => (
                                <linearGradient key={s.key} id={`grad-cmp-${i}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%"  stopColor={PIE_COLORS[i % PIE_COLORS.length]} stopOpacity={0.12} />
                                  <stop offset="95%" stopColor={PIE_COLORS[i % PIE_COLORS.length]} stopOpacity={0} />
                                </linearGradient>
                              ))}
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" height={65} interval="preserveStartEnd" />
                            <YAxis tick={{ fontSize: 11 }}
                              domain={[
                                (dataMin: number) => Math.floor(dataMin * 0.97),
                                (dataMax: number) => Math.ceil(dataMax * 1.03),
                              ]}
                              tickFormatter={v => {
                                const currency = compareData?.properties[0]?.currency ?? 'CLP';
                                return currency === 'UF'
                                  ? `${Number(v).toLocaleString('es-CL', { maximumFractionDigits: 0 })} UF`
                                  : v >= 1e6 ? `$${(v / 1e6).toFixed(0)}M` : v >= 1e3 ? `$${(v / 1e3).toFixed(0)}K` : `$${v}`;
                              }} />
                            <RechartTooltip
                              content={({ active, payload, label: lbl }: any) => {
                                if (!active || !payload?.length) return null;
                                return (
                                  <Paper elevation={4} sx={{ p: 1.5, minWidth: 190, border: '1px solid #e0e0e0' }}>
                                    <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.75 }}>{lbl}</Typography>
                                    {payload.filter((e: any) => e.value != null).map((entry: any) => {
                                      const currency = compareData?.properties[0]?.currency ?? 'CLP';
                                      const fmtVal = currency === 'UF' ? formatUF(entry.value) : formatCLP(entry.value);
                                      return (
                                        <Box key={entry.dataKey} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.3 }}>
                                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: entry.color, flexShrink: 0 }} />
                                          <Typography variant="caption" sx={{ color: COLORS.mutedText, minWidth: 30 }}>{entry.dataKey}:</Typography>
                                          <Typography variant="caption" sx={{ fontWeight: 700 }}>{fmtVal}</Typography>
                                        </Box>
                                      );
                                    })}
                                  </Paper>
                                );
                              }}
                            />
                            <Legend />
                            {comparePriceEvolutionData.series.map((s, i) => {
                              const color = PIE_COLORS[i % PIE_COLORS.length];
                              const pointCount = s.points.size;
                              return (
                                <Line key={s.key} type="monotone" dataKey={s.key} name={s.label}
                                  stroke={color} strokeWidth={pointCount === 1 ? 0 : 2.5}
                                  dot={(dotProps: any) => {
                                    const { cx, cy, value } = dotProps;
                                    if (value == null) return <g key={`${cx}-${cy}`} />;
                                    const r = pointCount === 1 ? 8 : 4;
                                    return <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill={color} stroke="#fff" strokeWidth={2} />;
                                  }}
                                  connectNulls activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }} />
                              );
                            })}
                          </ComposedChart>
                        </ResponsiveContainer>
                        <Typography variant="caption" sx={{ color: COLORS.mutedText, display: 'block', mt: 0.5, textAlign: 'center' }}>
                          Cada punto representa el último precio registrado ese día por scraping.
                        </Typography>
                      </>
                    ) : (
                      <Box sx={{ py: 4, textAlign: 'center' }}>
                        <TimelineIcon sx={{ fontSize: 40, color: COLORS.mutedText, mb: 1 }} />
                        <Typography variant="body2" sx={{ color: COLORS.mutedText }}>
                          Las propiedades seleccionadas no tienen suficiente historial de precios para mostrar evolución en el tiempo.
                        </Typography>
                        <Typography variant="caption" sx={{ color: COLORS.mutedText }}>
                          Se necesitan al menos 2 snapshots con precio por propiedad.
                        </Typography>
                      </Box>
                    )}
                  </ChartPaper>
                </>
              )}
            </>
          )}
        </>
      )}
    </Box>

    {/* ─── MODAL: Historial de propiedad ─── */}
    <Dialog open={timelineOpen} onClose={() => setTimelineOpen(false)} maxWidth="md" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pr: 1 }}>
        <HistoryIcon sx={{ color: COLORS.primary }} />
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {timelineData?.property.title ?? 'Historial de propiedad'}
          </Typography>
          {timelineData?.property.city && (
            <Typography variant="caption" sx={{ color: COLORS.mutedText }}>
              {[timelineData.property.neighborhood, timelineData.property.city].filter(Boolean).join(', ')}
            </Typography>
          )}
        </Box>
        <IconButton size="small" onClick={() => setTimelineOpen(false)}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        {loadingTimeline ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : timelineData ? (() => {
          const prop = timelineData.property;
          const snaps = timelineData.snapshots;

          // Construir serie de precios: solo snapshots con precio válido
          type PricePoint = { date: Date; price: number; hasChanges: boolean; changedFields: string | null; label: string; labelFull: string };
          const priceSeries = snaps
            .filter(s => s.price != null && s.price > 0)
            .map(s => ({
              date: new Date(s.scrapedAt),
              price: s.price!,
              hasChanges: s.hasChanges,
              changedFields: s.changedFields,
              label: new Date(s.scrapedAt).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }),
              labelFull: new Date(s.scrapedAt).toLocaleString('es-CL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            }))
            // Deduplicar por día si hay muchos
            .reduce<PricePoint[]>((acc, cur) => {
              const last = acc[acc.length - 1];
              if (!last || last.label !== cur.label) acc.push(cur);
              else if (cur.hasChanges) acc[acc.length - 1] = cur;
              return acc;
            }, []);

          const hasPriceHistory = priceSeries.length >= 2;
          const currency = prop.currency ?? (snaps[0]?.currency ?? 'CLP');
          const isUF = currency.toUpperCase() === 'UF';
          const fmt = (v: number | null | undefined) => isUF ? formatUF(v) : formatCLP(v);

          // Calcular variación total de precio
          const firstPrice = priceSeries[0]?.price;
          const lastPrice  = priceSeries[priceSeries.length - 1]?.price;
          const priceDelta = firstPrice && lastPrice ? lastPrice - firstPrice : null;
          const pricePct   = firstPrice && priceDelta != null ? (priceDelta / firstPrice) * 100 : null;

          return (
            <Box sx={{ p: 2.5 }}>
              {/* Stats row */}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 1.5, mb: 2.5 }}>
                {[
                  { label: 'Precio actual', value: fmt(prop.price), icon: <AttachMoneyIcon sx={{ fontSize: 18, color: COLORS.primary }} /> },
                  { label: 'Veces scrapeado', value: prop.timesScraped.toLocaleString(), icon: <TimelineIcon sx={{ fontSize: 18, color: COLORS.accent }} /> },
                  { label: 'Snapshots con cambios', value: timelineData.snapshotsWithChanges.toLocaleString(), icon: <ChangeCircleIcon sx={{ fontSize: 18, color: COLORS.warning }} /> },
                  { label: 'Detectado', value: formatDate(prop.firstSeenAt), icon: <CalendarTodayIcon sx={{ fontSize: 18, color: COLORS.success }} /> },
                  { label: 'Último visto', value: formatDate(prop.lastSeenAt), icon: <AccessTimeIcon sx={{ fontSize: 18, color: COLORS.mutedText }} /> },
                ].map(({ label, value, icon }) => (
                  <Paper key={label} elevation={0} sx={{ p: 1.5, borderRadius: 2, border: '1px solid #e9ecef', display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    {icon}
                    <Box>
                      <Typography variant="caption" sx={{ color: COLORS.mutedText, display: 'block', lineHeight: 1.2 }}>{label}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: COLORS.darkText }}>{value}</Typography>
                    </Box>
                  </Paper>
                ))}
              </Box>

              {/* Precio anterior si hubo cambio */}
              {prop.previousPrice != null && prop.previousPrice !== prop.price && (
                <Paper elevation={0} sx={{ px: 2, py: 1.25, mb: 2, borderRadius: 2,
                  bgcolor: priceDelta != null && priceDelta < 0 ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${priceDelta != null && priceDelta < 0 ? '#bbf7d0' : '#fecaca'}`,
                  display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  {priceDelta != null && priceDelta < 0
                    ? <TrendingDownIcon sx={{ color: COLORS.up }} />
                    : <TrendingUpIcon  sx={{ color: COLORS.down }} />}
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Cambio de precio detectado:{' '}
                    <span style={{ textDecoration: 'line-through', color: COLORS.mutedText }}>{fmt(prop.previousPrice)}</span>
                    {' → '}
                    <span style={{ color: priceDelta != null && priceDelta < 0 ? COLORS.up : COLORS.down, fontWeight: 700 }}>{fmt(prop.price)}</span>
                    {pricePct != null && (
                      <span style={{ marginLeft: 8, fontSize: '0.8rem' }}>({pricePct > 0 ? '+' : ''}{pricePct.toFixed(1)}%)</span>
                    )}
                  </Typography>
                  {prop.priceChangedAt && (
                    <Typography variant="caption" sx={{ ml: 'auto', color: COLORS.mutedText }}>
                      {formatDate(prop.priceChangedAt)}
                    </Typography>
                  )}
                </Paper>
              )}

              {/* Gráfico de evolución de precios */}
              {hasPriceHistory ? (
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <TrendingUpIcon sx={{ color: COLORS.primary, fontSize: 18 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: COLORS.darkText }}>
                      Evolución de precio ({priceSeries.length} puntos)
                    </Typography>
                    {pricePct != null && (
                      <Chip size="small"
                        label={`${pricePct > 0 ? '+' : ''}${pricePct.toFixed(1)}% total`}
                        sx={{
                          ml: 'auto', fontWeight: 700, fontSize: '0.7rem',
                          bgcolor: pricePct < 0 ? '#f0fdf4' : pricePct > 0 ? '#fef2f2' : '#f1f5f9',
                          color:   pricePct < 0 ? COLORS.up     : pricePct > 0 ? COLORS.down     : COLORS.mutedText,
                        }} />
                    )}
                  </Box>
                  <ResponsiveContainer width="100%" height={240}>
                    <ComposedChart data={priceSeries} margin={{ top: 8, right: 16, left: 8, bottom: 40 }}>
                      <defs>
                        <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={COLORS.primary} stopOpacity={0.18} />
                          <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" height={60} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 11 }}
                        tickFormatter={v => isUF
                          ? `${v.toLocaleString('es-CL', { maximumFractionDigits: 0 })} UF`
                          : v >= 1e6 ? `$${(v / 1e6).toFixed(0)}M` : v >= 1e3 ? `$${(v / 1e3).toFixed(0)}K` : `$${v}`} />
                      <RechartTooltip
                        content={({ active, payload, label: lbl }: any) => {
                          if (!active || !payload?.length) return null;
                          const pt = payload[0]?.payload;
                          return (
                            <Paper elevation={4} sx={{ p: 1.5, minWidth: 180, border: '1px solid #e0e0e0' }}>
                              <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>{pt?.labelFull ?? lbl}</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 700, color: COLORS.primary }}>
                                {fmt(pt?.price)}
                              </Typography>
                              {pt?.hasChanges && pt?.changedFields && (
                                <Typography variant="caption" sx={{ color: COLORS.warning, display: 'block', mt: 0.5 }}>
                                  Cambios: {pt.changedFields}
                                </Typography>
                              )}
                            </Paper>
                          );
                        }}
                      />
                      <Area type="monotone" dataKey="price" name="Precio"
                        stroke={COLORS.primary} strokeWidth={2}
                        fill="url(#priceGrad)" dot={false} activeDot={false} />
                      <Line type="monotone" dataKey="price" name="Precio"
                        stroke={COLORS.primary} strokeWidth={2.5} dot={(dotProps: any) => {
                          const { cx, cy, payload } = dotProps;
                          return (
                            <circle key={`dot-${cx}-${cy}`}
                              cx={cx} cy={cy} r={payload.hasChanges ? 6 : 3.5}
                              fill={payload.hasChanges ? COLORS.warning : COLORS.primary}
                              stroke="#fff" strokeWidth={1.5} />
                          );
                        }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                  <Box sx={{ display: 'flex', gap: 2, mt: 0.5, flexWrap: 'wrap' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: COLORS.primary, border: '1.5px solid #fff', boxShadow: '0 0 0 1px #0f4c81' }} />
                      <Typography variant="caption" sx={{ color: COLORS.mutedText }}>Sin cambios</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: COLORS.warning, border: '1.5px solid #fff', boxShadow: `0 0 0 1px ${COLORS.warning}` }} />
                      <Typography variant="caption" sx={{ color: COLORS.mutedText }}>Cambio detectado</Typography>
                    </Box>
                  </Box>
                </Box>
              ) : (
                <Paper elevation={0} sx={{ p: 3, textAlign: 'center', borderRadius: 2, bgcolor: '#f8f9fa', border: '1px dashed #dee2e6' }}>
                  <TimelineIcon sx={{ fontSize: 40, color: COLORS.mutedText, mb: 1 }} />
                  <Typography variant="body2" sx={{ color: COLORS.mutedText }}>
                    {priceSeries.length === 1
                      ? 'Solo hay 1 observación de precio. Se necesitan al menos 2 para mostrar evolución.'
                      : 'Esta propiedad aún no tiene historial de precios registrado.'}
                  </Typography>
                  {priceSeries.length === 1 && (
                    <Typography variant="caption" sx={{ color: COLORS.mutedText, display: 'block', mt: 0.5 }}>
                      Precio observado: <strong>{fmt(priceSeries[0]?.price)}</strong> el {priceSeries[0]?.label}
                    </Typography>
                  )}
                </Paper>
              )}

              {/* Tabla resumen de snapshots con cambios */}
              {timelineData.snapshotsWithChanges > 0 && (
                <Box sx={{ mt: 2.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: COLORS.darkText, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <ChangeCircleIcon sx={{ fontSize: 16, color: COLORS.warning }} />
                    Snapshots con cambios detectados
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                    {snaps
                      .filter(s => s.hasChanges && s.changedFields)
                      .map(s => (
                        <Paper key={s.id} elevation={0} sx={{
                          px: 1.75, py: 1, borderRadius: 1.5,
                          border: '1px solid #fde68a', bgcolor: '#fffbeb',
                          display: 'flex', alignItems: 'center', gap: 1.5,
                        }}>
                          <ChangeCircleIcon sx={{ fontSize: 16, color: COLORS.warning, flexShrink: 0 }} />
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="caption" sx={{ color: COLORS.mutedText }}>
                              {new Date(s.scrapedAt).toLocaleString('es-CL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                            <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                              Campos: {s.changedFields}
                            </Typography>
                          </Box>
                          {s.price != null && (
                            <Typography variant="body2" sx={{ fontWeight: 700, color: COLORS.primary, flexShrink: 0 }}>
                              {fmt(s.price)}
                            </Typography>
                          )}
                        </Paper>
                      ))}
                  </Box>
                </Box>
              )}
            </Box>
          );
        })() : (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="textSecondary">No se pudo cargar el historial.</Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.5, gap: 1 }}>
        {timelineData?.property.sourceUrl && (
          <Button size="small" startIcon={<OpenInNewIcon />}
            onClick={() => window.open(timelineData.property.sourceUrl!, '_blank')}
            sx={{ textTransform: 'none' }}>
            Ver publicación
          </Button>
        )}
        <Button size="small" onClick={() => setTimelineOpen(false)} sx={{ textTransform: 'none', ml: 'auto' }}>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
}