import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { trpc } from '@/lib/trpc';

// Configure notification behavior
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
    if (Platform.OS === 'web') {
      console.log('Notifications not supported on web');
      return;
    }

    if (Constants.appOwnership === 'expo') {
      console.warn('Push notifications are not supported in Expo Go on SDK 53. Use a development build.');
      return;
    }
    
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        registerTokenMutation.mutate({ token });
      }
    });

    // Listen for notifications received while app is running
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    // Listen for user interactions with notifications
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      
      const data = response.notification.request.content.data;
      if (data?.type === 'downtime_alert' && data?.websiteId) {
        // Navigate to website details
        // This would need to be implemented with navigation
        console.log('Navigate to website:', data.websiteId);
      }
    });

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