import { useState, useEffect, useRef, useCallback } from 'react';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

export const CRUVO_LOCATION_TASK = 'CRUVO_LOCATION_TRACKING_TASK';

// Define background task at module scope for Android Foreground Service
if (!TaskManager.isTaskDefined(CRUVO_LOCATION_TASK)) {
  TaskManager.defineTask(CRUVO_LOCATION_TASK, ({ data, error }) => {
    if (error) {
      console.warn('[CRUVO_LOCATION_TASK] Background telemetry notice:', error.message);
      return;
    }
    if (data?.locations?.length > 0) {
      const loc = data.locations[data.locations.length - 1];
      if (global.__cruvo_location_listener && loc?.coords) {
        global.__cruvo_location_listener(loc.coords);
      }
    }
  });
}

export default function useLocation(enabled = true) {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [watching, setWatching] = useState(false);
  const watchRef = useRef(null);

  const checkPermissions = useCallback(async () => {
    try {
      const fg = await Location.getForegroundPermissionsAsync();
      const bg = await Location.getBackgroundPermissionsAsync();
      return {
        foregroundGranted: fg.status === 'granted',
        backgroundGranted: bg.status === 'granted',
      };
    } catch {
      return { foregroundGranted: false, backgroundGranted: false };
    }
  }, []);

  const requestPermission = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Foreground location permission denied');
        return false;
      }
      return true;
    } catch (err) {
      setErrorMsg(err?.message || 'Permission request failed');
      return false;
    }
  }, []);

  const requestBackgroundPermission = useCallback(async () => {
    try {
      // Android mandates foreground permission must be granted prior to requesting background
      const fgStatus = await Location.getForegroundPermissionsAsync();
      if (fgStatus.status !== 'granted') {
        const fgReq = await Location.requestForegroundPermissionsAsync();
        if (fgReq.status !== 'granted') {
          setErrorMsg('Foreground location permission required');
          return false;
        }
      }

      const { status } = await Location.requestBackgroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Background location permission denied');
        return false;
      }
      return true;
    } catch (err) {
      console.warn('[useLocation] Background permission notice:', err?.message || err);
      return false;
    }
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

    // Register active listener for both foreground & background task
    global.__cruvo_location_listener = (coords) => {
      setLocation(coords);
      if (callback) callback(coords);
    };

    try {
      const initialLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      if (initialLoc?.coords) {
        setLocation(initialLoc?.coords);
        if (callback) callback(initialLoc.coords);
      }
    } catch {}

    // 1. Foreground active stream
    try {
      watchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 3,
          timeInterval: 1000,
        },
        (loc) => {
          if (loc?.coords) {
            setLocation(loc.coords);
            if (callback) callback(loc.coords);
          }
        }
      );
    } catch (watchErr) {
      console.warn('[useLocation] Foreground watchPosition notice:', watchErr?.message || watchErr);
    }

    // 2. Android Foreground Service with Persistent Notification (prevents OS battery killing)
    try {
      const bgPerm = await Location.getBackgroundPermissionsAsync();
      if (bgPerm.status === 'granted') {
        const hasStarted = await Location.hasStartedLocationUpdatesAsync(CRUVO_LOCATION_TASK).catch(() => false);
        if (!hasStarted) {
          await Location.startLocationUpdatesAsync(CRUVO_LOCATION_TASK, {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 2000,
            distanceInterval: 3,
            showsBackgroundLocationIndicator: true,
            foregroundService: {
              notificationTitle: 'CRUVO Active Ride',
              notificationBody: 'Squad telemetry active. Broadcasting your live position to your group.',
              notificationColor: '#ffd600',
              killServiceOnDestroy: false,
            },
            pausesUpdatesAutomatically: false,
          });
        }
      }
    } catch (fgServiceErr) {
      console.log('[useLocation] Foreground service initialization:', fgServiceErr?.message || fgServiceErr);
    }
  }, [requestPermission]);

  const stopWatching = useCallback(() => {
    global.__cruvo_location_listener = null;

    if (watchRef.current) {
      watchRef.current.remove();
      watchRef.current = null;
    }

    // Stop background foreground service and clear sticky notification
    Location.hasStartedLocationUpdatesAsync(CRUVO_LOCATION_TASK)
      .then((hasStarted) => {
        if (hasStarted) {
          Location.stopLocationUpdatesAsync(CRUVO_LOCATION_TASK).catch(() => {});
        }
      })
      .catch(() => {});

    setWatching(false);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    getCurrentLocation();
    return () => stopWatching();
  }, [enabled]);

  return {
    location,
    errorMsg,
    watching,
    getCurrentLocation,
    startWatching,
    stopWatching,
    requestPermission,
    requestBackgroundPermission,
    checkPermissions,
  };
}
