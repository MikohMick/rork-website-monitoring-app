import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/hooks/useTheme';
import StatusIndicator from './StatusIndicator';

interface Website {
  id: string;
  name: string;
  url: string;
  status: 'online' | 'offline' | 'checking';
  uptime: number;
  downtime: number;
  lastChecked: Date;
  createdAt: Date;
  uptimePercentage: number;
}

interface WebsiteCardProps {
  website: Website;
}

function WebsiteCard({ website }: WebsiteCardProps) {
  const { colors } = useTheme();

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/website/${website.id}`);
  };
  const formatUrl = (url: string) => {
    return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
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

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={handlePress}
      activeOpacity={0.7}
      testID={`website-card-${website.id}`}
    >
      <View style={styles.header}>
        <View style={styles.statusContainer}>
          <StatusIndicator status={website.status} size={10} />
          <Text style={[styles.statusText, { color: colors.textSecondary }]}>
            {getStatusText()}
          </Text>
        </View>
        <Text style={[styles.uptimeText, { color: colors.textSecondary }]}>
          {website.uptimePercentage.toFixed(1)}% uptime
        </Text>
      </View>
      
      <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
        {website.name}
      </Text>
      
      <Text style={[styles.url, { color: colors.textSecondary }]} numberOfLines={1}>
        {formatUrl(website.url)}
      </Text>
      
      <Text style={[styles.lastChecked, { color: colors.textSecondary }]}>
        Last checked: {website.lastChecked.toLocaleTimeString()}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  uptimeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  url: {
    fontSize: 14,
    marginBottom: 8,
  },
  lastChecked: {
    fontSize: 12,
  },
});

export default React.memo(WebsiteCard);