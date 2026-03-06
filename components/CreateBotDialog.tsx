'use client';

import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, FormControl, InputLabel, Select, MenuItem,
  FormControlLabel, Switch, Box, Alert, CircularProgress,
  IconButton, Typography, Collapse, Chip,
} from '@mui/material';
import CloseIcon    from '@mui/icons-material/Close';
import SaveIcon     from '@mui/icons-material/Save';
import ScheduleIcon from '@mui/icons-material/Schedule';
import axios from 'axios';
import { authHeaders } from '@/lib/auth';
import { useAuth } from '@/context/AuthContext'; // ← AÑADIDO

const API_BASE_URL = 'http://localhost:5000';

const BOT_SOURCES = [
  { value: 'portalinmobiliario', label: 'Portal Inmobiliario' },
  { value: 'yapo',               label: 'Yapo'                },
  { value: 'toctoc',             label: 'TocToc'              },
  { value: 'mercadolibre',       label: 'Mercado Libre'       },
  { value: 'goplaceit',          label: 'GoPlaceIt'           },
  { value: 'icasas',             label: 'iCasas'              },
  { value: 'otro',               label: 'Otro'                },
];

const CRON_PRESETS = [
  { label: 'Cada hora',              value: '0 * * * *'    },
  { label: 'Cada 6 horas',           value: '0 */6 * * *'  },
  { label: 'Cada 12 horas',          value: '0 */12 * * *' },
  { label: 'Cada día a medianoche',  value: '0 0 * * *'    },
  { label: 'Cada día a las 6am',     value: '0 6 * * *'    },
  { label: 'Cada día a las 12pm',    value: '0 12 * * *'   },
  { label: 'Cada lunes a medianoche',value: '0 0 * * 1'    },
  { label: 'Personalizado',          value: 'custom'        },
];

interface CreateBotDialogProps {
  open: boolean;
  onClose: () => void;
  onBotCreated?: () => void;
}

interface BotFormData {
  name:            string;
  source:          string;
  url:             string;
  isActive:        boolean;
  scheduleEnabled: boolean;
  cronExpression:  string;
}

interface FormErrors {
  name?:           string;
  source?:         string;
  url?:            string;
  cronExpression?: string;
}

export function CreateBotDialog({ open, onClose, onBotCreated }: CreateBotDialogProps) {
  const { user } = useAuth(); // ← AÑADIDO: obtener usuario actual

  const [formData, setFormData] = useState<BotFormData>({
    name:            '',
    source:          '',
    url:             '',
    isActive:        true,
    scheduleEnabled: false,
    cronExpression:  '0 * * * *',
  });

  const [cronPreset,   setCronPreset]   = useState('0 * * * *');
  const [errors,       setErrors]       = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError,     setApiError]     = useState<string | null>(null);
  const [successMsg,   setSuccessMsg]   = useState<string | null>(null);

  const isValidCron = (expr: string): boolean => {
    const parts = expr.trim().split(/\s+/);
    if (parts.length !== 5) return false;
    return parts.every((p) => /^(\*|(\d+|\*)\/\d+|\d+(-\d+)?(,\d+(-\d+)?)*)$/.test(p));
  };

  const validateForm = (): boolean => {
    const errs: FormErrors = {};

    if (!formData.name.trim())         errs.name   = 'El nombre es requerido';
    else if (formData.name.length < 3) errs.name   = 'Mínimo 3 caracteres';
    if (!formData.source)              errs.source = 'Selecciona una fuente';
    if (!formData.url.trim())          errs.url    = 'La URL es requerida';
    else {
      try { new URL(formData.url); }
      catch { errs.url = 'URL inválida (ej: https://ejemplo.com)'; }
    }

    if (formData.scheduleEnabled) {
      if (!formData.cronExpression.trim())
        errs.cronExpression = 'Ingresa una expresión cron';
      else if (!isValidCron(formData.cronExpression))
        errs.cronExpression = 'Expresión inválida. Formato: * * * * * (min hora día mes díaSemana)';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (field: keyof BotFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { value: string } }) => {
      setFormData((p) => ({ ...p, [field]: (e as any).target.value }));
      setErrors((p) => ({ ...p, [field]: undefined }));
      setApiError(null);
    };

  const handleSourceChange = (e: { target: { value: string } }) => {
    const source = e.target.value;
    setFormData((p) => ({
      ...p,
      source,
      name: p.name || `Scraper ${BOT_SOURCES.find((s) => s.value === source)?.label ?? source}`,
    }));
    setErrors((p) => ({ ...p, source: undefined }));
  };

  const handlePresetChange = (e: { target: { value: string } }) => {
    const val = e.target.value;
    setCronPreset(val);
    if (val !== 'custom') {
      setFormData((p) => ({ ...p, cronExpression: val }));
      setErrors((p) => ({ ...p, cronExpression: undefined }));
    }
  };

  const resetForm = () => {
    setFormData({ name: '', source: '', url: '', isActive: true, scheduleEnabled: false, cronExpression: '0 * * * *' });
    setCronPreset('0 * * * *');
    setErrors({});
    setApiError(null);
    setSuccessMsg(null);
  };

  const handleClose = () => { if (!isSubmitting) { resetForm(); onClose(); } };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setApiError(null);
    setSuccessMsg(null);

    try {
      const payload = {
        name:            formData.name.trim(),
        source:          formData.source,
        url:             formData.url.trim(),
        isActive:        formData.isActive,
        scheduleEnabled: formData.scheduleEnabled,
        cronExpression:  formData.scheduleEnabled ? formData.cronExpression.trim() : null,
        // ↓ FIX: el backend requiere el userId en el body.
        // Lo ideal sería que el backend lo tome del JWT claim,
        // pero mientras tanto lo enviamos explícitamente.
        userId: user?.id,
      };

      const response = await axios.post(`${API_BASE_URL}/api/bots`, payload, {
        headers: authHeaders(),
      });

      setSuccessMsg(`Bot "${response.data.name}" creado exitosamente`);
      setTimeout(() => { resetForm(); onBotCreated?.(); onClose(); }, 1500);

    } catch (err: any) {
      // Mostrar errores de validación del backend de forma legible
      const data = err.response?.data;
      if (data?.errors) {
        // Formato ProblemDetails de ASP.NET: { errors: { Field: ["msg"] } }
        const messages = Object.entries(data.errors)
          .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(', ')}`)
          .join(' | ');
        setApiError(messages);
      } else {
        setApiError(
          data?.message ??
          (err.code === 'ERR_NETWORK' ? 'No se pudo conectar al servidor.' : 'Error al crear el bot.')
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCustomCron = cronPreset === 'custom';

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ m: 0, p: 2, bgcolor: '#1976d2', color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">🤖 Crear Nuevo Bot</Typography>
          <IconButton onClick={handleClose} disabled={isSubmitting} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 3 }}>
        {apiError   && <Alert severity="error"   sx={{ mb: 2 }}>{apiError}</Alert>}
        {successMsg && <Alert severity="success" sx={{ mb: 2 }}>{successMsg}</Alert>}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

          <FormControl fullWidth error={!!errors.source}>
            <InputLabel>Fuente *</InputLabel>
            <Select value={formData.source} label="Fuente *" onChange={handleSourceChange} disabled={isSubmitting}>
              {BOT_SOURCES.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
            </Select>
            {errors.source && <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>{errors.source}</Typography>}
          </FormControl>

          <TextField
            label="Nombre del Bot *"
            value={formData.name}
            onChange={handleChange('name')}
            error={!!errors.name}
            helperText={errors.name || 'Ej: Scraper Portal Inmobiliario Santiago'}
            fullWidth disabled={isSubmitting}
            inputProps={{ maxLength: 200 }}
          />

          <TextField
            label="URL a Scrapear *"
            value={formData.url}
            onChange={handleChange('url')}
            error={!!errors.url}
            helperText={errors.url || 'URL de la página de listados'}
            fullWidth disabled={isSubmitting}
            placeholder="https://www.portalinmobiliario.com/venta/..."
            inputProps={{ maxLength: 2000 }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={formData.isActive}
                onChange={(e) => setFormData((p) => ({ ...p, isActive: e.target.checked }))}
                disabled={isSubmitting}
                color="success"
              />
            }
            label={
              <Box>
                <Typography variant="body1">{formData.isActive ? 'Bot Activo' : 'Bot Inactivo'}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {formData.isActive ? 'Puede ejecutarse manual o automáticamente' : 'No se ejecutará hasta activarlo'}
                </Typography>
              </Box>
            }
          />

          <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 2, p: 2, bgcolor: '#fafafa' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.scheduleEnabled}
                  onChange={(e) => setFormData((p) => ({ ...p, scheduleEnabled: e.target.checked }))}
                  disabled={isSubmitting}
                  color="primary"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ScheduleIcon fontSize="small" sx={{ color: formData.scheduleEnabled ? '#1976d2' : '#9e9e9e' }} />
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      Programar ejecución automática
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Usa expresiones cron para definir la frecuencia
                    </Typography>
                  </Box>
                </Box>
              }
            />

            <Collapse in={formData.scheduleEnabled}>
              <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Frecuencia</InputLabel>
                  <Select value={cronPreset} label="Frecuencia" onChange={handlePresetChange} disabled={isSubmitting}>
                    {CRON_PRESETS.map((p) => (
                      <MenuItem key={p.value} value={p.value}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: 2 }}>
                          <span>{p.label}</span>
                          {p.value !== 'custom' && (
                            <Chip label={p.value} size="small" sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }} />
                          )}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  label="Expresión Cron"
                  value={formData.cronExpression}
                  onChange={handleChange('cronExpression')}
                  error={!!errors.cronExpression}
                  helperText={errors.cronExpression || 'Formato: minuto hora día mes díaSemana'}
                  fullWidth size="small"
                  disabled={isSubmitting || !isCustomCron}
                  inputProps={{ style: { fontFamily: 'monospace' } }}
                  placeholder="0 * * * *"
                />

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {['* = cualquier valor', '*/n = cada n unidades', 'n = valor exacto'].map((t) => (
                    <Chip key={t} label={t} size="small" variant="outlined"
                      sx={{ fontSize: '0.7rem', color: 'text.secondary' }} />
                  ))}
                </Box>
              </Box>
            </Collapse>
          </Box>

        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={handleClose} disabled={isSubmitting} color="inherit">Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isSubmitting || !user}
          startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          sx={{ minWidth: 120 }}
        >
          {isSubmitting ? 'Creando...' : 'Crear Bot'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default CreateBotDialog;