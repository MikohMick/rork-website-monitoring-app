import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { trpcClient } from '@/lib/trpc';

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

export const [WebsiteMonitorProvider, useWebsiteMonitor] = createContextHook(() => {
  const [refreshing, setRefreshing] = useState(false);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Using tRPC client instead of REST API

  const fetchAll = async () => {
    try {
      setIsLoading(true);
      console.log('Fetching websites via tRPC...');
      const data = await trpcClient.websites.getAll.query();
      console.log('Received websites data:', data);
      const hydrated = data.map((w: any) => ({ 
        ...w, 
        lastChecked: new Date(w.lastChecked), 
        createdAt: new Date(w.createdAt) 
      }));
      setWebsites(hydrated);
    } catch (e) {
      console.error('Backend connection failed', e);
      setWebsites([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 60000);
    return () => clearInterval(interval);
  }, []);

  const websitesMemo: Website[] = useMemo(() => {
    const result = (websites ?? []).filter(site => site.id && site.id.trim() !== '');
    const ids = result.map(w => w.id);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      const seen = new Set<string>();
      return result.filter(site => {
        if (seen.has(site.id)) return false;
        seen.add(site.id);
        return true;
      });
    }
    return result;
  }, [websites]);

  const addWebsite = useCallback(
    async (name: string, url: string) => {
      console.log(`Adding website: ${name} (${url})`);
      try {
        const result = await trpcClient.websites.add.mutate({ name, url });
        await fetchAll();
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        return result.id;
      } catch (error) {
        console.error('Error adding website:', error);
        throw error as Error;
      }
    },
    []
  );

  const addMultipleWebsites = useCallback(
    async (websiteData: { name: string; url: string }[]) => {
      console.log(`Adding ${websiteData.length} websites...`);
      try {
        const results = await Promise.all(
          websiteData.map(({ name, url }) => trpcClient.websites.add.mutate({ name, url }))
        );
        await fetchAll();
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        return results.map((r: any) => r.id);
      } catch (error) {
        console.error('Error adding multiple websites:', error);
        throw error as Error;
      }
    },
    []
  );

  const removeWebsite = useCallback(
    async (id: string) => {
      console.log(`Removing website: ${id}`);
      try {
        await trpcClient.websites.delete.mutate({ id });
        await fetchAll();
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      } catch (error) {
        console.error('Error removing website:', error);
        throw error as Error;
      }
    },
    []
  );

  const checkWebsiteStatus = useCallback(
    async (id: string) => {
      console.log(`Checking website status: ${id}`);
      try {
        const result = await trpcClient.websites.check.mutate({ id });
        await fetchAll();
        return result;
      } catch (error) {
        console.error('Error checking website:', error);
        throw error as Error;
      }
    },
    []
  );

  const checkAllWebsites = useCallback(async () => {
    console.log('Checking all websites...');
    setRefreshing(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    try {
      const result = await trpcClient.websites.checkAll.mutate();
      await fetchAll();
      console.log(`Checked ${result.checked} websites successfully, ${result.failed} failed`);
      return result;
    } catch (error) {
      console.error('Error checking all websites:', error);
      throw error as Error;
    } finally {
      setRefreshing(false);
    }
  }, []);

  const getWebsiteStats = useCallback((website: Website) => {
    return {
      totalUptimeHours: website.uptime * 5 / 60, // Convert checks to hours (5 min intervals)
      totalDowntimeHours: website.downtime * 5 / 60,
      uptimePercentage: website.uptimePercentage,
      averageResponseTime: 0, // Not implemented in backend yet
    };
  }, []);

  const clearAllWebsites = useCallback(async () => {
    console.log('Clearing all websites...');
    try {
      await Promise.all(
        websites.map(website => trpcClient.websites.delete.mutate({ id: website.id }))
      );
      await fetchAll();
      console.log('All websites cleared successfully');
    } catch (error) {
      console.error('Error clearing websites:', error);
    }
  }, [websites]);

  return useMemo(() => ({
    websites: websitesMemo,
    isLoading,
    refreshing,
    checkingIds: new Set<string>(),
    addWebsite,
    addMultipleWebsites,
    removeWebsite,
    checkWebsiteStatus,
    checkAllWebsites,
    getWebsiteStats,
    clearAllWebsites,
  }), [
    websitesMemo,
    isLoading,
    refreshing,
    addWebsite,
    addMultipleWebsites,
    removeWebsite,
    checkWebsiteStatus,
    checkAllWebsites,
    getWebsiteStats,
    clearAllWebsites,
  ]);
});