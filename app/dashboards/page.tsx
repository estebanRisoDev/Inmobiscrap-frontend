'use client';

import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Box, Paper, Typography, Card, CardContent, CircularProgress, Alert, Button } from '@mui/material';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

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

export default function Dashboard() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [marketData, setMarketData] = useState<UnknownRecord | null>(null);
  const [trendsData, setTrendsData] = useState<any[]>([]);
  const [compareData, setCompareData] = useState<UnknownRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/api/bots`),
        axios.get(`${API_BASE_URL}/api/analytics/market`),
        axios.get(`${API_BASE_URL}/api/analytics/trends`),
        axios.get(`${API_BASE_URL}/api/analytics/compare`),
      ]);

      const [botsResult, marketResult, trendsResult, compareResult] = results;

      if (botsResult.status === 'fulfilled') {
        setBots(toArray(botsResult.value.data));
      } else {
        setBots([]);
      }

      if (marketResult.status === 'fulfilled') {
        setMarketData(marketResult.value.data || null);
      } else {
        setMarketData(null);
      }

      if (trendsResult.status === 'fulfilled') {
        const data = trendsResult.value.data;
        const items = toArray(data?.items || data?.data || data?.trends || data);
        setTrendsData(items);
      } else {
        setTrendsData([]);
      }

      if (compareResult.status === 'fulfilled') {
        setCompareData(compareResult.value.data || null);
      } else {
        setCompareData(null);
      }

      if (results.some((result) => result.status === 'rejected')) {
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
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const totalProperties = useMemo(() => {
    const marketTotal = marketData
      ? pickNumber(marketData, ['totalProperties', 'total', 'properties', 'count'])
      : undefined;
    if (marketTotal !== undefined) return marketTotal;

    const sourceTotals = toArray(marketData?.sources || marketData?.bySource || marketData?.propertiesBySource);
    const sourceSum = sourceTotals.reduce((sum: number, entry: any) => {
      return sum + (pickNumber(entry, ['value', 'total', 'count', 'properties']) || 0);
    }, 0);
    if (sourceSum > 0) return sourceSum;

    return bots.reduce((sum, bot) => sum + (bot.totalScraped || 0), 0);
  }, [bots, marketData]);

  const botStatusData = useMemo(() => {
    const activeFromBots = bots.filter((bot) => bot.isActive).length;
    const totalFromBots = bots.length;
    const activeFromMarket = marketData ? pickNumber(marketData, ['activeBots', 'active', 'runningBots']) : undefined;
    const totalFromMarket = marketData ? pickNumber(marketData, ['totalBots', 'bots', 'botCount']) : undefined;

    const active = totalFromBots > 0 ? activeFromBots : (activeFromMarket || 0);
    const inactive = totalFromBots > 0
      ? totalFromBots - activeFromBots
      : Math.max(0, (totalFromMarket || 0) - active);

    return [
      { name: 'Activos', value: active },
      { name: 'Inactivos', value: inactive },
    ];
  }, [bots, marketData]);

  const executionData = useMemo(() => {
    const buckets = new Map<string, ExecutionBucket>();

    const items = trendsData;
    if (items.length === 0) return [];

    items.forEach((item: any, index: number) => {
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

      if (computedExitosas === undefined && total !== undefined) {
        computedExitosas = Math.max(0, total - (computedFallidas || 0));
      }

      if (computedFallidas === undefined && total !== undefined && computedExitosas !== undefined) {
        computedFallidas = Math.max(0, total - computedExitosas);
      }

      bucket.exitosas += computedExitosas || 0;
      bucket.fallidas += computedFallidas || 0;

      buckets.set(key, bucket);
    });

    return Array.from(buckets.values())
      .sort((a, b) => a.key.localeCompare(b.key))
      .map(({ key, ...rest }) => rest);
  }, [trendsData]);

  const propertySourceData = useMemo(() => {
    const sources = new Map<string, SourceBucket>();

    const sourceItems = toArray(
      marketData?.sources ||
      marketData?.bySource ||
      marketData?.propertiesBySource ||
      compareData?.sources ||
      compareData?.bySource ||
      compareData?.propertiesBySource
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
    const hasTotals = values.some((entry) => entry.value > 0);

    return values.map((entry) => ({
      name: entry.name,
      value: hasTotals ? entry.value : entry.count,
    }));
  }, [bots]);

  const STATUS_COLORS = ['#4caf50', '#f44336'];

  const StatCard = ({ title, value, color }: any) => (
    <Card sx={{ height: '100%', borderLeft: `4px solid ${color}` }}>
      <CardContent>
        <Typography color="text.secondary" gutterBottom variant="body2">
          {title}
        </Typography>
        <Typography variant="h4" component="div" sx={{ fontWeight: 600, color }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ padding: 4, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <Box sx={{ marginBottom: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, color: '#1976d2', marginBottom: 1 }}>
          Dashboard de Scraping
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Monitoreo y analisis de bots inmobiliarios
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ marginBottom: 3 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ marginBottom: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <Button variant="outlined" onClick={fetchDashboardData} disabled={loading}>
          Recargar
        </Button>
        {loading && <CircularProgress size={20} />}
      </Box>

      <Box sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 3,
        marginBottom: 4
      }}>
        <StatCard title="Total de Propiedades" value={totalProperties.toLocaleString('es-CL')} color="#1976d2" />
        <StatCard title="Bots Activos" value={botStatusData[0]?.value || 0} color="#2e7d32" />
        <StatCard
          title="Ejecuciones Exitosas"
          value={executionData.reduce((sum, item) => sum + (item.exitosas || 0), 0)}
          color="#4caf50"
        />
        <StatCard
          title="Errores"
          value={executionData.reduce((sum, item) => sum + (item.fallidas || 0), 0)}
          color="#f44336"
        />
      </Box>

      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' },
        gap: 3,
        marginBottom: 3
      }}>
        <Paper sx={{ padding: 3, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ marginBottom: 2, fontWeight: 600 }}>
            Ejecuciones Mensuales
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={executionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="exitosas" stroke="#4caf50" strokeWidth={2} name="Exitosas" />
              <Line type="monotone" dataKey="fallidas" stroke="#f44336" strokeWidth={2} name="Fallidas" />
            </LineChart>
          </ResponsiveContainer>
        </Paper>

        <Paper sx={{ padding: 3, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ marginBottom: 2, fontWeight: 600 }}>
            Estado de Bots
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={botStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => {
                  const percentage = entry.percent ? (entry.percent * 100).toFixed(0) : '0';
                  return `${entry.name}: ${percentage}%`;
                }}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {botStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Paper>
      </Box>

      <Paper sx={{ padding: 3, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ marginBottom: 2, fontWeight: 600 }}>
          Propiedades Scrapeadas por Fuente
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={propertySourceData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" fill="#1976d2" name="Propiedades" />
          </BarChart>
        </ResponsiveContainer>
      </Paper>
    </Box>
  );
}
