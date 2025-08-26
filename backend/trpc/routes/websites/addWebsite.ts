import { z } from "zod";
import { publicProcedure } from "../../create-context";
interface Website {
  id: string;
  name: string;
  url: string;
  status: 'online' | 'offline' | 'checking';
  uptime: number;
  downtime: number;
  lastChecked: Date;
  createdAt: Date;
}

// In-memory storage (works in serverless environments)
let websites: Website[] = [];

// Initialize with some demo data
if (websites.length === 0) {
  websites = [
    {
      id: 'demo-1',
      name: 'Google',
      url: 'https://google.com',
      status: 'online' as const,
      uptime: 100,
      downtime: 0,
      lastChecked: new Date(),
      createdAt: new Date(Date.now() - 86400000) // 1 day ago
    },
    {
      id: 'demo-2',
      name: 'GitHub',
      url: 'https://github.com',
      status: 'online' as const,
      uptime: 95,
      downtime: 5,
      lastChecked: new Date(),
      createdAt: new Date(Date.now() - 172800000) // 2 days ago
    }
  ];
}

console.log(`Initialized with ${websites.length} websites`);

export { websites };

export default publicProcedure
  .input(z.object({ 
    name: z.string().min(1, "Website name is required"),
    url: z.string().url("Please enter a valid URL")
  }))
  .mutation(({ input }) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const website: Website = {
      id,
      name: input.name,
      url: input.url,
      status: 'checking' as const,
      uptime: 0,
      downtime: 0,
      lastChecked: new Date(),
      createdAt: new Date()
    };
    
    websites.push(website);
    console.log(`Added website: ${input.name} (${input.url}) - Total websites: ${websites.length}`);
    
    return website;
  });