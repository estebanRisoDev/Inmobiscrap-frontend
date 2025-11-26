'use client';

import { Box, Paper, Typography, Card, CardContent } from '@mui/material';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

export default function Dashboard() {
  const executionData = [
    { mes: 'Ene', exitosas: 45, fallidas: 5 },
    { mes: 'Feb', exitosas: 52, fallidas: 3 },
    { mes: 'Mar', exitosas: 61, fallidas: 4 },
    { mes: 'Abr', exitosas: 58, fallidas: 6 },
    { mes: 'May', exitosas: 70, fallidas: 2 },
    { mes: 'Jun', exitosas: 75, fallidas: 5 },
  ];

  const propertySourceData = [
    { name: 'Portal Inmobiliario', value: 450 },
    { name: 'Yapo', value: 320 },
    { name: 'Toctoc', value: 280 },
    { name: 'Mercado Libre', value: 150 },
  ];

  const botStatusData = [
    { name: 'Activos', value: 12 },
    { name: 'Inactivos', value: 3 },
  ];

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
          Monitoreo y análisis de bots inmobiliarios
        </Typography>
      </Box>

      {/* Tarjetas de estadísticas */}
      <Box sx={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 3,
        marginBottom: 4
      }}>
        <StatCard title="Total de Propiedades" value="1,200" color="#1976d2" />
        <StatCard title="Bots Activos" value="12" color="#2e7d32" />
        <StatCard title="Ejecuciones Exitosas" value="389" color="#4caf50" />
        <StatCard title="Errores" value="25" color="#f44336" />
      </Box>

      {/* Gráficos principales */}
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

      {/* Gráfico de barras */}
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