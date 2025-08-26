import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import type { Subscription } from 'expo-notifications';

export function useNotifications() {
  const notificationListener = useRef<Subscription | null>(null);
  const responseListener = useRef<Subscription | null>(null);

  useEffect(() => {
    const setup = async () => {
      if (Platform.OS === 'web') {
        console.log('Notifications disabled on web');
        return;
      }

      if (Constants.appOwnership === 'expo') {
        console.log('Skipping notifications in Expo Go (SDK 53).');
        return;
      }

      const Notifications = await import('expo-notifications');

      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });

      const token = await registerForPushNotificationsAsync(Notifications);
      if (token) {
        console.log('Push token ready:', token);
      }

      notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
        console.log('Notification received:', notification);
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('Notification response:', response);
        const data = response.notification.request.content.data as Record<string, unknown> | undefined;
        if ((data?.type as string | undefined) === 'downtime_alert' && typeof data?.websiteId === 'string') {
          console.log('Navigate to website:', String(data.websiteId));
        }
      });
    };

    setup();

    return () => {
      const cleanup = async () => {
        if (Platform.OS === 'web' || Constants.appOwnership === 'expo') return;
        const Notifications = await import('expo-notifications');
        if (notificationListener.current) {
          Notifications.removeNotificationSubscription(notificationListener.current);
        }
        if (responseListener.current) {
          Notifications.removeNotificationSubscription(responseListener.current);
        }
      };
      void cleanup();
    };
  }, []);

  return {
    isRegistering: false,
  };
}

async function registerForPushNotificationsAsync(Notifications: typeof import('expo-notifications')): Promise<string | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  if (Constants.appOwnership === 'expo') {
    return null;
  }

  let token: string | null = null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for push notification!');
    return null;
  }

  try {
    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('Push token:', token);
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }

  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('website_alerts', {
        name: 'Website Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
      });
    } catch (e) {
      console.log('Failed to set Android notification channel', e);
    }
  }

  return token;
}