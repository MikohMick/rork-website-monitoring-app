export interface Website {
  id: string;
  name: string;
  url: string;
  status: 'online' | 'offline' | 'checking';
  uptime: number;
  downtime: number;
  lastChecked: Date;
  createdAt: Date;
  uptimePercentage: number;
  lastError?: string;
}

export interface UptimeRecord {
  timestamp: Date;
  status: 'online' | 'offline';
  responseTime?: number;
}

export interface WebsiteStats {
  totalUptimeHours: number;
  totalDowntimeHours: number;
  uptimePercentage: number;
  averageResponseTime: number;
}

// Supabase database types
export interface DatabaseWebsite {
  id: string;
  name: string;
  url: string;
  status: 'online' | 'offline' | 'checking';
  uptime: number;
  downtime: number;
  last_checked: string;
  created_at: string;
  uptime_percentage: number;
  last_error?: string;
}