import { supabase } from '@/lib/supabase';
import { Website, DatabaseWebsite } from '@/types/website';

// Helper function to convert database format to app format
const convertFromDatabase = (dbWebsite: DatabaseWebsite): Website => ({
  id: dbWebsite.id,
  name: dbWebsite.name,
  url: dbWebsite.url,
  status: dbWebsite.status,
  uptime: dbWebsite.uptime,
  downtime: dbWebsite.downtime,
  lastChecked: new Date(dbWebsite.last_checked),
  createdAt: new Date(dbWebsite.created_at),
  uptimePercentage: dbWebsite.uptime_percentage,
  lastError: dbWebsite.last_error,
});



export const websiteService = {
  // Get all websites
  async getAll(): Promise<Website[]> {
    console.log('Fetching all websites from Supabase...');
    const { data, error } = await supabase
      .from('websites')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching websites:', error);
      throw new Error(`Failed to fetch websites: ${error.message}`);
    }

    const websites = (data || []).map(convertFromDatabase);
    console.log(`Fetched ${websites.length} websites from Supabase`);
    return websites;
  },

  // Add a new website
  async add(name: string, url: string): Promise<{ id: string }> {
    console.log(`Adding website to Supabase: ${name} (${url})`);
    
    // Generate a unique ID
    const id = `website-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    const newWebsite: DatabaseWebsite = {
      id,
      name,
      url,
      status: 'checking',
      uptime: 0,
      downtime: 0,
      last_checked: now,
      created_at: now,
      uptime_percentage: 0,
    };

    console.log('Inserting website data:', newWebsite);

    const { data, error } = await supabase
      .from('websites')
      .insert([newWebsite])
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      
      // Provide more specific error messages
      if (error.message.includes('relation "websites" does not exist')) {
        throw new Error('Database table "websites" does not exist. Please create the table in Supabase first.');
      } else if (error.message.includes('column') && error.message.includes('does not exist')) {
        throw new Error(`Database schema mismatch: ${error.message}. Please check your table structure.`);
      } else {
        throw new Error(`Failed to add website: ${error.message}`);
      }
    }

    console.log('Website added successfully:', data);
    return { id: data.id };
  },

  // Delete a website
  async delete(id: string): Promise<void> {
    console.log(`Deleting website from Supabase: ${id}`);
    
    const { error } = await supabase
      .from('websites')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting website:', error);
      throw new Error(`Failed to delete website: ${error.message}`);
    }

    console.log('Website deleted successfully');
  },

  // Check a single website status
  async checkStatus(id: string): Promise<{ status: 'online' | 'offline' }> {
    console.log(`Checking website status: ${id}`);
    
    // Get the website first
    const { data: website, error: fetchError } = await supabase
      .from('websites')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching website for status check:', fetchError);
      throw new Error(`Failed to fetch website: ${fetchError.message}`);
    }

    if (!website) {
      throw new Error('Website not found');
    }

    // Check the website status using multiple methods with fallbacks
    let status: 'online' | 'offline' = 'offline';
    let lastError: string | undefined;

    console.log(`Checking URL: ${website.url}`);
    
    // List of CORS proxy services to try
    const proxyServices = [
      {
        name: 'allorigins.win',
        url: (targetUrl: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`,
        parseResponse: (data: any): { success: boolean; error?: string } => {
          if (data.status && data.status.http_code) {
            return {
              success: data.status.http_code >= 200 && data.status.http_code < 400,
              error: data.status.http_code >= 400 ? `HTTP ${data.status.http_code}` : undefined
            };
          } else if (data.contents) {
            return { success: true };
          }
          return { success: false, error: 'No content received' };
        }
      },
      {
        name: 'cors-anywhere (heroku)',
        url: (targetUrl: string) => `https://cors-anywhere.herokuapp.com/${targetUrl}`,
        parseResponse: (): { success: boolean; error?: string } => ({ success: true })
      },
      {
        name: 'thingproxy',
        url: (targetUrl: string) => `https://thingproxy.freeboard.io/fetch/${targetUrl}`,
        parseResponse: (): { success: boolean; error?: string } => ({ success: true })
      }
    ];

    // Try each proxy service
    for (const proxy of proxyServices) {
      try {
        console.log(`Trying ${proxy.name} proxy...`);
        
        const proxyUrl = proxy.url(website.url);
        
        // Create a timeout promise (shorter timeout for faster fallback)
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 10000);
        });
        
        const fetchPromise = fetch(proxyUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Website Monitor App',
          },
        });
        
        const response = await Promise.race([fetchPromise, timeoutPromise]);
        
        if (response.ok) {
          let result;
          
          try {
            const data = await response.json();
            result = proxy.parseResponse(data);
          } catch {
            // If JSON parsing fails, assume success if we got a response
            result = { success: true };
          }
          
          if (result.success) {
            status = 'online';
            lastError = undefined;
            console.log(`Website ${id} is online (via ${proxy.name})`);
            break;
          } else {
            lastError = result.error || `Failed via ${proxy.name}`;
            console.log(`Website ${id} failed via ${proxy.name}: ${lastError}`);
          }
        } else {
          lastError = `${proxy.name} proxy error: ${response.status}`;
          console.log(`Proxy ${proxy.name} failed: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        lastError = `${proxy.name} error: ${errorMsg}`;
        console.log(`Proxy ${proxy.name} error:`, errorMsg);
        continue; // Try next proxy
      }
    }

    // If all proxies failed, try a direct fetch (will only work for CORS-enabled sites)
    if (status === 'offline') {
      try {
        console.log('Trying direct fetch as last resort...');
        
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Direct fetch timeout')), 5000);
        });
        
        const fetchPromise = fetch(website.url, {
          method: 'HEAD', // Use HEAD to minimize data transfer
          mode: 'no-cors', // This will succeed but we won't get response details
        });
        
        await Promise.race([fetchPromise, timeoutPromise]);
        
        // If we reach here without error, the site is likely reachable
        status = 'online';
        lastError = undefined;
        console.log(`Website ${id} is online (direct fetch)`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Direct fetch failed';
        lastError = lastError || errorMsg;
        console.log('Direct fetch failed:', errorMsg);
      }
    }

    // Update the website status
    const now = new Date().toISOString();
    const newUptime = status === 'online' ? website.uptime + 1 : website.uptime;
    const newDowntime = status === 'offline' ? website.downtime + 1 : website.downtime;
    const totalChecks = newUptime + newDowntime;
    const uptimePercentage = totalChecks > 0 ? (newUptime / totalChecks) * 100 : 0;

    const { error: updateError } = await supabase
      .from('websites')
      .update({
        status,
        uptime: newUptime,
        downtime: newDowntime,
        last_checked: now,
        uptime_percentage: uptimePercentage,
        last_error: lastError,
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating website status:', updateError);
      throw new Error(`Failed to update website status: ${updateError.message}`);
    }

    console.log(`Website ${id} status updated: ${status}`);
    return { status };
  },

  // Check all websites
  async checkAll(): Promise<{ checked: number; failed: number }> {
    console.log('Checking all websites...');
    
    const websites = await this.getAll();
    let checked = 0;
    let failed = 0;

    // Check each website
    for (const website of websites) {
      try {
        await this.checkStatus(website.id);
        checked++;
      } catch (error) {
        console.error(`Failed to check website ${website.id}:`, error);
        failed++;
      }
    }

    console.log(`Checked ${checked} websites, ${failed} failed`);
    return { checked, failed };
  },

  // Subscribe to real-time changes
  subscribeToChanges(callback: (websites: Website[]) => void) {
    console.log('Setting up real-time subscription...');
    
    const subscription = supabase
      .channel('websites')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'websites',
        },
        async () => {
          // Fetch updated data when changes occur
          try {
            const websites = await this.getAll();
            callback(websites);
          } catch (error) {
            console.error('Error fetching updated websites:', error);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Unsubscribing from real-time changes...');
      supabase.removeChannel(subscription);
    };
  },
};