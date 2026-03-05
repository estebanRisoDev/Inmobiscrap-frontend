'use client';
// app/botdashboard/page.tsx
// CAMBIO: Agregado botón "Gestión de Usuarios" y import del dialog

import { Button, Box, Typography, Paper, Chip, Dialog, DialogTitle, DialogContent,
  DialogContentText, DialogActions, CircularProgress, Avatar, IconButton } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import DeleteIcon from '@mui/icons-material/Delete';
import TimelineIcon from '@mui/icons-material/Timeline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import BarChartIcon from '@mui/icons-material/BarChart';
import LogoutIcon from '@mui/icons-material/Logout';
import ScheduleIcon from '@mui/icons-material/Schedule';
import PeopleIcon from '@mui/icons-material/People';
import axios from 'axios';
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BotLogDialog } from '@/components/BotLogDialog';
import { CreateBotDialog } from '@/components/CreateBotDialog';
import { UserManagementDialog } from '@/components/UserManagementDialog';
import { useAuth } from '@/context/AuthContext';
import { authHeaders } from '@/lib/auth';

const API_BASE_URL = 'http://localhost:5000';

interface Bot {
  id: number;
  name: string;
  source: string;
  url: string;
  isActive: boolean;
  status: string;
  totalScraped: number;
  lastRunCount: number;
  createdAt: string;
  updatedAt?: string;
  lastRun?: string;
  scheduleEnabled: boolean;
  cronExpression?: string;
}

export default function Home() {
  const [dataBots, setDataBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [userMgmtOpen, setUserMgmtOpen] = useState(false);  // ← NUEVO
  const [selectedBotId, setSelectedBotId] = useState<number | undefined>(undefined);

  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; bot: Bot | null; deleting: boolean }>({
    open: false, bot: null, deleting: false,
  });
  const [stopDialog, setStopDialog] = useState<{ open: boolean; bot: Bot | null; stopping: boolean }>({
    open: false, bot: null, stopping: false,
  });

  const router = useRouter();
  const { user, logout, isAdmin } = useAuth();

  const fetchBots = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/bots`, { headers: authHeaders() });
      setDataBots(response.data);
    } catch (error: any) {
      if (error.response?.status === 401) logout();
      if (error.response?.status === 403) router.push('/dashboards');
      console.error('Error fetching bots:', error);
    } finally {
      setLoading(false);
    }
  }, [logout, router]);

  useEffect(() => {
    fetchBots();
    const interval = setInterval(fetchBots, 15000);
    return () => clearInterval(interval);
  }, [fetchBots]);

  const handleViewLogs = (botId: number) => {
    setSelectedBotId(botId);
    setLogDialogOpen(true);
  };

  const handleRunBot = async (botId: number) => {
    try {
      await axios.post(`${API_BASE_URL}/api/bots/${botId}/run`, {}, { headers: authHeaders() });
      fetchBots();
      setSelectedBotId(botId);
      setLogDialogOpen(true);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al ejecutar el bot');
    }
  };

  const handleStopConfirm = async () => {
    if (!stopDialog.bot) return;
    setStopDialog((prev) => ({ ...prev, stopping: true }));
    try {
      await axios.post(`${API_BASE_URL}/api/bots/${stopDialog.bot.id}/stop`, {}, { headers: authHeaders() });
      fetchBots();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al detener el bot');
    } finally {
      setStopDialog({ open: false, bot: null, stopping: false });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.bot) return;
    setDeleteDialog((prev) => ({ ...prev, deleting: true }));
    try {
      await axios.delete(`${API_BASE_URL}/api/bots/${deleteDialog.bot.id}`, { headers: authHeaders() });
      fetchBots();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al eliminar el bot');
    } finally {
      setDeleteDialog({ open: false, bot: null, deleting: false });
    }
  };

  const STATUS_CONFIG: Record<string, { color: 'default' | 'info' | 'success' | 'error' | 'warning'; label: string }> = {
    idle:      { color: 'default', label: 'Inactivo'      },
    running:   { color: 'info',    label: 'Ejecutando'    },
    stopping:  { color: 'warning', label: 'Deteniendo...' },
    completed: { color: 'success', label: 'Completado'    },
    error:     { color: 'error',   label: 'Error'         },
    stopped:   { color: 'warning', label: 'Detenido'      },
  };

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 65, headerAlign: 'center', align: 'center' },
    { field: 'name', headerName: 'Nombre', width: 220, flex: 1 },
    {
      field: 'source', headerName: 'Fuente', width: 150,
      renderCell: (params) => <Chip label={params.value || 'N/A'} size="small" variant="outlined" color="primary" />,
    },
    {
      field: 'scheduleEnabled', headerName: 'Programación', width: 170,
      renderCell: (params) => {
        const bot: Bot = params.row;
        if (!bot.scheduleEnabled || !bot.cronExpression)
          return <Chip label="Manual" size="small" variant="outlined" sx={{ color: '#9e9e9e', borderColor: '#e0e0e0' }} />;
        return (
          <Chip icon={<ScheduleIcon sx={{ fontSize: '14px !important' }} />}
            label={bot.cronExpression} size="small" color="primary" variant="outlined"
            sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }} />
        );
      },
    },
    {
      field: 'isActive', headerName: 'Activo', width: 90,
      renderCell: (params) => <Chip label={params.value ? 'Sí' : 'No'} color={params.value ? 'success' : 'default'} size="small" />,
    },
    {
      field: 'status', headerName: 'Estado', width: 140,
      renderCell: (params) => {
        const cfg = STATUS_CONFIG[params.value] ?? { color: 'default', label: params.value || 'idle' };
        return <Chip label={cfg.label} color={cfg.color} size="small" variant="outlined"
          sx={params.value === 'running' ? { animation: 'pulse 1.5s infinite' } : {}} />;
      },
    },
    {
      field: 'totalScraped', headerName: 'Total', width: 90, headerAlign: 'center', align: 'center',
      renderCell: (params) => <Typography variant="body2" sx={{ fontWeight: 600 }}>{(params.value || 0).toLocaleString('es-CL')}</Typography>,
    },
    {
      field: 'lastRunCount', headerName: 'Último run', width: 100, headerAlign: 'center', align: 'center',
      renderCell: (params) => <Typography variant="body2" sx={{ color: 'text.secondary' }}>{params.value || 0}</Typography>,
    },
    {
      field: 'url', headerName: 'URL', width: 200, flex: 1,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'text.secondary' }} title={params.value}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'createdAt', headerName: 'Creado', width: 150,
      valueFormatter: (value) => value ? new Date(value).toLocaleString('es-CL') : '—',
    },
    {
      field: 'actions', headerName: 'Acciones', width: 290, headerAlign: 'center', align: 'center', sortable: false,
      renderCell: (params) => {
        const bot: Bot = params.row;
        const isRunning  = bot.status === 'running';
        const isStopping = bot.status === 'stopping';
        const isCompleted = bot.status === 'completed';

        return (
          <Box sx={{ display: 'flex', gap: 0.75 }}>
            <Button variant="outlined" size="small" startIcon={<VisibilityIcon />}
              onClick={() => handleViewLogs(bot.id)} sx={{ textTransform: 'none', borderRadius: 2, minWidth: 0, px: 1.5 }}>
              Logs
            </Button>
            {!isRunning && !isStopping && !isCompleted && (
              <Button variant="contained" size="small" startIcon={<PlayArrowIcon />}
                onClick={() => handleRunBot(bot.id)} disabled={!bot.isActive}
                sx={{ textTransform: 'none', borderRadius: 2, minWidth: 0, px: 1.5, bgcolor: '#1565c0' }}>
                Ejecutar
              </Button>
            )}
            {isCompleted && <Chip label="Completado" size="small" color="success" sx={{ fontWeight: 600 }} />}
            {(isRunning || isStopping) && (
              <Button variant="contained" size="small"
                startIcon={isStopping ? <CircularProgress size={14} color="inherit" /> : <StopIcon />}
                onClick={() => setStopDialog({ open: true, bot, stopping: false })} disabled={isStopping}
                sx={{ textTransform: 'none', borderRadius: 2, minWidth: 0, px: 1.5, bgcolor: '#e65100' }}>
                {isStopping ? 'Deteniendo' : 'Detener'}
              </Button>
            )}
            <Button variant="outlined" size="small" color="error" startIcon={<DeleteIcon />}
              onClick={() => setDeleteDialog({ open: true, bot, deleting: false })} disabled={isRunning || isStopping}
              sx={{ textTransform: 'none', borderRadius: 2, minWidth: 0, px: 1.5 }}>
              Eliminar
            </Button>
          </Box>
        );
      },
    },
  ];

  return (
    <Box sx={{ padding: 4, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <Paper elevation={3} sx={{ padding: 3, borderRadius: 2 }}>

        {/* ── Header ── */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 600, color: '#1976d2', mb: 0.5 }}>
              Gestión de Bots
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Administra, ejecuta y monitorea tus bots de scraping
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>

            {user && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1, bgcolor: '#f0f4ff', borderRadius: 2 }}>
                <Avatar src={user.avatarUrl} sx={{ width: 32, height: 32, bgcolor: '#1976d2', fontSize: '0.8rem' }}>
                  {user.name[0].toUpperCase()}
                </Avatar>
                <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>{user.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{user.email}</Typography>
                </Box>
                <Chip label="Admin" size="small" color="error" variant="outlined" sx={{ fontWeight: 600, fontSize: '0.7rem' }} />
                <IconButton size="small" onClick={logout} title="Cerrar sesión">
                  <LogoutIcon fontSize="small" />
                </IconButton>
              </Box>
            )}

            {/* ★ NUEVO: Gestión de Usuarios */}
            {isAdmin && (
              <Button
                variant="contained"
                startIcon={<PeopleIcon />}
                onClick={() => setUserMgmtOpen(true)}
                sx={{
                  textTransform: 'none', borderRadius: 2, px: 3,
                  background: 'linear-gradient(45deg, #dc2626 30%, #ef4444 90%)',
                  boxShadow: '0 3px 5px 2px rgba(220, 38, 38, .2)',
                }}
              >
                Gestión de Usuarios
              </Button>
            )}

            <Button variant="contained" color="secondary" startIcon={<TimelineIcon />}
              onClick={() => { setSelectedBotId(undefined); setLogDialogOpen(true); }}
              sx={{
                textTransform: 'none', borderRadius: 2, px: 3,
                background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                boxShadow: '0 3px 5px 2px rgba(102, 126, 234, .3)',
              }}>
              Logs en Tiempo Real
            </Button>

            <Button variant="contained" startIcon={<BarChartIcon />}
              onClick={() => router.push('/dashboards')}
              sx={{
                textTransform: 'none', borderRadius: 2, px: 3,
                background: 'linear-gradient(45deg, #1565c0 30%, #1976d2 90%)',
                boxShadow: '0 3px 5px 2px rgba(25, 118, 210, .3)',
              }}>
              Ver Dashboard
            </Button>

            <Button variant="contained" startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
              sx={{ textTransform: 'none', borderRadius: 2, px: 3 }}>
              Nuevo Bot
            </Button>
          </Box>
        </Box>

        {/* ── DataGrid ── */}
        <Box sx={{ height: 600, width: '100%' }}>
          <DataGrid rows={dataBots} columns={columns} loading={loading}
            pageSizeOptions={[10, 25, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            checkboxSelection disableRowSelectionOnClick
            sx={{
              border: 'none',
              '& .MuiDataGrid-cell': { borderBottom: '1px solid #f0f0f0' },
              '& .MuiDataGrid-columnHeaders': { backgroundColor: '#fafafa', borderBottom: '2px solid #e0e0e0', fontWeight: 600 },
              '& .MuiDataGrid-row:hover': { backgroundColor: '#f5f5f5' },
            }} />
        </Box>
      </Paper>

      {/* ── Dialogs ── */}
      <Dialog open={stopDialog.open}
        onClose={() => !stopDialog.stopping && setStopDialog({ open: false, bot: null, stopping: false })}
        maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#e65100', color: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><StopIcon /> Detener Bot</Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <DialogContentText>
            ¿Detener el bot <strong>"{stopDialog.bot?.name}"</strong>? Finalizará al completar su iteración actual.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setStopDialog({ open: false, bot: null, stopping: false })} disabled={stopDialog.stopping} color="inherit">Cancelar</Button>
          <Button variant="contained" color="warning" onClick={handleStopConfirm} disabled={stopDialog.stopping}
            startIcon={stopDialog.stopping ? <CircularProgress size={18} color="inherit" /> : <StopIcon />}>
            {stopDialog.stopping ? 'Deteniendo...' : 'Sí, detener'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialog.open}
        onClose={() => !deleteDialog.deleting && setDeleteDialog({ open: false, bot: null, deleting: false })}
        maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#d32f2f', color: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><DeleteIcon /> Eliminar Bot</Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <DialogContentText>
            ¿Eliminar permanentemente <strong>"{deleteDialog.bot?.name}"</strong>? Las propiedades ya scrapeadas se conservan.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setDeleteDialog({ open: false, bot: null, deleting: false })} disabled={deleteDialog.deleting} color="inherit">Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleDeleteConfirm} disabled={deleteDialog.deleting}
            startIcon={deleteDialog.deleting ? <CircularProgress size={18} color="inherit" /> : <DeleteIcon />}>
            {deleteDialog.deleting ? 'Eliminando...' : 'Sí, eliminar'}
          </Button>
        </DialogActions>
      </Dialog>

      <BotLogDialog open={logDialogOpen}
        onClose={() => { setLogDialogOpen(false); setTimeout(() => setSelectedBotId(undefined), 300); }}
        autoConnect botId={selectedBotId} />

      <CreateBotDialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} onBotCreated={fetchBots} />

      {/* ★ NUEVO: Dialog de gestión de usuarios */}
      <UserManagementDialog open={userMgmtOpen} onClose={() => setUserMgmtOpen(false)} />

      <style jsx global>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
      `}</style>
    </Box>
  );
}