import { useEffect, useRef, useCallback, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { WS_BASE } from '../config';

export default function useRideSocket(rideId, { onPositionsUpdate, onFlag, onFlagCleared }) {
  const ws = useRef(null);
  const reconnectTimer = useRef(null);
  const reconnectDelay = useRef(1000);
  const [connected, setConnected] = useState(false);
  const listenersRef = useRef({ onPositionsUpdate, onFlag, onFlagCleared });

  listenersRef.current = { onPositionsUpdate, onFlag, onFlagCleared };

  const connect = useCallback(async () => {
    if (!rideId) return;
    const token = await SecureStore.getItemAsync('auth_token');
    if (!token) return;

    const url = `${WS_BASE}/ride/${rideId}/?token=${token}`;
    const socket = new WebSocket(url);
    ws.current = socket;

    socket.onopen = () => {
      setConnected(true);
      reconnectDelay.current = 1000;
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

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
      }
    };

    socket.onclose = () => {
      setConnected(false);
      ws.current = null;
      reconnectTimer.current = setTimeout(() => {
        reconnectDelay.current = Math.min(reconnectDelay.current * 1.5, 10000);
        connect();
      }, reconnectDelay.current);
    };

    socket.onerror = () => {
      socket.close();
    };
  }, [rideId]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (ws.current) ws.current.close();
    };
  }, [connect]);

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

  return { connected, sendPosition, sendFlag, sendClearFlag };
}
