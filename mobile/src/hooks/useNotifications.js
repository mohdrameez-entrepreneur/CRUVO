import { useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  Constants.executionEnvironment === 'storeClient' ||
  Constants.appOwnership === 'expo' ||
  Boolean(Constants.expoVersion);

let Notifications = null;

if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (e) {
    console.log('[Notifications] Native module load skipped:', e?.message);
  }
}

export default function useNotifications(autoRequest = false) {
  const requestPermission = useCallback(async () => {
    if (isExpoGo || !Notifications) {
      console.log('[Notifications] Expo Go sandbox detected. Push notifications active in standalone APK / Dev Build.');
      return false;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return false;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'CRUVO Ride Alerts',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FFD600',
        });
      }

      return true;
    } catch (err) {
      console.log('[Notifications] Notice:', err?.message || err);
      return false;
    }
  }, []);

  useEffect(() => {
    if (autoRequest && !isExpoGo) {
      requestPermission();
    }
  }, [autoRequest, requestPermission]);

  return { requestPermission };
}
