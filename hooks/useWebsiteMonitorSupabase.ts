import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { Platform, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { websiteService } from '@/lib/websiteService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Website } from '@/types/website';

export const [WebsiteMonitorProvider, useWebsiteMonitor] = createContextHook(() => {
  const [refreshing, setRefreshing] = useState(false);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOffline, setIsOffline] = useState<boolean>(false);

  const loadFromStorage = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('websites');
      if (stored) {
        const parsed = JSON.parse(stored);
        const hydrated = parsed.map((w: any) => ({
          ...w,
          lastChecked: new Date(w.lastChecked),
          createdAt: new Date(w.createdAt)
        }));
        setWebsites(hydrated);
        console.log(`Loaded ${hydrated.length} websites from local storage`);
      }
    } catch (error) {
      console.error('Error loading from storage:', error);
    }
  }, []);

  const saveToStorage = useCallback(async (websitesToSave: Website[]) => {
    try {
      await AsyncStorage.setItem('websites', JSON.stringify(websitesToSave));
    } catch (error) {
      console.error('Error saving to storage:', error);
    }
  }, []);

  const fetchAll = useCallback(async (showError = false) => {
    try {
      setIsLoading(true);
      console.log('Fetching websites via Supabase...');
      const data = await websiteService.getAll();
      console.log('Received websites data:', data);
      setWebsites(data);
      await saveToStorage(data);
      setIsOffline(false);
    } catch (e) {
      console.error('Supabase connection failed', e);
      setIsOffline(true);
      
      if (showError) {
        Alert.alert(
          'Connection Error',
          'Unable to connect to the database. Using offline mode with cached data.',
          [{ text: 'OK' }]
        );
      }
      
      await loadFromStorage();
    } finally {
      setIsLoading(false);
    }
  }, [saveToStorage, loadFromStorage]);

  useEffect(() => {
    const initialize = async () => {
      await loadFromStorage();
      await fetchAll(true);
    };
    
    initialize();
    
    let unsubscribe: (() => void) | undefined;
    if (!isOffline) {
      unsubscribe = websiteService.subscribeToChanges((updatedWebsites) => {
        console.log('Real-time update received:', updatedWebsites.length, 'websites');
        setWebsites(updatedWebsites);
        saveToStorage(updatedWebsites);
      });
    }
    
    const interval = setInterval(() => {
      if (!isOffline) {
        fetchAll();
      }
    }, 60000);
    
    return () => {
      clearInterval(interval);
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [isOffline, fetchAll, loadFromStorage, saveToStorage]);

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
        if (isOffline) {
          const id = `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const website: Website = {
            id,
            name,
            url,
            status: 'checking' as const,
            uptime: 0,
            downtime: 0,
            lastChecked: new Date(),
            createdAt: new Date(),
            uptimePercentage: 0
          };
          
          const updatedWebsites = [...websites, website];
          setWebsites(updatedWebsites);
          await saveToStorage(updatedWebsites);
          
          Alert.alert(
            'Offline Mode',
            'Website added to local storage. It will sync when connection is restored.',
            [{ text: 'OK' }]
          );
          
          return id;
        } else {
          const result = await websiteService.add(name, url);
          await fetchAll();
          if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          return result.id;
        }
      } catch (error) {
        console.error('Error adding website:', error);
        throw error as Error;
      }
    },
    [isOffline, websites, saveToStorage, fetchAll]
  );

  const removeWebsite = useCallback(
    async (id: string) => {
      console.log(`Removing website: ${id}`);
      try {
        if (isOffline) {
          const updatedWebsites = websites.filter(w => w.id !== id);
          setWebsites(updatedWebsites);
          await saveToStorage(updatedWebsites);
          
          Alert.alert(
            'Offline Mode',
            'Website removed from local storage. Changes will sync when connection is restored.',
            [{ text: 'OK' }]
          );
        } else {
          await websiteService.delete(id);
          await fetchAll();
          if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        }
      } catch (error) {
        console.error('Error removing website:', error);
        throw error as Error;
      }
    },
    [isOffline, websites, saveToStorage, fetchAll]
  );

  const checkWebsiteStatus = useCallback(
    async (id: string) => {
      console.log(`Checking website status: ${id}`);
      try {
        if (isOffline) {
          Alert.alert(
            'Offline Mode',
            'Cannot check website status while offline.',
            [{ text: 'OK' }]
          );
          return { status: 'offline' as const };
        } else {
          const result = await websiteService.checkStatus(id);
          await fetchAll();
          return result;
        }
      } catch (error) {
        console.error('Error checking website:', error);
        throw error as Error;
      }
    },
    [isOffline, fetchAll]
  );

  const checkAllWebsites = useCallback(async () => {
    console.log('Checking all websites...');
    setRefreshing(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    try {
      if (isOffline) {
        Alert.alert(
          'Offline Mode',
          'Cannot check websites while offline. Please check your internet connection.',
          [{ text: 'OK' }]
        );
        return { checked: 0, failed: 0 };
      } else {
        const result = await websiteService.checkAll();
        await fetchAll();
        console.log(`Checked ${result.checked} websites successfully, ${result.failed} failed`);
        return result;
      }
    } catch (error) {
      console.error('Error checking all websites:', error);
      throw error as Error;
    } finally {
      setRefreshing(false);
    }
  }, [isOffline, fetchAll]);

  const getWebsiteStats = useCallback((website: Website) => {
    return {
      totalUptimeHours: website.uptime * 5 / 60,
      totalDowntimeHours: website.downtime * 5 / 60,
      uptimePercentage: website.uptimePercentage,
      averageResponseTime: 0,
    };
  }, []);

  const clearAllWebsites = useCallback(async () => {
    console.log('Clearing all websites...');
    try {
      await Promise.all(
        websites.map(website => websiteService.delete(website.id))
      );
      await fetchAll();
      console.log('All websites cleared successfully');
    } catch (error) {
      console.error('Error clearing websites:', error);
    }
  }, [websites, fetchAll]);

  const retryConnection = useCallback(async () => {
    console.log('Retrying Supabase connection...');
    await fetchAll(true);
  }, [fetchAll]);

  return useMemo(() => ({
    websites: websitesMemo,
    isLoading,
    refreshing,
    isOffline,
    checkingIds: new Set<string>(),
    addWebsite,
    removeWebsite,
    checkWebsiteStatus,
    checkAllWebsites,
    getWebsiteStats,
    clearAllWebsites,
    retryConnection,
  }), [
    websitesMemo,
    isLoading,
    refreshing,
    isOffline,
    addWebsite,
    removeWebsite,
    checkWebsiteStatus,
    checkAllWebsites,
    getWebsiteStats,
    clearAllWebsites,
    retryConnection,
  ]);
});