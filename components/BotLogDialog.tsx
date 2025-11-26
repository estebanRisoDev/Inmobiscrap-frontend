// Dialog mejorado con soporte para botId y cleanup correcto

'use client';

import React, { useEffect, useRef } from 'react';
import { Dialog, DialogTitle, DialogContent, IconButton, Box } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { BotLogViewer } from './BotLogViewer';

interface BotLogDialogProps {
  open: boolean;
  onClose: () => void;
  autoConnect?: boolean;
  botId?: number; // NUEVO: para auto-suscribirse a un bot específico
}

export function BotLogDialog({
  open,
  onClose,
  autoConnect = true,
  botId,
}: BotLogDialogProps) {
  const viewerKeyRef = useRef(0);

  // NUEVO: Reiniciar el componente cuando se abre con un nuevo botId
  useEffect(() => {
    if (open) {
      viewerKeyRef.current += 1;
    }
  }, [open, botId]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          height: '90vh',
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2, bgcolor: '#f5f5f5' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>📡 Logger en Tiempo Real</span>
          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{ color: (theme) => theme.palette.grey[500] }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
        {/* Key fuerza re-render del componente cuando cambia botId */}
        <BotLogViewer 
          key={viewerKeyRef.current}
          autoConnect={autoConnect} 
          botId={botId}
          hubUrl="http://localhost:5000/hubs/botlogs"
        />
      </DialogContent>
    </Dialog>
  );
}

export default BotLogDialog;