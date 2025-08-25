export interface Website {
  id: string;
  name: string;
  url: string;
  status: 'online' | 'offline' | 'checking';
  lastChecked: Date;
  createdAt: Date;
  uptimeHistory: UptimeRecord[];
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