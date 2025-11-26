// Componente mejorado con auto-scroll y UI simplificada

'use client';

import React, { useRef, useEffect } from 'react';
import {
  Box, Button, Typography, Paper, Chip, LinearProgress,
  Card, CardContent, Alert,
} from '@mui/material';
import {
  WifiOff, Wifi, PlayArrow, Stop, Delete,
} from '@mui/icons-material';
import { useBotLogs, BotLog } from '../hooks/useBotLogs';

interface BotLogViewerProps {
  autoConnect?: boolean;
  hubUrl?: string;
  botId?: number; // NUEVO: para auto-suscripción
}

export function BotLogViewer({
  autoConnect = false,
  hubUrl = 'http://localhost:5000/hubs/botlogs',
  botId, // NUEVO
}: BotLogViewerProps) {
  const {
    logs, progress, isConnected, isConnecting, error,
    connect, disconnect, clearLogs, stats,
  } = useBotLogs({ autoConnect, hubUrl, maxLogs: 500, botId }); // Aumentado a 500 logs

  // NUEVO: Auto-scroll al final cuando lleguen nuevos logs
  const logsEndRef = useRef<HTMLDivElement>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = React.useState(true);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  // Detectar si el usuario hizo scroll manual
  const handleScroll = () => {
    if (!logsContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = logsContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setAutoScroll(isAtBottom);
  };

  const getLogColor = (level: BotLog['level']) => {
    switch (level) {
      case 'Info': return { bg: '#1e3a5f', border: '#3b82f6', text: '#93c5fd' };
      case 'Success': return { bg: '#064e3b', border: '#10b981', text: '#6ee7b7' };
      case 'Warning': return { bg: '#78350f', border: '#f59e0b', text: '#fbbf24' };
      case 'Error': return { bg: '#7f1d1d', border: '#ef4444', text: '#fca5a5' };
      default: return { bg: '#1e293b', border: '#64748b', text: '#94a3b8' };
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('es-CL', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3,
    });
  };

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper elevation={2} sx={{ p: 2, mb: 2, flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              📡 Logger en Tiempo Real {botId && `- Bot #${botId}`}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Monitoreo de ejecución en vivo
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {!autoScroll && (
              <Chip
                label="Scroll pausado"
                size="small"
                color="warning"
                onClick={() => setAutoScroll(true)}
                sx={{ cursor: 'pointer' }}
              />
            )}
            <Chip
              icon={isConnecting ? undefined : isConnected ? <Wifi /> : <WifiOff />}
              label={isConnecting ? 'Conectando...' : isConnected ? 'Conectado' : 'Desconectado'}
              color={isConnecting ? 'warning' : isConnected ? 'success' : 'error'}
              size="small"
            />
          </Box>
        </Box>
        {error && <Alert severity="error" sx={{ mt: 1 }}><strong>Error:</strong> {error}</Alert>}
      </Paper>

      {/* Stats */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexShrink: 0 }}>
        <Card sx={{ flex: 1, minWidth: 0 }}>
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Typography variant="h5" sx={{ color: '#1976d2', fontWeight: 600 }}>
              {stats.total}
            </Typography>
            <Typography variant="caption" color="text.secondary">Total Logs</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, minWidth: 0 }}>
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Typography variant="h5" sx={{ color: '#2e7d32', fontWeight: 600 }}>
              {stats.successes}
            </Typography>
            <Typography variant="caption" color="text.secondary">Éxitos</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, minWidth: 0 }}>
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Typography variant="h5" sx={{ color: '#ed6c02', fontWeight: 600 }}>
              {stats.warnings}
            </Typography>
            <Typography variant="caption" color="text.secondary">Advertencias</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, minWidth: 0 }}>
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Typography variant="h5" sx={{ color: '#d32f2f', fontWeight: 600 }}>
              {stats.errors}
            </Typography>
            <Typography variant="caption" color="text.secondary">Errores</Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Progress */}
      {progress && (
        <Paper elevation={2} sx={{ p: 2, mb: 2, bgcolor: '#1e293b', flexShrink: 0 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography sx={{ color: 'white', fontWeight: 500, fontSize: '0.9rem' }}>
              {progress.botName}
            </Typography>
            <Typography sx={{ color: '#94a3b8', fontSize: '0.9rem' }}>
              {progress.current}/{progress.total}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progress.percentage}
            sx={{
              height: 8, borderRadius: 4, bgcolor: '#334155',
              '& .MuiLinearProgress-bar': {
                borderRadius: 4, background: 'linear-gradient(90deg, #10b981, #3b82f6)',
              },
            }}
          />
          <Typography sx={{ color: 'white', mt: 0.5, fontSize: '0.8rem' }}>
            {progress.percentage.toFixed(1)}% - {progress.message}
          </Typography>
        </Paper>
      )}

      {/* Controls - SIMPLIFICADOS */}
      <Paper elevation={2} sx={{ p: 1.5, mb: 2, flexShrink: 0 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Button 
            variant="contained" 
            color="success" 
            size="small"
            startIcon={<PlayArrow />}
            onClick={connect} 
            disabled={isConnected || isConnecting}
          >
            Conectar
          </Button>
          <Button 
            variant="contained" 
            color="error" 
            size="small"
            startIcon={<Stop />}
            onClick={disconnect} 
            disabled={!isConnected}
          >
            Desconectar
          </Button>
          <Button 
            variant="outlined" 
            size="small"
            startIcon={<Delete />} 
            onClick={clearLogs}
          >
            Limpiar
          </Button>
          {!autoScroll && (
            <Button 
              variant="outlined" 
              size="small"
              onClick={() => setAutoScroll(true)}
              sx={{ ml: 'auto' }}
            >
              ⬇️ Ir al final
            </Button>
          )}
        </Box>
      </Paper>

      {/* Logs - MEJORADO CON AUTO-SCROLL */}
      <Paper 
        ref={logsContainerRef}
        onScroll={handleScroll}
        elevation={2} 
        sx={{ 
          flex: 1,
          overflow: 'auto', 
          bgcolor: '#0f172a', 
          fontFamily: 'monospace',
          p: 1.5,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0, // Importante para flex
        }}
      >
        {logs.length === 0 ? (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            justifyContent: 'center', 
            flex: 1,
            color: '#64748b' 
          }}>
            <Typography variant="h6">No hay logs todavía</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              {botId 
                ? 'Esperando logs del bot...' 
                : 'Los logs aparecerán cuando ejecutes un bot'}
            </Typography>
          </Box>
        ) : (
          <>
            {logs.map((log, index) => {
              const colors = getLogColor(log.level);
              return (
                <Paper 
                  key={index} 
                  sx={{ 
                    p: 1, 
                    mb: 0.5, 
                    bgcolor: colors.bg,
                    borderLeft: `3px solid ${colors.border}`, 
                    color: colors.text,
                    flexShrink: 0,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, flexWrap: 'wrap' }}>
                    <Typography 
                      component="span" 
                      sx={{ fontSize: '0.7rem', color: '#94a3b8', minWidth: 80, fontFamily: 'monospace' }}
                    >
                      {formatTime(log.timestamp)}
                    </Typography>
                    <Chip 
                      label={log.level.toUpperCase()} 
                      size="small"
                      sx={{ 
                        bgcolor: '#1e293b', 
                        color: 'white', 
                        fontSize: '0.65rem', 
                        height: 18, 
                        fontWeight: 600,
                        fontFamily: 'monospace',
                      }} 
                    />
                    {log.botId && log.botName && (
                      <Typography 
                        component="span" 
                        sx={{ fontSize: '0.75rem', color: '#c084fc', fontWeight: 600 }}
                      >
                        [{log.botName}]
                      </Typography>
                    )}
                    <Typography 
                      component="span" 
                      sx={{ fontSize: '0.8rem', flex: 1, wordBreak: 'break-word' }}
                    >
                      {log.message}
                    </Typography>
                  </Box>
                </Paper>
              );
            })}
            <div ref={logsEndRef} />
          </>
        )}
      </Paper>
    </Box>
  );
}

export default BotLogViewer;