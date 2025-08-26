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

    // Check the website status using a reliable CORS proxy
    let status: 'online' | 'offline' = 'offline';
    let lastError: string | undefined;

    try {
      console.log(`Checking URL: ${website.url}`);
      
      // Use allorigins.win which is reliable and free
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(website.url)}`;
      
      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 15000);
      });
      
      const fetchPromise = fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      const response = await Promise.race([fetchPromise, timeoutPromise]);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Proxy response received');
        
        // Check if the proxy successfully fetched the website
        if (data.status && data.status.http_code) {
          // Use the HTTP status code from the proxy
          status = (data.status.http_code >= 200 && data.status.http_code < 400) ? 'online' : 'offline';
          if (status === 'offline') {
            lastError = `HTTP ${data.status.http_code}`;
          }
        } else if (data.contents) {
          // If we got content, the site is likely online
          status = 'online';
        } else {
          status = 'offline';
          lastError = 'No content received';
        }
      } else {
        status = 'offline';
        lastError = `Proxy error: ${response.status} ${response.statusText}`;
      }
    } catch (error) {
      console.error('Error checking website:', error);
      status = 'offline';
      lastError = error instanceof Error ? error.message : 'Network error';
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