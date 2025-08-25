import { publicProcedure } from "../../create-context";
import { websites } from "./addWebsite";

export default publicProcedure
  .query(() => {
    const result = websites.map(website => ({
      ...website,
      uptimePercentage: website.uptime + website.downtime > 0 
        ? Math.round((website.uptime / (website.uptime + website.downtime)) * 100)
        : 0
    }));
    
    return result;
  });