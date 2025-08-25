import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { ExternalLink, Trash2, RefreshCw, Clock, TrendingUp } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { useWebsiteMonitor } from '@/hooks/useWebsiteMonitorBackend';
import StatusIndicator from '@/components/StatusIndicator';

export default function WebsiteDetailScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const websiteMonitor = useWebsiteMonitor();

  // Always call hooks first
  const websites = websiteMonitor?.websites || [];
  const removeWebsite = websiteMonitor?.removeWebsite;
  const checkWebsiteStatus = websiteMonitor?.checkWebsiteStatus;
  const getWebsiteStats = websiteMonitor?.getWebsiteStats;
  const checkingIds = websiteMonitor?.checkingIds || new Set();
  
  const website = websites.find(site => site.id === id);
  const isChecking = checkingIds.has(id || '');

  const stats = useMemo(() => {
    return website && getWebsiteStats ? getWebsiteStats(website) : null;
  }, [website, getWebsiteStats]);

  // Handle case where hook returns undefined
  if (!websiteMonitor) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Loading...' }} />
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>
            Loading website monitor...
          </Text>
        </View>
      </SafeAreaView>
    );
  }


  if (!website) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Website Not Found' }} />
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>
            Website not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleRefresh = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (checkWebsiteStatus) {
      await checkWebsiteStatus(website.id);
    }
  };

  const handleOpenWebsite = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    const url = website.url.startsWith('http') ? website.url : `https://${website.url}`;
    
    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('Error', 'Could not open website');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Website',
      `Are you sure you want to stop monitoring "${website.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (removeWebsite) {
              await removeWebsite(website.id);
              router.back();
            }
          },
        },
      ]
    );
  };

  const getStatusText = () => {
    switch (website.status) {
      case 'online':
        return 'Online';
      case 'offline':
        return 'Offline';
      case 'checking':
        return 'Checking...';
      default:
        return 'Unknown';
    }
  };

  const formatUrl = (url: string) => {
    return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  };

  function getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Stack.Screen 
        options={{ 
          title: website.name,
          headerRight: () => (
            <TouchableOpacity onPress={handleDelete} style={{ marginRight: 4 }}>
              <Trash2 color={colors.error} size={22} />
            </TouchableOpacity>
          ),
        }} 
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.statusHeader}>
            <View style={styles.statusInfo}>
              <StatusIndicator status={website.status} size={16} />
              <Text style={[styles.statusText, { color: colors.text }]}>
                {getStatusText()}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleRefresh}
              disabled={isChecking}
              style={[styles.refreshButton, { borderColor: colors.border }]}
            >
              <RefreshCw 
                color={colors.primary} 
                size={20} 
                style={{ opacity: isChecking ? 0.5 : 1 }}
              />
            </TouchableOpacity>
          </View>
          
          <Text style={[styles.websiteName, { color: colors.text }]}>
            {website.name}
          </Text>
          
          <Text style={[styles.websiteUrl, { color: colors.textSecondary }]}>
            {formatUrl(website.url)}
          </Text>
          
          <TouchableOpacity
            style={[styles.openButton, { backgroundColor: colors.primary }]}
            onPress={handleOpenWebsite}
          >
            <ExternalLink color={colors.background} size={18} />
            <Text style={[styles.openButtonText, { color: colors.background }]}>
              Open Website
            </Text>
          </TouchableOpacity>
        </View>

        {/* Stats Card */}
        {stats && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Uptime Statistics (24h)
            </Text>
            
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <TrendingUp color={colors.success} size={20} />
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {stats.uptimePercentage.toFixed(1)}%
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Uptime
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <Clock color={colors.primary} size={20} />
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {stats.averageResponseTime.toFixed(0)}ms
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Avg Response
                </Text>
              </View>
            </View>
            
            <View style={styles.timeStats}>
              <View style={styles.timeStatItem}>
                <Text style={[styles.timeStatValue, { color: colors.success }]}>
                  {stats.totalUptimeHours.toFixed(1)}h
                </Text>
                <Text style={[styles.timeStatLabel, { color: colors.textSecondary }]}>
                  Online
                </Text>
              </View>
              
              <View style={styles.timeStatItem}>
                <Text style={[styles.timeStatValue, { color: colors.error }]}>
                  {stats.totalDowntimeHours.toFixed(1)}h
                </Text>
                <Text style={[styles.timeStatLabel, { color: colors.textSecondary }]}>
                  Offline
                </Text>
              </View>
            </View>
          </View>
        )}


        {/* Last Checked */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.lastCheckedText, { color: colors.textSecondary }]}>
            Last checked: {website.lastChecked.toLocaleString()}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '500',
  },
  card: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  websiteName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  websiteUrl: {
    fontSize: 16,
    marginBottom: 16,
  },
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  openButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  timeStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  timeStatItem: {
    alignItems: 'center',
  },
  timeStatValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  timeStatLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  historyContent: {
    flex: 1,
  },
  historyStatus: {
    fontSize: 14,
    fontWeight: '500',
  },
  historyTime: {
    fontSize: 12,
    marginTop: 2,
  },
  lastCheckedText: {
    fontSize: 14,
    textAlign: 'center',
  },
});