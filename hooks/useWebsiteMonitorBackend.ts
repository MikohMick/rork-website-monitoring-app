import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { trpc } from '@/lib/trpc';

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

  // Get all websites with real-time updates
  const websitesQuery = trpc.websites.getAll.useQuery(undefined, {
    refetchInterval: 60000, // Refetch every 60 seconds
    refetchOnWindowFocus: false, // Disable to prevent excessive refetching
    refetchOnMount: true,
  });

  // Debug logging (only when there are errors)
  if (websitesQuery.isError) {
    console.error('WebsiteMonitor Hook - Query Error:', websitesQuery.error);
  }

  // Mutations
  const addWebsiteMutation = trpc.websites.add.useMutation({
    onSuccess: () => {
      websitesQuery.refetch();
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
  });

  const deleteWebsiteMutation = trpc.websites.delete.useMutation({
    onSuccess: () => {
      websitesQuery.refetch();
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
  });

  const checkWebsiteMutation = trpc.websites.check.useMutation({
    onSuccess: () => {
      websitesQuery.refetch();
    },
  });

  const checkAllWebsitesMutation = trpc.websites.checkAll.useMutation({
    onSuccess: () => {
      websitesQuery.refetch();
    },
  });

  const websites: Website[] = useMemo(() => {
    if (!websitesQuery.data) return [];
    
    const result = websitesQuery.data
      .filter(site => site.id && site.id.trim() !== '')
      .map(site => ({
        ...site,
        lastChecked: new Date(site.lastChecked),
        createdAt: new Date(site.createdAt),
      }));
    
    // Check for duplicate IDs and log only if found
    const ids = result.map(w => w.id);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      console.error('Duplicate website IDs detected');
      // Remove duplicates by keeping only the first occurrence
      const seen = new Set<string>();
      return result.filter(site => {
        if (seen.has(site.id)) {
          return false;
        }
        seen.add(site.id);
        return true;
      });
    }
    
    return result;
  }, [websitesQuery.data]);

  const addWebsite = useCallback(
    async (name: string, url: string) => {
      console.log(`Adding website: ${name} (${url})`);
      try {
        const result = await addWebsiteMutation.mutateAsync({ name, url });
        console.log('Website added successfully:', result);
        return result.id;
      } catch (error) {
        console.error('Error adding website:', error);
        throw error;
      }
    },
    [addWebsiteMutation]
  );

  const addMultipleWebsites = useCallback(
    async (websiteData: { name: string; url: string }[]) => {
      console.log(`Adding ${websiteData.length} websites...`);
      try {
        const results = await Promise.all(
          websiteData.map(({ name, url }) => 
            addWebsiteMutation.mutateAsync({ name, url })
          )
        );
        console.log('All websites added successfully');
        return results.map(r => r.id);
      } catch (error) {
        console.error('Error adding multiple websites:', error);
        throw error;
      }
    },
    [addWebsiteMutation]
  );

  const removeWebsite = useCallback(
    async (id: string) => {
      console.log(`Removing website: ${id}`);
      try {
        await deleteWebsiteMutation.mutateAsync({ id });
        console.log('Website removed successfully');
      } catch (error) {
        console.error('Error removing website:', error);
        throw error;
      }
    },
    [deleteWebsiteMutation]
  );

  const checkWebsiteStatus = useCallback(
    async (id: string) => {
      console.log(`Checking website status: ${id}`);
      try {
        const result = await checkWebsiteMutation.mutateAsync({ id });
        console.log('Website checked successfully:', result);
        return result;
      } catch (error) {
        console.error('Error checking website:', error);
        throw error;
      }
    },
    [checkWebsiteMutation]
  );

  const checkAllWebsites = useCallback(async () => {
    console.log('Checking all websites...');
    setRefreshing(true);
    
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      const result = await checkAllWebsitesMutation.mutateAsync();
      console.log(`Checked ${result.checked} websites successfully, ${result.failed} failed`);
      return result;
    } catch (error) {
      console.error('Error checking all websites:', error);
      throw error;
    } finally {
      setRefreshing(false);
    }
  }, [checkAllWebsitesMutation]);

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
        websites.map(website => deleteWebsiteMutation.mutateAsync({ id: website.id }))
      );
      console.log('All websites cleared successfully');
    } catch (error) {
      console.error('Error clearing websites:', error);
    }
  }, [websites, deleteWebsiteMutation]);

  return useMemo(() => ({
    websites,
    isLoading: websitesQuery.isLoading,
    refreshing,
    checkingIds: new Set<string>(), // Not needed with backend
    addWebsite,
    addMultipleWebsites,
    removeWebsite,
    checkWebsiteStatus,
    checkAllWebsites,
    getWebsiteStats,
    clearAllWebsites,
  }), [
    websites,
    websitesQuery.isLoading,
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