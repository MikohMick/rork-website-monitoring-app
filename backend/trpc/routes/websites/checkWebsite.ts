import { z } from "zod";
import { publicProcedure } from "../../create-context";
import { websites, saveWebsites } from "./addWebsite";

async function checkWebsiteStatus(url: string): Promise<{ status: 'online' | 'offline', responseTime: number }> {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    const response = await fetch(url, {
      method: 'HEAD', // Use HEAD to avoid downloading full content
      signal: controller.signal,
      headers: {
        'User-Agent': 'Website-Monitor/1.0'
      }
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    // Consider 2xx and 3xx as online
    const isOnline = response.status >= 200 && response.status < 400;
    
    console.log(`Checked ${url}: ${response.status} (${responseTime}ms) - ${isOnline ? 'online' : 'offline'}`);
    
    return {
      status: isOnline ? 'online' : 'offline',
      responseTime
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.log(`Failed to check ${url}: ${error instanceof Error ? error.message : 'Unknown error'} (${responseTime}ms)`);
    
    return {
      status: 'offline',
      responseTime
    };
  }
}

export default publicProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ input }) => {
    const website = websites.find(w => w.id === input.id);
    if (!website) {
      throw new Error('Website not found');
    }
    
    console.log(`Manually checking website: ${website.name} (${website.url})`);
    
    const result = await checkWebsiteStatus(website.url);
    
    // Update website status and stats
    const previousStatus = website.status;
    website.status = result.status;
    website.lastChecked = new Date();
    
    // Update uptime/downtime (simplified - in production, track time periods)
    if (result.status === 'online') {
      website.uptime += 1;
    } else {
      website.downtime += 1;
    }
    
    // Save updated website status
    saveWebsites(websites);
    
    console.log(`Updated ${website.name}: ${previousStatus} -> ${result.status}`);
    
    return {
      ...website,
      uptimePercentage: website.uptime + website.downtime > 0 
        ? Math.round((website.uptime / (website.uptime + website.downtime)) * 100)
        : 0,
      responseTime: result.responseTime
    };
  });

// Export the check function for background monitoring
export { checkWebsiteStatus };