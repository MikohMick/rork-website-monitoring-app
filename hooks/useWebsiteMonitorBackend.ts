import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

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

  const API_BASE = (() => {
    const env = process.env.EXPO_PUBLIC_RORK_API_BASE_URL ?? '';
    if (env) return env.replace(/\/$/, '');
    return 'https://workspace-n6g0f7vla-michaels-projects-c8a13e6f.vercel.app';
  })();

  const get = async <T,>(path: string): Promise<T> => {
    const url = `${API_BASE}${path}`;
    console.log('REST GET:', url);
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error(`GET ${path} ${res.status}`);
    return res.json() as Promise<T>;
  };
  const post = async <T,>(path: string, body?: unknown): Promise<T> => {
    const url = `${API_BASE}${path}`;
    console.log('REST POST:', url, body);
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    if (!res.ok) throw new Error(`POST ${path} ${res.status}`);
    return res.json() as Promise<T>;
  };
  const del = async <T,>(path: string, body?: unknown): Promise<T> => {
    const url = `${API_BASE}${path}`;
    console.log('REST DELETE:', url, body);
    const res = await fetch(url, { method: 'DELETE', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    if (!res.ok) throw new Error(`DELETE ${path} ${res.status}`);
    return res.json() as Promise<T>;
  };

  const fetchAll = async () => {
    try {
      setIsLoading(true);
      const data = await get<Website[]>(`/api/websites`);
      const hydrated = data.map(w => ({ ...w, lastChecked: new Date(w.lastChecked), createdAt: new Date(w.createdAt) }));
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
        const result = await post<{ id: string }>(`/api/websites`, { name, url });
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
          websiteData.map(({ name, url }) => post<{ id: string }>(`/api/websites`, { name, url }))
        );
        await fetchAll();
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        return results.map(r => r.id);
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
        await del(`/api/websites/${encodeURIComponent(id)}`);
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
        const result = await post(`/api/websites/${encodeURIComponent(id)}/check`);
        await fetchAll();
        return result as unknown;
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
      const result = await post<{ checked: number; failed: number }>(`/api/websites/check-all`);
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
        websites.map(website => del(`/api/websites/${encodeURIComponent(website.id)}`))
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