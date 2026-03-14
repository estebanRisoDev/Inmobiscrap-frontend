'use client';

import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import {
  Box, Paper, Typography, Card, CardContent, CircularProgress,
  Alert, Button, Chip, Select, MenuItem, FormControl,
  InputLabel, IconButton, Tooltip, Avatar, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TableSortLabel, TablePagination,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip, Legend, ResponsiveContainer,
  AreaChart, Area,
} from 'recharts';
import ArrowBackIcon     from '@mui/icons-material/ArrowBack';
import RefreshIcon       from '@mui/icons-material/Refresh';
import LogoutIcon        from '@mui/icons-material/Logout';
import SellIcon          from '@mui/icons-material/Sell';
import CheckCircleIcon   from '@mui/icons-material/CheckCircle';
import PendingIcon       from '@mui/icons-material/Pending';
import VerifiedIcon      from '@mui/icons-material/Verified';
import OpenInNewIcon     from '@mui/icons-material/OpenInNew';
import StorefrontIcon    from '@mui/icons-material/Storefront';
import AccessTimeIcon    from '@mui/icons-material/AccessTime';
import TrendingUpIcon    from '@mui/icons-material/TrendingUp';
import WarningAmberIcon  from '@mui/icons-material/WarningAmber';
import LinkOffIcon       from '@mui/icons-material/LinkOff';
import LocationCityIcon  from '@mui/icons-material/LocationCity';
import { useRouter }     from 'next/navigation';
import { useAuth }       from '@/context/AuthContext';
import { authHeaders }   from '@/lib/auth';

const API = 'http://localhost:5000';

const COLORS = {
  primary:   '#0f4c81',
  secondary: '#e8927c',
  accent:    '#2ec4b6',
  warning:   '#f4a261',
  error:     '#e76f51',
  success:   '#2a9d8f',
  up:        '#16a34a',
  down:      '#dc2626',
  bg:        '#f8f9fa',
  cardBg:    '#ffffff',
  darkText:  '#1a1a2e',
  mutedText: '#6c757d',
};

const CHART_COLORS = ['#0f4c81', '#2a9d8f', '#e8927c', '#f4a261', '#e76f51', '#264653', '#2ec4b6', '#a855f7', '#06b6d4', '#84cc16'];

// ── Types ──────────────────────────────────────────────────────────────
interface SoldProperty {
  id: number;
  title: string;
  price: number | null;
  currency: string | null;
  city: string | null;
  region: string | null;
  neighborhood: string | null;
  propertyType: string | null;
  condition: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area: number | null;
  sourceUrl: string | null;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  soldDetectedAt: string | null;
  timesScraped: number;
  consecutiveMisses: number;
  lastVerifiedAt: string | null;
  daysOnMarket: number | null;
}

interface SoldStats {
  totalSold: number;
  soldThisMonth: number;
  soldThisWeek: number;
  avgDaysOnMarket: number;
  totalActive: number;
  pendingVerification: number;
  withoutSourceUrl: number;
  saleRate: number;
  soldByMonth: { month: string; count: number }[];
  soldByCity: { city: string; count: number }[];
  avgPriceSold: number;
  avgPriceActive: number;
}

interface QueueItem {
  id: number;
  title: string;
  price: number | null;
  currency: string | null;
  city: string | null;
  propertyType: string | null;
  sourceUrl: string | null;
  listingStatus: string | null;
  lastSeenAt: string | null;
  lastVerifiedAt: string | null;
  consecutiveMisses: number;
  daysSinceLastSeen: number | null;
}

interface JobStatus {
  hasRun: boolean;
  ranAt?: string;
  verified?: number;
  sold?: number;
  active?: number;
  errors?: number;
  nextRun?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────
const fmtPrice = (p: number | null, c: string | null) => {
  if (p == null) return '—';
  const cur = c || 'CLP';
  if (cur === 'UF') return `UF ${p.toLocaleString('es-CL')}`;
  return `$${p.toLocaleString('es-CL')}`;
};

const fmtDate = (d: string | null) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
};

const StatCard = ({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string }) => (
  <Card sx={{ flex: 1, minWidth: 180, borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
    <CardContent sx={{ p: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <Box sx={{ p: 1, borderRadius: 2, bgcolor: `${color}15`, color, display: 'flex' }}>{icon}</Box>
        <Typography variant="body2" sx={{ color: COLORS.mutedText, fontWeight: 500 }}>{label}</Typography>
      </Box>
      <Typography variant="h4" sx={{ fontWeight: 800, color: COLORS.darkText }}>{value}</Typography>
      {sub && <Typography variant="caption" sx={{ color: COLORS.mutedText }}>{sub}</Typography>}
    </CardContent>
  </Card>
);

const ChartPaper = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Paper sx={{ p: 3, borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', flex: 1, minWidth: 350 }}>
    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>{title}</Typography>
    {children}
  </Paper>
);

// ═══════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════
export default function VendidosPage() {
  const router = useRouter();
  const { user, logout } = useAuth();

  // Data
  const [stats, setStats] = useState<SoldStats | null>(null);
  const [properties, setProperties] = useState<SoldProperty[]>([]);
  const [total, setTotal] = useState(0);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'overview' | 'list' | 'queue'>('overview');

  // Pagination & sort (list)
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [sortBy, setSortBy] = useState('soldDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Filters
  const [filterCity, setFilterCity] = useState('');
  const [filterType, setFilterType] = useState('');

  // Verify dialog
  const [verifying, setVerifying] = useState<number | null>(null);
  const [verifyResult, setVerifyResult] = useState<string | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/properties/sold/stats`, { headers: authHeaders() });
      setStats(res.data);
    } catch (e: any) {
      console.error('Error fetching sold stats:', e);
    }
  }, []);

  const fetchProperties = useCallback(async () => {
    try {
      const params: Record<string, any> = {
        page: page + 1, pageSize: rowsPerPage, sortBy, sortDir,
      };
      if (filterCity) params.city = filterCity;
      if (filterType) params.propertyType = filterType;

      const res = await axios.get(`${API}/api/properties/sold`, { headers: authHeaders(), params });
      setProperties(res.data.items);
      setTotal(res.data.total);
    } catch (e: any) {
      console.error('Error fetching sold properties:', e);
    }
  }, [page, rowsPerPage, sortBy, sortDir, filterCity, filterType]);

  const fetchQueue = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/properties/sold/verification-queue`, { headers: authHeaders() });
      setQueue(res.data.items);
    } catch (e: any) {
      console.error('Error fetching verification queue:', e);
    }
  }, []);

  const fetchJobStatus = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/properties/sold/job-status`, { headers: authHeaders() });
      setJobStatus(res.data);
    } catch {
      // silencioso, el banner simplemente no aparece
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchStats(), fetchProperties(), fetchQueue(), fetchJobStatus()]);
    } catch {
      setError('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [fetchStats, fetchProperties, fetchQueue, fetchJobStatus]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { fetchProperties(); }, [fetchProperties]);

  // ── Actions ────────────────────────────────────────────────────────
  const handleVerify = async (id: number) => {
    setVerifying(id);
    setVerifyResult(null);
    try {
      const res = await axios.post(`${API}/api/properties/sold/${id}/verify`, {}, { headers: authHeaders() });
      setVerifyResult(`Resultado: ${res.data.result} → Estado: ${res.data.listingStatus}`);
      fetchAll();
    } catch {
      setVerifyResult('Error al verificar');
    } finally {
      setVerifying(null);
    }
  };

  const handleMarkSold = async (id: number) => {
    try {
      await axios.post(`${API}/api/properties/sold/${id}/mark-sold`, {}, { headers: authHeaders() });
      fetchAll();
    } catch { /* ignore */ }
  };

  const handleMarkActive = async (id: number) => {
    try {
      await axios.post(`${API}/api/properties/sold/${id}/mark-active`, {}, { headers: authHeaders() });
      fetchAll();
    } catch { /* ignore */ }
  };

  const handleSort = (col: string) => {
    if (sortBy === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir('desc');
    }
    setPage(0);
  };

  // ── Render ─────────────────────────────────────────────────────────
  if (loading && !stats) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: COLORS.bg }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, backgroundColor: COLORS.bg, minHeight: '100vh' }}>

      {/* ─── Header ─── */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button variant="outlined" startIcon={<ArrowBackIcon />}
            onClick={() => router.push('/dashboards')}
            sx={{ textTransform: 'none', borderRadius: 2, borderColor: '#ddd', color: COLORS.mutedText,
              '&:hover': { borderColor: COLORS.primary, color: COLORS.primary } }}>
            Dashboard
          </Button>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: COLORS.darkText, letterSpacing: '-1px' }}>
              Propiedades Vendidas
            </Typography>
            <Typography variant="body2" sx={{ color: COLORS.mutedText, mt: 0.5 }}>
              Monitoreo de propiedades que dejaron de estar disponibles
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
              </Box>
              <IconButton size="small" onClick={logout} title="Cerrar sesión">
                <LogoutIcon fontSize="small" sx={{ color: COLORS.mutedText }} />
              </IconButton>
            </Box>
          )}
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchAll}
            disabled={loading}
            sx={{ textTransform: 'none', borderRadius: 2 }}>
            Actualizar
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* ─── Tabs ─── */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
        {[
          { key: 'overview', label: 'Resumen', icon: <TrendingUpIcon fontSize="small" /> },
          { key: 'list', label: `Vendidas (${total})`, icon: <SellIcon fontSize="small" /> },
          { key: 'queue', label: `Verificación (${queue.length})`, icon: <PendingIcon fontSize="small" /> },
        ].map(t => (
          <Button key={t.key}
            variant={tab === t.key ? 'contained' : 'outlined'}
            startIcon={t.icon}
            onClick={() => setTab(t.key as any)}
            sx={{
              textTransform: 'none', borderRadius: 2, px: 3,
              ...(tab === t.key ? {
                background: `linear-gradient(45deg, ${COLORS.primary} 30%, #1a6bb5 90%)`,
                boxShadow: '0 3px 5px 2px rgba(15,76,129,.2)',
              } : { borderColor: '#ddd', color: COLORS.mutedText }),
            }}>
            {t.label}
          </Button>
        ))}
      </Box>

      {/* ═══ TAB: OVERVIEW ═══ */}
      {tab === 'overview' && stats && (
        <>
          {/* KPIs */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <StatCard icon={<SellIcon />} label="Total Vendidas" value={stats.totalSold} color={COLORS.error} />
            <StatCard icon={<StorefrontIcon />} label="Vendidas este mes" value={stats.soldThisMonth}
              sub={`${stats.soldThisWeek} esta semana`} color={COLORS.warning} />
            <StatCard icon={<AccessTimeIcon />} label="Promedio días en mercado" value={stats.avgDaysOnMarket}
              sub="desde primera detección" color={COLORS.primary} />
            <StatCard icon={<TrendingUpIcon />} label="Tasa de venta semanal"
              value={`${stats.saleRate}%`}
              sub={`${stats.totalActive} activas`} color={COLORS.success} />
            <StatCard icon={<PendingIcon />} label="Pendientes verificar"
              value={stats.pendingVerification} color={COLORS.warning} />
            <StatCard icon={<LinkOffIcon />} label="Sin SourceUrl"
              value={stats.withoutSourceUrl}
              sub="No verificables" color={COLORS.mutedText} />
          </Box>

          {/* Charts */}
          <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
            {/* Vendidas por mes */}
            <ChartPaper title="Vendidas por mes">
              {stats.soldByMonth.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={stats.soldByMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <RechartTooltip />
                    <Area type="monotone" dataKey="count" name="Vendidas"
                      fill={`${COLORS.error}30`} stroke={COLORS.error} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <Typography variant="body2" sx={{ color: COLORS.mutedText, textAlign: 'center', py: 8 }}>
                  Aún no hay datos de ventas
                </Typography>
              )}
            </ChartPaper>

            {/* Vendidas por zona */}
            <ChartPaper title="Top zonas con más ventas">
              {stats.soldByCity.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={stats.soldByCity} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis dataKey="city" type="category" tick={{ fontSize: 11 }} width={120} />
                    <RechartTooltip />
                    <Bar dataKey="count" name="Vendidas" radius={[0, 6, 6, 0]}>
                      {stats.soldByCity.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Typography variant="body2" sx={{ color: COLORS.mutedText, textAlign: 'center', py: 8 }}>
                  Aún no hay datos por zona
                </Typography>
              )}
            </ChartPaper>
          </Box>

          {/* Precio comparativo */}
          {(stats.avgPriceSold > 0 || stats.avgPriceActive > 0) && (
            <Paper sx={{ p: 3, borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                Precio promedio: Vendidas vs Activas
              </Typography>
              <Box sx={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: COLORS.error }}>
                    ${stats.avgPriceSold.toLocaleString('es-CL')}
                  </Typography>
                  <Typography variant="caption" sx={{ color: COLORS.mutedText }}>Vendidas</Typography>
                </Box>
                <Typography variant="h4" sx={{ color: COLORS.mutedText }}>vs</Typography>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: COLORS.success }}>
                    ${stats.avgPriceActive.toLocaleString('es-CL')}
                  </Typography>
                  <Typography variant="caption" sx={{ color: COLORS.mutedText }}>Activas</Typography>
                </Box>
              </Box>
            </Paper>
          )}
        </>
      )}

      {/* ═══ TAB: LIST ═══ */}
      {tab === 'list' && (
        <Paper sx={{ borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          {/* Filters */}
          <Box sx={{ p: 2, display: 'flex', gap: 2, borderBottom: '1px solid #f0f0f0' }}>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Ciudad</InputLabel>
              <Select value={filterCity} label="Ciudad" onChange={e => { setFilterCity(e.target.value); setPage(0); }}>
                <MenuItem value="">Todas</MenuItem>
                {stats?.soldByCity.map(c => (
                  <MenuItem key={c.city} value={c.city}>{c.city} ({c.count})</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Tipo</InputLabel>
              <Select value={filterType} label="Tipo" onChange={e => { setFilterType(e.target.value); setPage(0); }}>
                <MenuItem value="">Todos</MenuItem>
                {['Departamento', 'Casa', 'Terreno', 'Oficina', 'Local Comercial'].map(t => (
                  <MenuItem key={t} value={t}>{t}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <TableContainer sx={{ maxHeight: 600 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#fafafa' }}>Título</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#fafafa' }}>
                    <TableSortLabel active={sortBy === 'price'} direction={sortBy === 'price' ? sortDir : 'desc'}
                      onClick={() => handleSort('price')}>Precio</TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#fafafa' }}>Tipo</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#fafafa' }}>Ciudad</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#fafafa' }}>
                    <TableSortLabel active={sortBy === 'daysOnMarket'} direction={sortBy === 'daysOnMarket' ? sortDir : 'desc'}
                      onClick={() => handleSort('daysOnMarket')}>Días en mercado</TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#fafafa' }}>
                    <TableSortLabel active={sortBy === 'soldDate'} direction={sortBy === 'soldDate' ? sortDir : 'desc'}
                      onClick={() => handleSort('soldDate')}>Vendida el</TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#fafafa' }} align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {properties.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ textAlign: 'center', py: 6, color: COLORS.mutedText }}>
                      No se encontraron propiedades vendidas
                    </TableCell>
                  </TableRow>
                ) : properties.map(p => (
                  <TableRow key={p.id} hover>
                    <TableCell sx={{ maxWidth: 280 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.title}
                      </Typography>
                      {p.neighborhood && (
                        <Typography variant="caption" sx={{ color: COLORS.mutedText }}>{p.neighborhood}</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{fmtPrice(p.price, p.currency)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={p.propertyType || '—'} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>{p.city || '—'}</TableCell>
                    <TableCell>
                      {p.daysOnMarket != null ? (
                        <Chip label={`${p.daysOnMarket}d`} size="small"
                          sx={{ bgcolor: p.daysOnMarket < 30 ? `${COLORS.success}20` : p.daysOnMarket < 90 ? `${COLORS.warning}20` : `${COLORS.error}20`,
                                color: p.daysOnMarket < 30 ? COLORS.success : p.daysOnMarket < 90 ? COLORS.warning : COLORS.error }} />
                      ) : '—'}
                    </TableCell>
                    <TableCell>{fmtDate(p.soldDetectedAt)}</TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        {p.sourceUrl && (
                          <Tooltip title="Abrir publicación original">
                            <IconButton size="small" onClick={() => window.open(p.sourceUrl!, '_blank')}>
                              <OpenInNewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Marcar como activa (falso positivo)">
                          <IconButton size="small" color="success" onClick={() => handleMarkActive(p.id)}>
                            <CheckCircleIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div" count={total} page={page} rowsPerPage={rowsPerPage}
            onPageChange={(_, p) => setPage(p)}
            onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value)); setPage(0); }}
            rowsPerPageOptions={[10, 25, 50, 100]}
            labelRowsPerPage="Filas:"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
          />
        </Paper>
      )}

      {/* ═══ TAB: VERIFICATION QUEUE ═══ */}
      {tab === 'queue' && (
        <Paper sx={{ borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <Box sx={{ p: 2, borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Cola de verificación ({queue.length} propiedades)
            </Typography>
            <Typography variant="body2" sx={{ color: COLORS.mutedText }}>
              Propiedades sin ver en 3+ días con SourceUrl disponible
            </Typography>
          </Box>

          {/* Banner estado del job */}
          <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #f0f0f0', bgcolor: jobStatus?.hasRun ? '#f0f9f0' : '#fffbf0' }}>
            {jobStatus?.hasRun ? (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center' }}>
                <Typography variant="body2" sx={{ color: COLORS.mutedText }}>
                  <strong style={{ color: COLORS.success }}>✓ Último job:</strong>{' '}
                  {fmtDate(jobStatus.ranAt!)} — hace {Math.round((Date.now() - new Date(jobStatus.ranAt!).getTime()) / 3600000)}h
                </Typography>
                <Typography variant="body2" sx={{ color: COLORS.mutedText }}>
                  Chequeadas: <strong>{jobStatus.verified}</strong>
                </Typography>
                <Typography variant="body2" sx={{ color: COLORS.mutedText }}>
                  Vendidas detectadas: <strong style={{ color: jobStatus.sold! > 0 ? COLORS.error : undefined }}>{jobStatus.sold}</strong>
                </Typography>
                <Typography variant="body2" sx={{ color: COLORS.mutedText }}>
                  Reactivadas: <strong>{jobStatus.active}</strong>
                </Typography>
                {(jobStatus.errors ?? 0) > 0 && (
                  <Typography variant="body2" sx={{ color: COLORS.warning }}>
                    Errores de red: <strong>{jobStatus.errors}</strong>
                  </Typography>
                )}
                <Typography variant="body2" sx={{ color: COLORS.mutedText }}>
                  Próxima: <strong>{fmtDate(jobStatus.nextRun!)}</strong>
                </Typography>
              </Box>
            ) : (
              <Typography variant="body2" sx={{ color: COLORS.warning }}>
                ⚠ El job aún no ha corrido desde el último reinicio. Próxima ejecución: 3:00 AM UTC.
              </Typography>
            )}
          </Box>

          <TableContainer sx={{ maxHeight: 600 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#fafafa' }}>Título</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#fafafa' }}>Precio</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#fafafa' }}>Ciudad</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#fafafa' }}>Estado</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#fafafa' }}>Días sin ver</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#fafafa' }}>Misses</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#fafafa' }}>Última verificación</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#fafafa' }} align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {queue.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ textAlign: 'center', py: 6, color: COLORS.mutedText }}>
                      No hay propiedades pendientes de verificación
                    </TableCell>
                  </TableRow>
                ) : queue.map(q => (
                  <TableRow key={q.id} hover
                    sx={{ bgcolor: q.listingStatus === 'missing' ? '#fff3cd15' : undefined }}>
                    <TableCell sx={{ maxWidth: 250 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {q.title}
                      </Typography>
                    </TableCell>
                    <TableCell>{fmtPrice(q.price, q.currency)}</TableCell>
                    <TableCell>{q.city || '—'}</TableCell>
                    <TableCell>
                      <Chip label={q.listingStatus || 'active'} size="small"
                        color={q.listingStatus === 'missing' ? 'warning' : 'default'} variant="outlined" />
                    </TableCell>
                    <TableCell>
                      {q.daysSinceLastSeen != null ? (
                        <Chip label={`${q.daysSinceLastSeen}d`} size="small"
                          sx={{ bgcolor: q.daysSinceLastSeen > 7 ? `${COLORS.error}20` : `${COLORS.warning}20`,
                                color: q.daysSinceLastSeen > 7 ? COLORS.error : COLORS.warning }} />
                      ) : '—'}
                    </TableCell>
                    <TableCell>{q.consecutiveMisses}</TableCell>
                    <TableCell>{fmtDate(q.lastVerifiedAt)}</TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        <Tooltip title="Verificar ahora (HTTP check)">
                          <IconButton size="small" color="primary"
                            disabled={verifying === q.id}
                            onClick={() => handleVerify(q.id)}>
                            {verifying === q.id ? <CircularProgress size={18} /> : <VerifiedIcon fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                        {q.sourceUrl && (
                          <Tooltip title="Abrir URL">
                            <IconButton size="small" onClick={() => window.open(q.sourceUrl!, '_blank')}>
                              <OpenInNewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Marcar como vendida">
                          <IconButton size="small" color="error" onClick={() => handleMarkSold(q.id)}>
                            <SellIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Marcar como activa">
                          <IconButton size="small" color="success" onClick={() => handleMarkActive(q.id)}>
                            <CheckCircleIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Verify result snackbar */}
      {verifyResult && (
        <Alert severity="info" sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, boxShadow: 4 }}
          onClose={() => setVerifyResult(null)}>
          {verifyResult}
        </Alert>
      )}
    </Box>
  );
}
