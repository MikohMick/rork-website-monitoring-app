import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, RefreshCw, Bell, WifiOff, Wifi } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { useWebsiteMonitor } from '@/hooks/useWebsiteMonitorSupabase';
import WebsiteCard from '@/components/WebsiteCard';
import { Stack, router } from 'expo-router';

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

export default function HomeScreen() {
  const { colors } = useTheme();
  const websiteMonitor = useWebsiteMonitor();
  const [searchQuery, setSearchQuery] = useState('');

  // Handle case where hook returns undefined
  if (!websiteMonitor) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>
            Loading website monitor...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const { websites, isLoading, checkAllWebsites, refreshing, isOffline, retryConnection } = websiteMonitor;

  // Check if there's a connection error
  const hasConnectionError = websites.length === 0 && !isLoading && !refreshing;
  


  const filteredWebsites = useMemo(() => {
    if (!searchQuery.trim()) return websites;
    
    const query = searchQuery.toLowerCase();
    return websites.filter(
      website =>
        website.name.toLowerCase().includes(query) ||
        website.url.toLowerCase().includes(query)
    );
  }, [websites, searchQuery]);

  const handleRefresh = async () => {
    if (refreshing) return;
    
    console.log('Manual refresh triggered');
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    try {
      await checkAllWebsites();
      console.log('Refresh completed');
    } catch (error) {
      console.log('Refresh error:', error);
    }
  };

  const renderWebsite = ({ item }: { item: Website }) => (
    <WebsiteCard website={item} />
  );

  const addTestWebsites = async () => {
    console.log('Adding test websites...');
    const testWebsites = [
      { name: 'Google', url: 'https://google.com' },
      { name: 'GitHub', url: 'https://github.com' },
      { name: 'Example (Should Work)', url: 'https://httpbin.org/status/200' },
      { name: 'Test Offline', url: 'https://httpbin.org/status/500' },
    ];
    
    try {
      for (const website of testWebsites) {
        await websiteMonitor.addWebsite(website.name, website.url);
      }
      console.log('Test websites added successfully');
    } catch (error) {
      console.log('Error adding test websites:', error);
    }
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        No websites to monitor
      </Text>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        Add your first website to start monitoring its uptime
      </Text>
      <TouchableOpacity
        style={[styles.testButton, { backgroundColor: colors.primary }]}
        onPress={addTestWebsites}
      >
        <Text style={[styles.testButtonText, { color: colors.background }]}>
          Add Test Websites
        </Text>
      </TouchableOpacity>
    </View>
  );

  const getStatusSummary = () => {
    const online = websites.filter(site => site.status === 'online').length;
    const offline = websites.filter(site => site.status === 'offline').length;
    const checking = websites.filter(site => site.status === 'checking').length;
    
    return { online, offline, checking, total: websites.length };
  };

  const summary = getStatusSummary();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Stack.Screen 
        options={{
          title: 'Website Monitor',
          headerRight: () => (
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => router.push('/notifications')}
            >
              <Bell color={colors.primary} size={24} />
            </TouchableOpacity>
          ),
        }} 
      />
      {/* Connection Status Indicator */}
      {isOffline && (
        <View style={[styles.connectionStatus, { backgroundColor: colors.error + '20', borderColor: colors.error }]}>
          <WifiOff color={colors.error} size={16} />
          <Text style={[styles.connectionText, { color: colors.error }]}>
            Offline Mode - Using cached data
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.error }]}
            onPress={retryConnection}
          >
            <Text style={[styles.retryButtonText, { color: colors.background }]}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      )}
      
      {!isOffline && websites.length > 0 && (
        <View style={[styles.connectionStatus, { backgroundColor: colors.success + '20', borderColor: colors.success }]}>
          <Wifi color={colors.success} size={16} />
          <Text style={[styles.connectionText, { color: colors.success }]}>
            Connected to Supabase
          </Text>
        </View>
      )}
      
      {websites.length > 0 && (
        <View style={styles.summaryContainer}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: colors.success }]}>
                {summary.online}
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                Online
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: colors.error }]}>
                {summary.offline}
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                Offline
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: colors.textSecondary }]}>
                {summary.checking}
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                Checking
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.refreshButton, { borderColor: colors.border }]}
              onPress={handleRefresh}
              disabled={refreshing}
              testID="refresh-button"
            >
              <RefreshCw 
                color={colors.primary} 
                size={20} 
                style={{ 
                  opacity: refreshing ? 0.5 : 1,
                  transform: [{ rotate: refreshing ? '180deg' : '0deg' }]
                }}
              />
            </TouchableOpacity>
          </View>
        </View>
      )}



      {websites.length > 0 && (
        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search color={colors.textSecondary} size={20} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search websites..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      )}

      <FlatList
        data={filteredWebsites}
        renderItem={renderWebsite}
        keyExtractor={(item, index) => item.id || `fallback-${index}`}
        contentContainerStyle={websites.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={5}
        getItemLayout={(data, index) => ({
          length: 120, // Approximate height of each item
          offset: 120 * index,
          index,
        })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  summaryContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  list: {
    paddingBottom: 20,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  testButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '600',
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
  notificationButton: {
    padding: 8,
    borderRadius: 8,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  connectionText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
});