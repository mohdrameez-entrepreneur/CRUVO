import { useEffect, useRef, useCallback, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { WS_BASE } from '../config';

export default function useRideLobby(rideId, { onReadyUpdate, onRideStarted }) {
  const ws = useRef(null);
  const reconnectTimer = useRef(null);
  const reconnectDelay = useRef(1000);
  const [connected, setConnected] = useState(false);
  const mountedRef = useRef(true);
  const genRef = useRef(0);
  const stoppedRef = useRef(false);
  const listenersRef = useRef({ onReadyUpdate, onRideStarted });

  listenersRef.current = { onReadyUpdate, onRideStarted };

  const connect = useCallback(async () => {
    if (!rideId || stoppedRef.current) return;
    const gen = ++genRef.current;
    if (!mountedRef.current || gen !== genRef.current) return;

    const token = await SecureStore.getItemAsync('auth_token');
    if (!token || !mountedRef.current || gen !== genRef.current) return;

    if (ws.current) {
      try { ws.current.close(); } catch {}
      ws.current = null;
    }

    const url = `${WS_BASE}/ride/${rideId}/?token=${token}`;
    console.log('[WS-Lobby] Connecting to', url.replace(token, '***'));
    const socket = new WebSocket(url);
    if (gen !== genRef.current) { try { socket.close(); } catch {} return; }
    ws.current = socket;

    socket.onopen = () => {
      if (gen !== genRef.current) { try { socket.close(); } catch {} return; }
      console.log('[WS-Lobby] Connected');
      setConnected(true);
      reconnectDelay.current = 1000;
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
    };

    socket.onmessage = (event) => {
      if (gen !== genRef.current) return;
      try {
        const data = JSON.parse(event.data);
        console.log('[WS-Lobby] Received:', data.type);
        if (data.type === 'ready_update') {
          listenersRef.current.onReadyUpdate?.(data);
        } else if (data.type === 'ride_started') {
          stoppedRef.current = true;
          listenersRef.current.onRideStarted?.(data);
        }
      } catch (err) {
        console.log('[WS-Lobby] Parse error:', err.message);
      }
    };

    socket.onclose = (event) => {
      console.log('[WS-Lobby] Disconnected, code:', event.code);
      setConnected(false);
      if (gen !== genRef.current || stoppedRef.current) return;
      ws.current = null;
      if (event.code === 4001 || event.code === 4003) {
        console.log('[WS-Lobby] Auth rejected, not reconnecting');
        return;
      }
      if (mountedRef.current && event.code !== 1000) {
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
    stoppedRef.current = false;
    connect();
    return () => {
      mountedRef.current = false;
      stoppedRef.current = true;
      genRef.current++;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (ws.current) {
        try { ws.current.close(1000); } catch {}
        ws.current = null;
      }
    };
  }, [connect]);

  return { connected };
}
