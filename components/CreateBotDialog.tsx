'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Box,
  Alert,
  CircularProgress,
  IconButton,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import axios from 'axios';

const BOT_SOURCES = [
  { value: 'portalinmobiliario', label: 'Portal Inmobiliario' },
  { value: 'yapo', label: 'Yapo' },
  { value: 'toctoc', label: 'TocToc' },
  { value: 'mercadolibre', label: 'Mercado Libre' },
  { value: 'goplaceit', label: 'GoPlaceIt' },
  { value: 'icasas', label: 'iCasas' },
  { value: 'otro', label: 'Otro' },
];

interface CreateBotDialogProps {
  open: boolean;
  onClose: () => void;
  onBotCreated?: () => void;
}

interface BotFormData {
  name: string;
  source: string;
  url: string;
  isActive: boolean;
}

interface FormErrors {
  name?: string;
  source?: string;
  url?: string;
}

export function CreateBotDialog({ open, onClose, onBotCreated }: CreateBotDialogProps) {
  const [formData, setFormData] = useState<BotFormData>({
    name: '',
    source: '',
    url: '',
    isActive: true,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    } else if (formData.name.length < 3) {
      newErrors.name = 'El nombre debe tener al menos 3 caracteres';
    }

    if (!formData.source) {
      newErrors.source = 'Selecciona una fuente';
    }

    if (!formData.url.trim()) {
      newErrors.url = 'La URL es requerida';
    } else if (!isValidUrl(formData.url)) {
      newErrors.url = 'Ingresa una URL válida (ej: https://ejemplo.com)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleChange = (field: keyof BotFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { value: string } }
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    setApiError(null);
  };

  const handleSwitchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      isActive: event.target.checked,
    }));
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setApiError(null);
    setSuccessMessage(null);

    try {
      // ⚠️ Cambia el puerto si es necesario (5170 o 5000)
      const response = await axios.post('http://localhost:5000/api/bots', {
        name: formData.name.trim(),
        source: formData.source,
        url: formData.url.trim(),
        isActive: formData.isActive,
      });

      setSuccessMessage(`Bot "${response.data.name}" creado exitosamente`);
      
      setTimeout(() => {
        resetForm();
        onBotCreated?.();
        onClose();
      }, 1500);

    } catch (error: any) {
      console.error('Error creating bot:', error);
      
      if (error.response?.data?.message) {
        setApiError(error.response.data.message);
      } else if (error.response?.status === 400) {
        setApiError('Datos inválidos. Verifica los campos e intenta de nuevo.');
      } else if (error.code === 'ERR_NETWORK') {
        setApiError('No se pudo conectar al servidor. Verifica que el backend esté corriendo.');
      } else {
        setApiError('Error al crear el bot. Intenta de nuevo.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', source: '', url: '', isActive: true });
    setErrors({});
    setApiError(null);
    setSuccessMessage(null);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  };

  const handleSourceChange = (event: { target: { value: string } }) => {
    const source = event.target.value;
    setFormData((prev) => ({
      ...prev,
      source,
      name: prev.name || `Scraper ${BOT_SOURCES.find(s => s.value === source)?.label || source}`,
    }));
    if (errors.source) {
      setErrors((prev) => ({ ...prev, source: undefined }));
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ m: 0, p: 2, bgcolor: '#1976d2', color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" component="span">🤖 Crear Nuevo Bot</Typography>
          <IconButton aria-label="cerrar" onClick={handleClose} disabled={isSubmitting} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 3 }}>
        {apiError && <Alert severity="error" sx={{ mb: 2 }}>{apiError}</Alert>}
        {successMessage && <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <FormControl fullWidth error={!!errors.source}>
            <InputLabel id="source-label">Fuente *</InputLabel>
            <Select
              labelId="source-label"
              value={formData.source}
              label="Fuente *"
              onChange={handleSourceChange}
              disabled={isSubmitting}
            >
              {BOT_SOURCES.map((source) => (
                <MenuItem key={source.value} value={source.value}>
                  {source.label}
                </MenuItem>
              ))}
            </Select>
            {errors.source && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                {errors.source}
              </Typography>
            )}
          </FormControl>

          <TextField
            label="Nombre del Bot *"
            value={formData.name}
            onChange={handleChange('name')}
            error={!!errors.name}
            helperText={errors.name || 'Ej: Scraper Portal Inmobiliario Santiago'}
            fullWidth
            disabled={isSubmitting}
            inputProps={{ maxLength: 200 }}
          />

          <TextField
            label="URL a Scrapear *"
            value={formData.url}
            onChange={handleChange('url')}
            error={!!errors.url}
            helperText={errors.url || 'URL de la página de listados a scrapear'}
            fullWidth
            disabled={isSubmitting}
            placeholder="https://www.portalinmobiliario.com/venta/departamento/..."
            inputProps={{ maxLength: 2000 }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={formData.isActive}
                onChange={handleSwitchChange}
                disabled={isSubmitting}
                color="success"
              />
            }
            label={
              <Box>
                <Typography variant="body1">
                  {formData.isActive ? 'Bot Activo' : 'Bot Inactivo'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formData.isActive
                    ? 'El bot podrá ejecutarse manualmente o programadamente'
                    : 'El bot no se ejecutará hasta que lo actives'}
                </Typography>
              </Box>
            }
            sx={{ mt: 1 }}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={handleClose} disabled={isSubmitting} color="inherit">
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isSubmitting}
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