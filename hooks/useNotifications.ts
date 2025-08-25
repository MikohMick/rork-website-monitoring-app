import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { trpc } from '@/lib/trpc';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function useNotifications() {
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);
  
  const registerTokenMutation = trpc.notifications.registerToken.useMutation();
  
  useEffect(() => {
    const setup = async () => {
      if (Platform.OS === 'web') {
        console.log('Notifications not supported on web');
        return;
      }

      if (Constants.appOwnership === 'expo') {
        console.warn('Push notifications are not supported in Expo Go on SDK 53. Use a development build.');
        return;
      }
      
      const token = await registerForPushNotificationsAsync();
      if (token) {
        registerTokenMutation.mutate({ token });
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
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [registerTokenMutation]);

  return {
    isRegistering: registerTokenMutation.isPending,
  };
}

async function registerForPushNotificationsAsync(): Promise<string | null> {
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