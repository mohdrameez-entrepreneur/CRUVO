import { useEffect, useRef, useCallback, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { WS_BASE } from '../config';

export default function useRideLobby(rideId, { onReadyUpdate, onRideStarted }) {
  const ws = useRef(null);
  const reconnectTimer = useRef(null);
  const reconnectDelay = useRef(1000);
  const [connected, setConnected] = useState(false);
  const mountedRef = useRef(true);
  const listenersRef = useRef({ onReadyUpdate, onRideStarted });

  listenersRef.current = { onReadyUpdate, onRideStarted };

  const connect = useCallback(async () => {
    if (!rideId || !mountedRef.current) return;
    const token = await SecureStore.getItemAsync('auth_token');
    if (!token) return;

    if (ws.current) {
      try { ws.current.close(); } catch {}
      ws.current = null;
    }

    const url = `${WS_BASE}/ride/${rideId}/?token=${token}`;
    console.log('[WS-Lobby] Connecting to', url.replace(token, '***'));
    const socket = new WebSocket(url);
    ws.current = socket;

    socket.onopen = () => {
      console.log('[WS-Lobby] Connected');
      setConnected(true);
      reconnectDelay.current = 1000;
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('[WS-Lobby] Received:', data.type);
      if (data.type === 'ready_update') {
        listenersRef.current.onReadyUpdate?.(data);
      } else if (data.type === 'ride_started') {
        listenersRef.current.onRideStarted?.(data);
      }
    };

    socket.onclose = () => {
      console.log('[WS-Lobby] Disconnected');
      setConnected(false);
      ws.current = null;
      if (mountedRef.current) {
        const delay = reconnectDelay.current;
        reconnectDelay.current = Math.min(reconnectDelay.current * 1.5, 5000);
        reconnectTimer.current = setTimeout(() => connect(), delay);
      }
    };

    socket.onerror = (error) => {
      console.log('[WS-Lobby] Error:', error.message || 'unknown');
      socket.close();
    };
  }, [rideId]);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (ws.current) {
        try { ws.current.close(); } catch {}
      }
    };
  }, [connect]);

  return { connected };
}
