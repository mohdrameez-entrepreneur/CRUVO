import { useState, useEffect, useRef, useCallback } from 'react';
import * as Location from 'expo-location';

export default function useLocation(enabled = true) {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [watching, setWatching] = useState(false);
  const watchRef = useRef(null);

  const requestPermission = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setErrorMsg('Location permission denied');
      return false;
    }
    return true;
  }, []);

  const getCurrentLocation = useCallback(async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation(loc.coords);
      return loc.coords;
    } catch {
      return null;
    }
  }, []);

  const startWatching = useCallback(async (callback) => {
    const granted = await requestPermission();
    if (!granted) return;

    setWatching(true);
    try {
      const initialLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      if (initialLoc?.coords) {
        setLocation(initialLoc.coords);
        if (callback) callback(initialLoc.coords);
      }
    } catch {}

    watchRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced, // High causes more jitter on stationary devices
        distanceInterval: 8,   // Only fire when moved 8m — eliminates GPS jitter
        timeInterval: 3000,    // Max once per 3s
      },
      (loc) => {
        setLocation(loc.coords);
        if (callback) callback(loc.coords);
      }
    );
  }, [requestPermission]);

  const stopWatching = useCallback(() => {
    if (watchRef.current) {
      watchRef.current.remove();
      watchRef.current = null;
    }
    setWatching(false);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    getCurrentLocation();
    return () => stopWatching();
  }, [enabled]);

  return { location, errorMsg, watching, getCurrentLocation, startWatching, stopWatching, requestPermission };
}
