import { publicProcedure } from "../../create-context";
import { websites, saveWebsites } from "./addWebsite";
import { checkWebsiteStatus } from "./checkWebsite";
import { sendDowntimeNotification, DEFAULT_USER_ID } from "./notificationService";

export async function runCheckAllWebsites() {
  console.log(`Checking all ${websites.length} websites...`);

  const results = await Promise.allSettled(
    websites.map(async (website) => {
      const result = await checkWebsiteStatus(website.url);

      const previousStatus = website.status;
      website.status = result.status;
      website.lastChecked = new Date();

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
        responseTime: result.responseTime,
      };
    })
  );

  const successful = results.filter((r) => r.status === 'fulfilled').map((r) => r.value as {
    id: string;
    name: string;
    previousStatus: 'online' | 'offline' | 'checking';
    newStatus: 'online' | 'offline' | 'checking';
    responseTime: number;
  });
  const failed = results.filter((r) => r.status === 'rejected').length;

  saveWebsites(websites);

  console.log(`Checked ${successful.length} websites successfully, ${failed} failed`);

  return {
    checked: successful.length,
    failed,
    results: successful,
    websites: websites.map((website) => ({
      ...website,
      uptimePercentage:
        website.uptime + website.downtime > 0
          ? Math.round((website.uptime / (website.uptime + website.downtime)) * 100)
          : 0,
    })),
  };
}

export default publicProcedure.mutation(async () => {
  return runCheckAllWebsites();
});