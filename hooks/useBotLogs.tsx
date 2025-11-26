// Hook mejorado con filtrado estricto y soporte para Dashboard Global

import { useState, useEffect, useCallback, useRef } from 'react';
import * as signalR from '@microsoft/signalr';

export interface BotLog {
  level: 'Info' | 'Success' | 'Warning' | 'Error' | 'Debug';
  message: string;
  timestamp: string;
  botId?: number;
  botName?: string;
}

export interface BotProgress {
  botId: number;
  botName: string;
  current: number;
  total: number;
  percentage: number;
  message: string;
  timestamp: string;
}

interface UseBotLogsOptions {
  hubUrl?: string;
  autoConnect?: boolean;
  maxLogs?: number;
  botId?: number; // Si es undefined/null, actúa como Global Dashboard
}

interface UseBotLogsReturn {
  logs: BotLog[];
  progress: BotProgress | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  clearLogs: () => void;
  stats: {
    total: number;
    errors: number;
    warnings: number;
    successes: number;
  };
}

export function useBotLogs(options: UseBotLogsOptions = {}): UseBotLogsReturn {
  const {
    hubUrl = 'http://localhost:5000/hubs/botlogs',
    autoConnect = false,
    maxLogs = 200,
    botId, 
  } = options;

  const [logs, setLogs] = useState<BotLog[]>([]);
  const [progress, setProgress] = useState<BotProgress | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const isCleaningUpRef = useRef(false);

  const connect = useCallback(async () => {
    if (isCleaningUpRef.current) return;
    
    // Si ya existe conexión, solo revisamos suscripción
    if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
        console.log('Already connected, resubscribing...');
        await connectionRef.current.invoke('SubscribeToBot', botId || null);
        return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const connection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl, {
          skipNegotiation: false,
          transport: signalR.HttpTransportType.WebSockets | 
                     signalR.HttpTransportType.ServerSentEvents | 
                     signalR.HttpTransportType.LongPolling,
        })
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.Warning)
        .build();

      // --- EVENT HANDLERS CON FILTRO DE SEGURIDAD ---

      connection.on('ReceiveLogMessage', (log: BotLog) => {
        // FILTRO: Si estamos viendo un bot específico, ignorar logs de otros bots.
        // Si botId es undefined (Global), permitimos todo.
        if (botId && log.botId && log.botId !== botId) {
            return;
        }

        setLogs((prevLogs) => {
          const newLogs = [...prevLogs, log];
          return newLogs.length > maxLogs 
            ? newLogs.slice(newLogs.length - maxLogs) 
            : newLogs;
        });
      });

      connection.on('ReceiveProgress', (progressData: BotProgress) => {
        // FILTRO: Mismo filtro para el progreso
        if (botId && progressData.botId !== botId) {
            return;
        }
        setProgress(progressData);
      });

      connection.onreconnecting(() => {
        console.log('Reconnecting...');
        setIsConnected(false);
        setError('Reconectando...');
      });

      connection.onreconnected((connectionId) => {
        console.log('Reconnected!', connectionId);
        setIsConnected(true);
        setError(null);
        // Re-suscribirse tras reconexión de red
        connection.invoke('SubscribeToBot', botId || null).catch(console.error);
      });

      connection.onclose((error) => {
        console.log('Connection closed', error);
        setIsConnected(false);
        if (!isCleaningUpRef.current) {
          setError(error?.message || 'Conexión cerrada');
        }
      });

      await connection.start();
      
      connectionRef.current = connection;
      setIsConnected(true);
      setIsConnecting(false);
      
      // SUSCRIPCIÓN INICIAL: 
      // Si botId es undefined/null, el backend lo interpretará como Dashboard Global
      console.log(`Subscribing to: ${botId ? `Bot ${botId}` : 'Global Dashboard'}`);
      await connection.invoke('SubscribeToBot', botId || null);
      
    } catch (err) {
      console.error('Error connecting to SignalR:', err);
      setError(err instanceof Error ? err.message : 'Conexión fallida');
      setIsConnecting(false);
      setIsConnected(false);
    }
  }, [hubUrl, maxLogs, botId]);

  const disconnect = useCallback(() => {
    if (connectionRef.current) {
      isCleaningUpRef.current = true;
      connectionRef.current.off('ReceiveLogMessage');
      connectionRef.current.off('ReceiveProgress');
      
      connectionRef.current.stop()
        .then(() => {
          console.log('Disconnected successfully');
          connectionRef.current = null;
          setIsConnected(false);
          setProgress(null);
          setError(null);
        })
        .catch(console.error)
        .finally(() => {
          isCleaningUpRef.current = false;
        });
    }
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
    setProgress(null);
  }, []);

  const stats = {
    total: logs.length,
    errors: logs.filter((log) => log.level === 'Error').length,
    warnings: logs.filter((log) => log.level === 'Warning').length,
    successes: logs.filter((log) => log.level === 'Success').length,
  };

  // Efecto para auto-connect
  useEffect(() => {
    if (autoConnect) {
        connect();
    }
    // Cleanup al desmontar o cambiar de bot
    return () => {
      disconnect();
    };
  }, [autoConnect, botId]); // IMPORTANTE: Reconectar si cambia el botId

  return {
    logs,
    progress,
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    clearLogs,
    stats,
  };
}