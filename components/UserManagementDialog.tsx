'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, IconButton, Box, Typography,
  TextField, Select, MenuItem, FormControl, InputLabel, Chip,
  Button, CircularProgress, Alert, Avatar, Paper, InputAdornment,
  Tooltip, Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PersonIcon from '@mui/icons-material/Person';
import StarIcon from '@mui/icons-material/Star';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import axios from 'axios';
import { authHeaders } from '@/lib/auth';

const API_BASE_URL = 'http://localhost:5000';

interface UserItem {
  id: number;
  name: string;
  email: string;
  avatarUrl?: string;
  role: string;
  plan: string;
  credits: number;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  botCount: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function UserManagementDialog({ open, onClose }: Props) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterPlan, setFilterPlan] = useState('');

  // Editing state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<{ role: string; plan: string; credits: number; isActive: boolean }>({
    role: 'user', plan: 'base', credits: 0, isActive: true,
  });
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (filterRole) params.role = filterRole;
      if (filterPlan) params.plan = filterPlan;

      const { data } = await axios.get(`${API_BASE_URL}/api/admin/users`, {
        params,
        headers: authHeaders(),
      });
      setUsers(data);
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('No tienes permisos de administrador.');
      } else {
        setError('Error al cargar usuarios.');
      }
    } finally {
      setLoading(false);
    }
  }, [search, filterRole, filterPlan]);

  useEffect(() => {
    if (open) fetchUsers();
  }, [open, fetchUsers]);

  const startEdit = (user: UserItem) => {
    setEditingId(user.id);
    setEditData({
      role: user.role,
      plan: user.plan,
      credits: user.credits,
      isActive: user.isActive,
    });
    setSuccess(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (userId: number) => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const { data } = await axios.patch(
        `${API_BASE_URL}/api/admin/users/${userId}`,
        {
          role: editData.role,
          plan: editData.plan,
          credits: editData.credits,
          isActive: editData.isActive,
        },
        { headers: authHeaders() }
      );
      setSuccess(data.message);
      setEditingId(null);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al actualizar usuario.');
    } finally {
      setSaving(false);
    }
  };

  const getRoleChip = (role: string) => {
    if (role === 'admin') {
      return <Chip icon={<AdminPanelSettingsIcon />} label="Admin" size="small" color="error" variant="outlined" sx={{ fontWeight: 600 }} />;
    }
    return <Chip icon={<PersonIcon />} label="User" size="small" variant="outlined" sx={{ fontWeight: 600 }} />;
  };

  const getPlanChip = (plan: string) => {
    if (plan === 'pro') {
      return <Chip icon={<StarIcon />} label="Pro" size="small" sx={{ bgcolor: '#fef3c7', color: '#92400e', fontWeight: 600, border: '1px solid #fbbf24' }} />;
    }
    return <Chip label="Base" size="small" variant="outlined" sx={{ fontWeight: 600 }} />;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth
      PaperProps={{ sx: { height: '85vh', maxHeight: '85vh' } }}>

      <DialogTitle sx={{ bgcolor: '#1e293b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AdminPanelSettingsIcon />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Gestión de Usuarios</Typography>
          <Chip label={`${users.length} usuarios`} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white' }} />
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>

        {/* ── Filtros ── */}
        <Box sx={{ p: 2, borderBottom: '1px solid #e5e7eb', display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 250 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
            }}
          />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Rol</InputLabel>
            <Select value={filterRole} label="Rol" onChange={(e) => setFilterRole(e.target.value)}>
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="user">User</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Plan</InputLabel>
            <Select value={filterPlan} label="Plan" onChange={(e) => setFilterPlan(e.target.value)}>
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="pro">Pro</MenuItem>
              <MenuItem value="base">Base</MenuItem>
            </Select>
          </FormControl>
          <Button variant="outlined" size="small" onClick={fetchUsers} disabled={loading} sx={{ textTransform: 'none' }}>
            {loading ? <CircularProgress size={16} /> : 'Buscar'}
          </Button>
        </Box>

        {error && <Alert severity="error" sx={{ mx: 2, mt: 1 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mx: 2, mt: 1 }}>{success}</Alert>}

        {/* ── Lista de usuarios ── */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          {loading && users.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : users.length === 0 ? (
            <Typography sx={{ textAlign: 'center', py: 8, color: '#9ca3af' }}>
              No se encontraron usuarios
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {users.map((user) => {
                const isEditing = editingId === user.id;

                return (
                  <Paper
                    key={user.id}
                    elevation={0}
                    sx={{
                      p: 2,
                      border: '1px solid #e5e7eb',
                      borderRadius: 2,
                      bgcolor: !user.isActive ? '#fef2f2' : isEditing ? '#f0f9ff' : 'white',
                      transition: 'all 0.15s',
                      '&:hover': { borderColor: '#93c5fd' },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                      {/* Avatar + Info */}
                      <Avatar src={user.avatarUrl} sx={{ width: 40, height: 40, bgcolor: '#3b82f6', fontSize: '0.9rem' }}>
                        {user.name[0]?.toUpperCase()}
                      </Avatar>

                      <Box sx={{ flex: 1, minWidth: 200 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>{user.name}</Typography>
                          {!user.isActive && (
                            <Chip icon={<BlockIcon />} label="Inactivo" size="small" color="error" />
                          )}
                        </Box>
                        <Typography variant="caption" sx={{ color: '#6b7280' }}>{user.email}</Typography>
                      </Box>

                      {/* Chips de estado (modo lectura) */}
                      {!isEditing && (
                        <>
                          {getRoleChip(user.role)}
                          {getPlanChip(user.plan)}
                          {user.plan === 'base' && (
                            <Chip label={`${user.credits} créditos`} size="small" variant="outlined"
                              sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }} />
                          )}
                          <Tooltip title={`${user.botCount} bot(s)`}>
                            <Chip icon={<SmartToyIcon />} label={user.botCount} size="small" variant="outlined" />
                          </Tooltip>
                          <Typography variant="caption" sx={{ color: '#9ca3af', ml: 'auto' }}>
                            {user.lastLogin
                              ? `Último login: ${new Date(user.lastLogin).toLocaleDateString('es-CL')}`
                              : 'Sin login'}
                          </Typography>
                          <IconButton size="small" onClick={() => startEdit(user)} title="Editar">
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </>
                      )}

                      {/* Modo edición */}
                      {isEditing && (
                        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
                          <FormControl size="small" sx={{ minWidth: 110 }}>
                            <InputLabel>Rol</InputLabel>
                            <Select value={editData.role} label="Rol"
                              onChange={(e) => setEditData((p) => ({ ...p, role: e.target.value }))}>
                              <MenuItem value="user">User</MenuItem>
                              <MenuItem value="admin">Admin</MenuItem>
                            </Select>
                          </FormControl>

                          <FormControl size="small" sx={{ minWidth: 110 }}>
                            <InputLabel>Plan</InputLabel>
                            <Select value={editData.plan} label="Plan"
                              onChange={(e) => setEditData((p) => ({ ...p, plan: e.target.value }))}>
                              <MenuItem value="base">Base</MenuItem>
                              <MenuItem value="pro">Pro</MenuItem>
                            </Select>
                          </FormControl>

                          {editData.plan === 'base' && (
                            <TextField
                              size="small" type="number" label="Créditos"
                              value={editData.credits}
                              onChange={(e) => setEditData((p) => ({ ...p, credits: parseInt(e.target.value) || 0 }))}
                              sx={{ width: 100 }}
                            />
                          )}

                          <FormControl size="small" sx={{ minWidth: 110 }}>
                            <InputLabel>Estado</InputLabel>
                            <Select
                              value={editData.isActive ? 'active' : 'inactive'}
                              label="Estado"
                              onChange={(e) => setEditData((p) => ({ ...p, isActive: e.target.value === 'active' }))}
                            >
                              <MenuItem value="active">Activo</MenuItem>
                              <MenuItem value="inactive">Inactivo</MenuItem>
                            </Select>
                          </FormControl>

                          <Button
                            variant="contained" size="small"
                            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
                            onClick={() => saveEdit(user.id)}
                            disabled={saving}
                            sx={{ textTransform: 'none', bgcolor: '#2563eb' }}
                          >
                            Guardar
                          </Button>
                          <Button
                            variant="outlined" size="small"
                            startIcon={<CancelIcon />}
                            onClick={cancelEdit}
                            disabled={saving}
                            sx={{ textTransform: 'none' }}
                          >
                            Cancelar
                          </Button>
                        </Box>
                      )}
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}

export default UserManagementDialog;