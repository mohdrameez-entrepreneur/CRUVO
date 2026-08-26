import { useEffect, useRef, useCallback, useState } from 'react';
import { AppState } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { WS_BASE } from '../config';

const HEARTBEAT_INTERVAL_MS = 15000;

export default function useRideLobby(rideId, { onReadyUpdate, onRideStarted }) {
  const ws = useRef(null);
  const reconnectTimer = useRef(null);
  const heartbeatTimer = useRef(null);
  const reconnectDelay = useRef(1000);
  const [connected, setConnected] = useState(false);
  const mountedRef = useRef(true);
  const genRef = useRef(0);
  const stoppedRef = useRef(false);
  const listenersRef = useRef({ onReadyUpdate, onRideStarted });

  listenersRef.current = { onReadyUpdate, onRideStarted };

  const startHeartbeat = useCallback(() => {
    if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
    heartbeatTimer.current = setInterval(() => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        try {
          ws.current.send(JSON.stringify({ type: 'ping' }));
        } catch {}
      }
    }, HEARTBEAT_INTERVAL_MS);
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current);
      heartbeatTimer.current = null;
    }
  }, []);

  const connect = useCallback(async () => {
    if (!rideId || stoppedRef.current) return;
    const gen = ++genRef.current;
    if (!mountedRef.current || gen !== genRef.current) return;

    if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

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
      startHeartbeat();
    };

    socket.onmessage = (event) => {
      if (gen !== genRef.current) return;
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'pong') return;

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
      stopHeartbeat();
      if (gen !== genRef.current || stoppedRef.current) return;
      ws.current = null;
      if (event.code === 4001 || event.code === 4003) {
        console.log('[WS-Lobby] Auth rejected, not reconnecting');
        return;
      }
      if (mountedRef.current && event.code !== 1000) {
        const delay = reconnectDelay.current;
        reconnectDelay.current = Math.min(reconnectDelay.current * 1.5, 4000);
        if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
        reconnectTimer.current = setTimeout(() => {
          if (mountedRef.current && !stoppedRef.current) connect();
        }, delay);
      }
    };

    socket.onerror = (error) => {
      console.log('[WS-Lobby] Error:', error.message || 'unknown');
    };
  }, [rideId, startHeartbeat, stopHeartbeat]);

  useEffect(() => {
    mountedRef.current = true;
    stoppedRef.current = false;
    connect();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && mountedRef.current && !stoppedRef.current) {
        if (!ws.current || ws.current.readyState === WebSocket.CLOSED || ws.current.readyState === WebSocket.CLOSING) {
          console.log('[WS-Lobby] App foregrounded, checking connection...');
          connect();
        }
      }
    });

    return () => {
      mountedRef.current = false;
      stoppedRef.current = true;
      genRef.current++;
      sub.remove();
      stopHeartbeat();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (ws.current) {
        try { ws.current.close(1000); } catch {}
        ws.current = null;
      }
    };
  }, [connect, stopHeartbeat]);

  return { connected };
}
