import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Website, UptimeRecord, WebsiteStats } from '@/types/website';
import { checkWebsiteStatus as checkStatus } from '@/utils/websiteChecker';

export const [WebsiteMonitorProvider, useWebsiteMonitor] = createContextHook(() => {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [checkingIds, setCheckingIds] = useState<Set<string>>(new Set());

  const hydrateWebsites = (raw: any[]): Website[] => {
    const safeArray = Array.isArray(raw) ? raw : [];
    const processed: Website[] = safeArray
      .map((site: any, idx: number) => {
        const id: string = typeof site?.id === 'string' ? site.id : `${Date.now()}-${idx}`;
        const name: string = typeof site?.name === 'string' ? site.name : 'Unnamed';
        const urlRaw: unknown = site?.url;
        const url: string = typeof urlRaw === 'string' ? urlRaw : '';
        const lastCheckedStr = site?.lastChecked;
        const createdAtStr = site?.createdAt;
        const uptimeHistoryRaw: any[] = Array.isArray(site?.uptimeHistory) ? site.uptimeHistory : [];
        return {
          id,
          name,
          url,
          status: (site?.status === 'online' || site?.status === 'offline' || site?.status === 'checking') ? site.status : 'checking',
          lastChecked: lastCheckedStr ? new Date(lastCheckedStr) : new Date(0),
          createdAt: createdAtStr ? new Date(createdAtStr) : new Date(),
          uptimeHistory: uptimeHistoryRaw.map((record: any) => ({
            timestamp: record?.timestamp ? new Date(record.timestamp) : new Date(),
            status: record?.status === 'online' ? 'online' : 'offline',
            responseTime: typeof record?.responseTime === 'number' ? record.responseTime : undefined,
          })),
          lastError: typeof site?.lastError === 'string' ? site.lastError : undefined,
        } as Website;
      })
      .filter((s: Website) => typeof s.url === 'string');
    return processed;
  };

  const loadWebsites = useCallback(async () => {
    try {
      console.log('📂 [STORAGE] Loading websites from AsyncStorage...');
      const stored = await AsyncStorage.getItem('websites');
      console.log('📂 [STORAGE] Raw stored data:', stored);
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('📂 [STORAGE] Parsed data:', JSON.stringify(parsed, null, 2));
        const hydrated = hydrateWebsites(parsed);
        console.log('📂 [STORAGE] Processed websites count:', hydrated.length);
        setWebsites(hydrated);
        return hydrated;
      } else {
        console.log('📂 [STORAGE] No stored websites found');
        setWebsites([]);
        return [];
      }
    } catch (error) {
      console.log('💥 [STORAGE] Error loading websites:', error);
      setWebsites([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveWebsites = async (newWebsites: Website[]) => {
    try {
      console.log('💾 [STORAGE] Saving websites to AsyncStorage:', newWebsites.length);
      newWebsites.forEach((site, index) => {
        console.log(`💾 [STORAGE] Saving website ${index}:`, {
          id: site.id,
          name: site.name,
          url: site.url,
          status: site.status,
          hasUrl: !!site.url,
        });
      });
      const serialized = JSON.stringify(newWebsites);
      console.log('💾 [STORAGE] Serialized data length:', serialized.length);
      await AsyncStorage.setItem('websites', serialized);
      console.log('💾 [STORAGE] Successfully saved to AsyncStorage');
    } catch (error) {
      console.log('💥 [STORAGE] Error saving websites:', error);
    }
  };

  const checkWebsiteStatusDirect = useCallback(async (website: Website) => {
    const { id, name, url } = website;
    console.log(`🚀 [MONITOR] Starting direct check for: ${name} (${id})`);
    
    if (!url || !url.trim()) {
      console.log(`❌ [MONITOR] No valid URL for website: ${name}`);
      return;
    }
    
    // Add to checking set
    setCheckingIds(prev => {
      const newSet = new Set(prev);
      newSet.add(id);
      console.log(`📊 [MONITOR] Added ${id} to checking set. Current checking:`, Array.from(newSet));
      return newSet;
    });
    
    // Update status to checking
    setWebsites(prev => 
      prev.map(site => 
        site.id === id ? { ...site, status: 'checking' as const } : site
      )
    );

    try {
      console.log(`🔄 [MONITOR] Checking: ${name} (${url})`);
      const result = await checkStatus(url);
      console.log(`✅ [MONITOR] Check completed for ${name}:`, result);

      const now = new Date();
      const uptimeRecord: UptimeRecord = {
        timestamp: now,
        status: result.status,
        responseTime: result.responseTime,
      };

      setWebsites(prev => {
        const updated = prev.map(site => {
          if (site.id === id) {
            return {
              ...site,
              status: result.status,
              lastChecked: now,
              uptimeHistory: [...(site.uptimeHistory ?? []), uptimeRecord].slice(-100),
              lastError: result.error,
            } as Website;
          }
          return site;
        });
        saveWebsites(updated);
        return updated;
      });
    } catch (error) {
      console.log(`💥 [MONITOR] Exception for ${name}:`, error);
      setWebsites(prev =>
        prev.map(site =>
          site.id === id
            ? {
                ...site,
                status: 'offline' as const,
                lastChecked: new Date(),
                lastError: error instanceof Error ? error.message : 'Unknown error',
              }
            : site,
        ),
      );
    } finally {
      console.log(`🏁 [MONITOR] Finished check for: ${name} (${id})`);
      setCheckingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        console.log(`📊 [MONITOR] Removed ${id} from checking set. Current checking:`, Array.from(newSet));
        return newSet;
      });
    }
  }, []);

  const checkWebsiteStatus = useCallback(async (id: string) => {
    console.log(`🚀 [MONITOR] Starting check for website ID: ${id}`);
    
    // Find the website first to get URL and name
    const website = websites.find(site => site.id === id);
    if (!website) {
      console.log(`❌ [MONITOR] Website with ID ${id} not found`);
      return;
    }
    
    await checkWebsiteStatusDirect(website);
  }, [websites, checkWebsiteStatusDirect]);

  const addWebsite = useCallback(
    async (name: string, url: string) => {
      const newWebsite: Website = {
        id: Date.now().toString(),
        name: name.trim(),
        url: url.trim(),
        status: 'checking',
        lastChecked: new Date(),
        createdAt: new Date(),
        uptimeHistory: [],
      };

      setWebsites(prev => {
        const updated = [...prev, newWebsite];
        saveWebsites(updated);
        return updated;
      });

      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      setTimeout(() => {
        console.log(`Initial check for new website: ${newWebsite.name}`);
        checkWebsiteStatusDirect(newWebsite);
      }, 500);

      return newWebsite.id;
    },
    [checkWebsiteStatusDirect],
  );

  const addMultipleWebsites = useCallback(
    async (websiteData: { name: string; url: string }[]) => {
      const newWebsites: Website[] = websiteData.map(({ name, url }, index) => ({
        id: (Date.now() + index).toString(),
        name: name.trim(),
        url: url.trim(),
        status: 'checking',
        lastChecked: new Date(),
        createdAt: new Date(),
        uptimeHistory: [],
      }));

      setWebsites(prev => {
        const updated = [...prev, ...newWebsites];
        saveWebsites(updated);
        return updated;
      });

      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      newWebsites.forEach((site, index) => {
        setTimeout(() => {
          console.log(`Initial check for new website: ${site.name}`);
          checkWebsiteStatusDirect(site);
        }, 500 * (index + 1));
      });

      return newWebsites.map(site => site.id);
    },
    [checkWebsiteStatusDirect],
  );

  const removeWebsite = useCallback(async (id: string) => {
    setWebsites(prev => {
      const updated = prev.filter(site => site.id !== id);
      saveWebsites(updated);
      return updated;
    });

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const clearAllWebsites = useCallback(async () => {
    console.log('🗑️ [DEBUG] Clearing all websites from storage...');
    try {
      await AsyncStorage.removeItem('websites');
      setWebsites([]);
      console.log('🗑️ [DEBUG] All websites cleared successfully');
    } catch (error) {
      console.log('💥 [DEBUG] Error clearing websites:', error);
    }
  }, []);

  const checkAllWebsites = useCallback(async () => {
    console.log('🔁 [MONITOR] Checking all websites...', websites.length);
    if (websites.length === 0) {
      console.log('🔁 [MONITOR] No websites to check');
      return;
    }
    
    websites.forEach((website, index) => {
      setTimeout(() => {
        console.log(`🔁 [MONITOR] Triggering check for ${website.name} (${website.id})`);
        checkWebsiteStatus(website.id);
      }, 300 * index);
    });
  }, [websites, checkWebsiteStatus]);

  useEffect(() => {
    const initializeMonitoring = async () => {
      const loadedWebsites = await loadWebsites();
      if (loadedWebsites.length > 0) {
        console.log('⚙️ [INIT] Starting initial checks for', loadedWebsites.length, 'websites');
        loadedWebsites.forEach((site, index) => {
          setTimeout(() => {
            console.log(`⚙️ [INIT] Initial check: ${site.name} (${site.id})`);
            // Use a direct check since websites state might not be updated yet
            checkWebsiteStatusDirect(site);
          }, 300 * index);
        });
      }
    };
    
    initializeMonitoring();
  }, [loadWebsites, checkWebsiteStatusDirect]);

  useEffect(() => {
    if (!isLoading && websites.length > 0) {
      console.log('⚙️ [INIT] Monitoring initialized with', websites.length, 'websites');
    }
  }, [isLoading, websites.length]);

  useEffect(() => {
    if (websites.length === 0) {
      console.log('⏱️ [MONITOR] No websites for auto-check');
      return;
    }
    
    console.log(`⏱️ [MONITOR] Setting up auto-check for ${websites.length} websites`);
    const interval = setInterval(() => {
      console.log(`⏱️ [MONITOR] Auto-checking ${websites.length} websites...`);
      websites.forEach((website, index) => {
        setTimeout(() => {
          console.log(`⏱️ [MONITOR] Auto-checking ${website.name}`);
          checkWebsiteStatus(website.id);
        }, 300 * index);
      });
    }, 5 * 60 * 1000);
    
    return () => {
      console.log('🧹 [MONITOR] Clearing auto-check interval');
      clearInterval(interval);
    };
  }, [websites, checkWebsiteStatus]);

  const getWebsiteStats = useCallback((website: Website): WebsiteStats => {
    if (!website.uptimeHistory || website.uptimeHistory.length === 0) {
      return {
        totalUptimeHours: 0,
        totalDowntimeHours: 0,
        uptimePercentage: 0,
        averageResponseTime: 0,
      };
    }
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recentHistory = website.uptimeHistory.filter(record => record.timestamp >= oneDayAgo);
    if (recentHistory.length === 0) {
      return {
        totalUptimeHours: 0,
        totalDowntimeHours: 0,
        uptimePercentage: 0,
        averageResponseTime: 0,
      };
    }
    const onlineRecords = recentHistory.filter(record => record.status === 'online');
    const offlineRecords = recentHistory.filter(record => record.status === 'offline');
    const totalUptimeHours = (onlineRecords.length * 5) / 60;
    const totalDowntimeHours = (offlineRecords.length * 5) / 60;
    const uptimePercentage = (onlineRecords.length / recentHistory.length) * 100;
    const responseTimes = onlineRecords
      .map(record => record.responseTime)
      .filter((time): time is number => time !== undefined);
    const averageResponseTime = responseTimes.length > 0 ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length : 0;
    return {
      totalUptimeHours,
      totalDowntimeHours,
      uptimePercentage,
      averageResponseTime,
    };
  }, []);

  return {
    websites,
    isLoading,
    checkingIds,
    addWebsite,
    addMultipleWebsites,
    removeWebsite,
    checkWebsiteStatus,
    checkWebsiteStatusDirect,
    checkAllWebsites,
    getWebsiteStats,
    clearAllWebsites,
  };
});