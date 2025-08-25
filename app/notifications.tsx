import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useWebsiteMonitor } from '@/hooks/useWebsiteMonitorBackend';
import { trpc } from '@/lib/trpc';
import StatusIndicator from '@/components/StatusIndicator';
import * as Haptics from 'expo-haptics';

export default function NotificationSettingsScreen() {
  const { colors } = useTheme();
  const { websites } = useWebsiteMonitor();
  
  const preferencesQuery = trpc.notifications.getPreferences.useQuery();
  const setPreferenceMutation = trpc.notifications.setPreference.useMutation({
    onSuccess: () => {
      preferencesQuery.refetch();
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
  });
  
  const enabledWebsites = new Set(preferencesQuery.data?.preferences || []);
  
  const handleToggleNotification = async (websiteId: string, enabled: boolean) => {
    try {
      await setPreferenceMutation.mutateAsync({ websiteId, enabled });
    } catch {
      Alert.alert(
        'Error',
        'Failed to update notification preference. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };
  
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Notification Settings' }} />
        <View style={styles.webNotSupported}>
          <Text style={[styles.webNotSupportedText, { color: colors.text }]}>
            Push notifications are not supported on web.
          </Text>
          <Text style={[styles.webNotSupportedSubtext, { color: colors.textSecondary }]}>
            Use the mobile app to receive downtime alerts.
          </Text>
        </View>
      </View>
    );
  }
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Notification Settings' }} />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Downtime Alerts
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Get notified when your websites go offline
          </Text>
        </View>
        
        {websites.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
              No websites added yet.
            </Text>
            <Text style={[styles.emptyStateSubtext, { color: colors.textSecondary }]}>
              Add websites to configure notification preferences.
            </Text>
          </View>
        ) : (
          <View style={styles.websitesList}>
            {websites.map((website) => {
              const isEnabled = enabledWebsites.has(website.id);
              
              return (
                <View
                  key={website.id}
                  style={[
                    styles.websiteItem,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.websiteInfo}>
                    <View style={styles.websiteHeader}>
                      <Text style={[styles.websiteName, { color: colors.text }]}>
                        {website.name}
                      </Text>
                      <StatusIndicator status={website.status} size={12} />
                    </View>
                    <Text style={[styles.websiteUrl, { color: colors.textSecondary }]}>
                      {website.url}
                    </Text>
                  </View>
                  
                  <Switch
                    value={isEnabled}
                    onValueChange={(enabled) => handleToggleNotification(website.id, enabled)}
                    disabled={setPreferenceMutation.isPending}
                    trackColor={{
                      false: colors.border,
                      true: colors.primary + '40',
                    }}
                    thumbColor={isEnabled ? colors.primary : colors.textSecondary}
                  />
                </View>
              );
            })}
          </View>
        )}
        
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            You&apos;ll only receive notifications when a website goes from online to offline.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  websitesList: {
    paddingHorizontal: 20,
  },
  websiteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  websiteInfo: {
    flex: 1,
    marginRight: 16,
  },
  websiteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  websiteName: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginRight: 8,
    flex: 1,
  },
  websiteUrl: {
    fontSize: 14,
    lineHeight: 18,
  },
  footer: {
    padding: 20,
    paddingTop: 24,
  },
  footerText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  webNotSupported: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  webNotSupportedText: {
    fontSize: 18,
    fontWeight: '600' as const,
    textAlign: 'center',
    marginBottom: 8,
  },
  webNotSupportedSubtext: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
});