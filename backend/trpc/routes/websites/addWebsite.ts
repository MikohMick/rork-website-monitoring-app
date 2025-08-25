import { z } from "zod";
import { publicProcedure } from "../../create-context";
import * as fs from 'fs';
import * as path from 'path';

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

// File-based storage for persistence
const STORAGE_FILE = path.join(process.cwd(), 'websites.json');

function loadWebsites(): Website[] {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const data = fs.readFileSync(STORAGE_FILE, 'utf8');
      const parsed = JSON.parse(data);
      return parsed.map((w: any) => ({
        ...w,
        lastChecked: new Date(w.lastChecked),
        createdAt: new Date(w.createdAt)
      }));
    }
  } catch (error) {
    console.error('Error loading websites:', error);
  }
  return [];
}

function saveWebsites(websites: Website[]): void {
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(websites, null, 2));
  } catch (error) {
    console.error('Error saving websites:', error);
  }
}

// Load websites on startup
let websites: Website[] = loadWebsites();
console.log(`Loaded ${websites.length} websites from storage`);

export { websites, saveWebsites, loadWebsites };

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
    saveWebsites(websites);
    console.log(`Added website: ${input.name} (${input.url}) - Total websites: ${websites.length}`);
    
    return website;
  });