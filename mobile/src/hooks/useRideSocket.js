import { useEffect, useRef, useCallback, useState } from 'react';
import { AppState } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { WS_BASE } from '../config';

const AUTH_CLOSE_CODES = [4001, 4003];
const HEARTBEAT_INTERVAL_MS = 15000; // Keepalive ping every 15 seconds

export default function useRideSocket(rideId, { onPositionsUpdate, onFlag, onFlagCleared, onFlagNotification, onClearFlagNotification, onRideEnded }) {
  const ws = useRef(null);
  const reconnectTimer = useRef(null);
  const heartbeatTimer = useRef(null);
  const reconnectDelay = useRef(1000);
  const [connected, setConnected] = useState(false);
  const [wsError, setWsError] = useState(null);
  const mountedRef = useRef(true);
  const genRef = useRef(0);
  const listenersRef = useRef({ onPositionsUpdate, onFlag, onFlagCleared, onFlagNotification, onClearFlagNotification, onRideEnded });

  listenersRef.current = { onPositionsUpdate, onFlag, onFlagCleared, onFlagNotification, onClearFlagNotification, onRideEnded };

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
    if (!rideId) return;
    const gen = ++genRef.current;
    if (!mountedRef.current || gen !== genRef.current) return;

    // Avoid duplicate connection if already active
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
    console.log('[WS] Connecting to', `${WS_BASE}/ride/${rideId}/`);
    const socket = new WebSocket(url);
    if (gen !== genRef.current) { try { socket.close(); } catch {} return; }
    ws.current = socket;

    socket.onopen = () => {
      if (gen !== genRef.current) { try { socket.close(); } catch {} return; }
      console.log('[WS] Connected');
      setConnected(true);
      setWsError(null);
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
        if (data.type === 'pong') return; // Ignore heartbeat responses

        if (data.type === 'positions_init') {
          listenersRef.current.onPositionsUpdate?.(data.positions);
        } else if (data.type === 'position') {
          listenersRef.current.onPositionsUpdate?.((prev) => {
            const idx = prev.findIndex(p => p.user === data.position.user);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = data.position;
              return next;
            }
            return [...prev, data.position];
          });
        } else if (data.type === 'flag') {
          listenersRef.current.onFlag?.(data.flag);
        } else if (data.type === 'clear_flag') {
          listenersRef.current.onFlagCleared?.(data.user_id);
        } else if (data.type === 'flag_notification') {
          listenersRef.current.onFlagNotification?.(data);
        } else if (data.type === 'clear_flag_notification') {
          listenersRef.current.onClearFlagNotification?.(data);
        } else if (data.type === 'ride_ended') {
          listenersRef.current.onRideEnded?.(data);
        }
      } catch (err) {
        console.log('[WS] Parse error:', err.message);
      }
    };

    socket.onclose = (event) => {
      console.log('[WS] Disconnected, code:', event.code, 'reason:', event.reason || 'none');
      setConnected(false);
      stopHeartbeat();
      if (gen !== genRef.current) return;
      ws.current = null;

      if (AUTH_CLOSE_CODES.includes(event.code)) {
        console.log('[WS] Auth rejected (code', event.code + '), not reconnecting');
        setWsError(event.code === 4001 ? 'Invalid token' : 'Not a participant');
        return;
      }

      if (mountedRef.current && event.code !== 1000) {
        const delay = reconnectDelay.current;
        reconnectDelay.current = Math.min(reconnectDelay.current * 1.5, 4000);
        console.log('[WS] Reconnecting in', delay, 'ms');
        if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
        reconnectTimer.current = setTimeout(() => {
          if (mountedRef.current) connect();
        }, delay);
      }
    };

    socket.onerror = (error) => {
      console.log('[WS] Error:', error.message || 'connection error');
      // Do not prematurely close socket here; let onclose handle state transition cleanly
    };
  }, [rideId, startHeartbeat, stopHeartbeat]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    // Reconnect immediately when app returns to foreground
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && mountedRef.current) {
        if (!ws.current || ws.current.readyState === WebSocket.CLOSED || ws.current.readyState === WebSocket.CLOSING) {
          console.log('[WS] App foregrounded, checking connection...');
          connect();
        }
      }
    });

    return () => {
      mountedRef.current = false;
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

  const sendPosition = useCallback((lat, lng, heading, speed) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'position', lat, lng, heading, speed }));
    }
  }, []);

  const sendFlag = useCallback((stop_type, lat, lng, location_name) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'flag', stop_type, lat, lng, location_name }));
    }
  }, []);

  const sendClearFlag = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'clear_flag' }));
    }
  }, []);

  return { connected, wsError, sendPosition, sendFlag, sendClearFlag };
}
