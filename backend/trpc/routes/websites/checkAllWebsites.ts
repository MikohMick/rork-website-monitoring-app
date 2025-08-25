import { publicProcedure } from "../../create-context";
import { websites, saveWebsites } from "./addWebsite";
import { checkWebsiteStatus } from "./checkWebsite";
import { sendDowntimeNotification, DEFAULT_USER_ID } from "./notificationService";

export default publicProcedure
  .mutation(async () => {
    console.log(`Checking all ${websites.length} websites...`);
    
    const results = await Promise.allSettled(
      websites.map(async (website) => {
        const result = await checkWebsiteStatus(website.url);
        
        // Update website status and stats
        const previousStatus = website.status;
        website.status = result.status;
        website.lastChecked = new Date();
        
        // Send notification if website went from online to offline
        if (previousStatus === 'online' && result.status === 'offline') {
          try {
            await sendDowntimeNotification(
              DEFAULT_USER_ID,
              website.id,
              website.name,
              new Date()
            );
          } catch (error) {
            console.error(`Failed to send notification for ${website.name}:`, error);
          }
        }
        
        // Update uptime/downtime
        if (result.status === 'online') {
          website.uptime += 1;
        } else {
          website.downtime += 1;
        }
        
        return {
          id: website.id,
          name: website.name,
          previousStatus,
          newStatus: result.status,
          responseTime: result.responseTime
        };
      })
    );
    
    const successful = results.filter(r => r.status === 'fulfilled').map(r => r.value);
    const failed = results.filter(r => r.status === 'rejected').length;
    
    // Save updated website statuses
    saveWebsites(websites);
    
    console.log(`Checked ${successful.length} websites successfully, ${failed} failed`);
    
    return {
      checked: successful.length,
      failed,
      results: successful,
      websites: websites.map(website => ({
        ...website,
        uptimePercentage: website.uptime + website.downtime > 0 
          ? Math.round((website.uptime / (website.uptime + website.downtime)) * 100)
          : 0
      }))
    };
  });