import { publicProcedure } from "../../create-context";
import { websites, saveWebsites } from "./addWebsite";
import { checkWebsiteStatus } from "./checkWebsite";
// import { sendDowntimeNotification, DEFAULT_USER_ID } from "./notificationService";

export default publicProcedure
  .mutation(async () => {
    try {
      console.log(`Checking all ${websites.length} websites...`);
      
      const results = await Promise.allSettled(
        websites.map(async (website) => {
          try {
            const result = await checkWebsiteStatus(website.url);
            
            // Update website status and stats
            const previousStatus = website.status;
            website.status = result.status;
            website.lastChecked = new Date();
            
            // Send notification if website went from online to offline
            // Skip notifications for now to avoid errors
            // if (previousStatus === 'online' && result.status === 'offline') {
            //   try {
            //     await sendDowntimeNotification(
            //       DEFAULT_USER_ID,
            //       website.id,
            //       website.name,
            //       new Date()
            //     );
            //   } catch (error) {
            //     console.error(`Failed to send notification for ${website.name}:`, error);
            //   }
            // }
            
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
          } catch (error) {
            console.error(`Error checking website ${website.name}:`, error);
            // Return a failed result instead of throwing
            return {
              id: website.id,
              name: website.name,
              previousStatus: website.status,
              newStatus: 'offline' as const,
              responseTime: 0,
              error: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        })
      );
      
      const successful = results.filter(r => r.status === 'fulfilled').map(r => r.value);
      const failed = results.filter(r => r.status === 'rejected').length;
      
      // Save updated website statuses
      try {
        saveWebsites(websites);
      } catch (error) {
        console.error('Error saving websites:', error);
      }
      
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
    } catch (error) {
      console.error('Error in checkAllWebsites:', error);
      throw new Error(`Failed to check websites: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });