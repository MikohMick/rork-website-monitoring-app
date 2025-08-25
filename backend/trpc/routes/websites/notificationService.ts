import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';

const expo = new Expo();

// In-memory storage for notification tokens
// In production, this should be stored in a database
const userTokens = new Map<string, string>();
const notificationPreferences = new Map<string, Set<string>>(); // userId -> Set of websiteIds

export interface NotificationToken {
  userId: string;
  token: string;
}

export interface NotificationPreference {
  userId: string;
  websiteId: string;
  enabled: boolean;
}

export function registerNotificationToken(userId: string, token: string) {
  if (!Expo.isExpoPushToken(token)) {
    throw new Error('Invalid Expo push token');
  }
  
  userTokens.set(userId, token);
  console.log(`Registered notification token for user ${userId}`);
}

export function setNotificationPreference(userId: string, websiteId: string, enabled: boolean) {
  if (!notificationPreferences.has(userId)) {
    notificationPreferences.set(userId, new Set());
  }
  
  const userPrefs = notificationPreferences.get(userId)!;
  if (enabled) {
    userPrefs.add(websiteId);
  } else {
    userPrefs.delete(websiteId);
  }
  
  console.log(`Set notification preference for user ${userId}, website ${websiteId}: ${enabled}`);
}

export function getNotificationPreferences(userId: string): string[] {
  const userPrefs = notificationPreferences.get(userId);
  return userPrefs ? Array.from(userPrefs) : [];
}

export async function sendDowntimeNotification(
  userId: string,
  websiteId: string,
  websiteName: string,
  downtimeTimestamp: Date
) {
  const token = userTokens.get(userId);
  if (!token) {
    console.log(`No notification token found for user ${userId}`);
    return;
  }
  
  const userPrefs = notificationPreferences.get(userId);
  if (!userPrefs || !userPrefs.has(websiteId)) {
    console.log(`Notifications disabled for user ${userId}, website ${websiteId}`);
    return;
  }
  
  const message: ExpoPushMessage = {
    to: token,
    sound: 'default',
    title: `${websiteName} is down`,
    body: `Detected at ${downtimeTimestamp.toLocaleTimeString()}`,
    data: { 
      websiteId,
      type: 'downtime_alert',
      timestamp: downtimeTimestamp.toISOString()
    },
    categoryId: 'website_alert',
    priority: 'high',
  };
  
  try {
    const tickets = await expo.sendPushNotificationsAsync([message]);
    console.log(`Sent downtime notification for ${websiteName}:`, tickets);
    return tickets[0];
  } catch (error) {
    console.error(`Failed to send notification for ${websiteName}:`, error);
    throw error;
  }
}

export async function sendBatchNotifications(messages: ExpoPushMessage[]) {
  const chunks = expo.chunkPushNotifications(messages);
  const tickets: ExpoPushTicket[] = [];
  
  for (const chunk of chunks) {
    try {
      const chunkTickets = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...chunkTickets);
    } catch (error) {
      console.error('Error sending notification chunk:', error);
    }
  }
  
  return tickets;
}

// Default user ID for single-user app
export const DEFAULT_USER_ID = 'default_user';