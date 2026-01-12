'use client';

import { Button, Box, Typography, Paper, Chip } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import TimelineIcon from '@mui/icons-material/Timeline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import axios from 'axios';
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BotLogDialog } from '@/components/BotLogDialog';
import { CreateBotDialog } from '@/components/CreateBotDialog';

// Configuración centralizada del API
const API_BASE_URL = 'http://localhost:5000';

export default function Home() {
  const [dataBots, setDataBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedBotId, setSelectedBotId] = useState<number | undefined>(undefined);
  const router = useRouter();

  // Función para cargar bots (reutilizable)
  const fetchBots = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/bots`);
      setDataBots(response.data);
    } catch (error) {
      console.error('Error fetching bots:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBots();
  }, [fetchBots]);

  const columns: GridColDef[] = [
    { 
      field: 'id', 
      headerName: 'ID', 
      width: 70,
      headerAlign: 'center',
      align: 'center'
    },
    { 
      field: 'name', 
      headerName: 'Nombre', 
      width: 250,
      flex: 1
    },
    { 
      field: 'source', 
      headerName: 'Fuente', 
      width: 150,
      renderCell: (params) => (
        <Chip 
          label={params.value || 'N/A'}
          size="small"
          variant="outlined"
          color="primary"
        />
      )
    },
    { 
      field: 'isActive', 
      headerName: 'Estado', 
      width: 130,
      renderCell: (params) => (
        <Chip 
          label={params.value ? 'Activo' : 'Inactivo'}
          color={params.value ? 'success' : 'default'}
          size="small"
        />
      )
    },
    { 
      field: 'status', 
      headerName: 'Ejecución', 
      width: 120,
      renderCell: (params) => {
        const statusColors: Record<string, 'default' | 'info' | 'success' | 'error' | 'warning'> = {
          'idle': 'default',
          'running': 'info',
          'completed': 'success',
          'error': 'error',
        };
        return (
          <Chip 
            label={params.value || 'idle'}
            color={statusColors[params.value] || 'default'}
            size="small"
            variant="outlined"
          />
        );
      }
    },
    { 
      field: 'totalScraped', 
      headerName: 'Total Scrapeado', 
      width: 130,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {params.value || 0}
        </Typography>
      )
    },
    { 
      field: 'url', 
      headerName: 'URL', 
      width: 250,
      flex: 1,
      renderCell: (params) => (
        <Typography 
          variant="body2" 
          sx={{ 
            overflow: 'hidden', 
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: 'text.secondary'
          }}
          title={params.value}
        >
          {params.value}
        </Typography>
      )
    },
    { 
      field: 'createdAt', 
      headerName: 'Creado', 
      width: 160,
      valueFormatter: (value) => {
        return new Date(value).toLocaleString('es-CL');
      }
    },
    {
      field: 'actions',
      headerName: 'Acciones',
      width: 220,
      headerAlign: 'center',
      align: 'center',
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button 
            variant="outlined" 
            size="small"
            startIcon={<VisibilityIcon />}
            onClick={() => handleViewLogs(params.row.id)}
            sx={{
              textTransform: 'none',
              borderRadius: 2
            }}
          >
            Logs
          </Button>
          <Button 
            variant="contained" 
            size="small"
            startIcon={<PlayArrowIcon />}
            onClick={() => handleRunBot(params.row.id)}
            disabled={!params.row.isActive || params.row.status === 'running'}
            sx={{
              textTransform: 'none',
              borderRadius: 2
            }}
          >
            Ejecutar
          </Button>
        </Box>
      )
    }
  ];

  // Handler para ver logs sin ejecutar
  const handleViewLogs = (botId: number) => {
    setSelectedBotId(botId);
    setLogDialogOpen(true);
  };

  const handleRunBot = async (botId: number) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/bots/${botId}/run`);
      
      // Refrescar la lista para ver el cambio de estado
      fetchBots();
      
      // Abrir automáticamente el logger con el botId específico
      setSelectedBotId(botId);
      setLogDialogOpen(true);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al ejecutar el bot');
    }
  };

  const handleGoToDashboard = () => {
    router.push('/dashboards');
  };

  // Handler para abrir logs generales (sin botId específico)
  const handleOpenGeneralLogs = () => {
    setSelectedBotId(undefined);
    setLogDialogOpen(true);
  };

  // Handler para cerrar dialog de logs
  const handleCloseLogDialog = () => {
    setLogDialogOpen(false);
    setTimeout(() => setSelectedBotId(undefined), 300);
  };

  // Handler para abrir dialog de crear bot
  const handleOpenCreateDialog = () => {
    setCreateDialogOpen(true);
  };

  // Handler para cerrar dialog de crear bot
  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
  };

  // Callback cuando se crea un bot exitosamente
  const handleBotCreated = () => {
    fetchBots(); // Refrescar la tabla
  };

  return (
    <Box 
      sx={{ 
        padding: 4,
        backgroundColor: '#f5f5f5',
        minHeight: '100vh'
      }}
    >
      <Paper 
        elevation={3} 
        sx={{ 
          padding: 3,
          borderRadius: 2
        }}
      >
        {/* Header */}
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: 3,
            flexWrap: 'wrap',
            gap: 2
          }}
        >
          <Box>
            <Typography 
              variant="h4" 
              component="h1" 
              sx={{ 
                fontWeight: 600,
                color: '#1976d2',
                marginBottom: 1
              }}
            >
              Gestión de Bots
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Administra y ejecuta tus bots de scraping
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {/* Botón para ver logs generales (todos los bots) */}
            <Button
              variant="contained"
              color="secondary"
              startIcon={<TimelineIcon />}
              onClick={handleOpenGeneralLogs}
              sx={{
                textTransform: 'none',
                borderRadius: 2,
                paddingX: 3,
                background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                boxShadow: '0 3px 5px 2px rgba(102, 126, 234, .3)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #5568d3 30%, #653a8b 90%)',
                }
              }}
            >
              Ver Logs en Tiempo Real
            </Button>

            <Button
              variant="outlined"
              onClick={handleGoToDashboard}
              sx={{
                textTransform: 'none',
                borderRadius: 2,
                paddingX: 3
              }}
            >
              Ver Dashboard
            </Button>
            
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreateDialog}
              sx={{
                textTransform: 'none',
                borderRadius: 2,
                paddingX: 3
              }}
            >
              Nuevo Bot
            </Button>
          </Box>
        </Box>

        {/* DataGrid */}
        <Box sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={dataBots}
            columns={columns}
            loading={loading}
            pageSizeOptions={[5, 10, 25, 50]}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
            }}
            checkboxSelection
            disableRowSelectionOnClick
            sx={{
              border: 'none',
              '& .MuiDataGrid-cell': {
                borderBottom: '1px solid #f0f0f0',
              },
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: '#fafafa',
                borderBottom: '2px solid #e0e0e0',
                fontWeight: 600
              },
              '& .MuiDataGrid-row:hover': {
                backgroundColor: '#f5f5f5',
              }
            }}
          />
        </Box>
      </Paper>

      {/* Dialog de logs en tiempo real */}
      <BotLogDialog
        open={logDialogOpen}
        onClose={handleCloseLogDialog}
        autoConnect={true}
        botId={selectedBotId}
      />

      {/* Dialog para crear nuevo bot */}
      <CreateBotDialog
        open={createDialogOpen}
        onClose={handleCloseCreateDialog}
        onBotCreated={handleBotCreated}
      />
    </Box>
  );
}