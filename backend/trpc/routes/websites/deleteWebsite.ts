import { z } from "zod";
import { publicProcedure } from "../../create-context";
import { websites, saveWebsites } from "./addWebsite";

export default publicProcedure
  .input(z.object({ id: z.string() }))
  .mutation(({ input }) => {
    const index = websites.findIndex(w => w.id === input.id);
    if (index === -1) {
      throw new Error('Website not found');
    }
    
    const deleted = websites.splice(index, 1)[0];
    saveWebsites(websites);
    console.log(`Deleted website: ${deleted.name} - Total websites: ${websites.length}`);
    
    return { success: true, deleted };
  });