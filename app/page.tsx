'use client';

import { Button, Box, Typography, Paper, Chip } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import TimelineIcon from '@mui/icons-material/Timeline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BotLogDialog } from '@/components/BotLogDialog';

export default function Home() {
  const [dataBots, setDataBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [selectedBotId, setSelectedBotId] = useState<number | undefined>(undefined);
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await axios.get('http://localhost:5000/api/bots');
        setDataBots(response.data);
      } catch (error) {
        console.error('Error fetching bots:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

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
      field: 'url', 
      headerName: 'URL', 
      width: 300,
      flex: 1
    },
    { 
      field: 'createdAt', 
      headerName: 'Fecha de Creación', 
      width: 180,
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
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          {/* NUEVO: Botón para ver logs sin ejecutar */}
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
            Ver Logs
          </Button>
          <Button 
            variant="contained" 
            size="small"
            startIcon={<PlayArrowIcon />}
            onClick={() => handleRunBot(params.row.id)}
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

  // NUEVO: Handler para ver logs sin ejecutar
  const handleViewLogs = (botId: number) => {
    setSelectedBotId(botId);
    setLogDialogOpen(true);
  };

  const handleRunBot = async (botId: number) => {
    try {
      const response = await axios.post(`http://localhost:5000/api/bots/${botId}/run`);
      alert(response.data.message);
      
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

  // NUEVO: Handler para abrir logs generales (sin botId específico)
  const handleOpenGeneralLogs = () => {
    setSelectedBotId(undefined);
    setLogDialogOpen(true);
  };

  // NUEVO: Handler para cerrar y limpiar el botId seleccionado
  const handleCloseDialog = () => {
    setLogDialogOpen(false);
    // Pequeño delay antes de limpiar el botId para evitar glitches visuales
    setTimeout(() => setSelectedBotId(undefined), 300);
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
            marginBottom: 3
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
          
          <Box sx={{ display: 'flex', gap: 2 }}>
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
              onClick={() => console.log('Crear nuevo bot')}
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

      {/* Dialog de logs en tiempo real - MEJORADO */}
      <BotLogDialog
        open={logDialogOpen}
        onClose={handleCloseDialog}
        autoConnect={true}
        botId={selectedBotId} // Pasa el botId seleccionado o undefined
      />
    </Box>
  );
}