export type QueueLevel = 'short' | 'medium' | 'long';

export interface QueueReport {
  id: string;
  eatery_id: string;
  stall_id?: string;          // null = eatery-level report
  level: QueueLevel;
  estimated_minutes?: number;
  device_id?: string;         // for anonymous reports
  user_id?: string;           // for logged-in reports
  confirmations: number;      // how many people confirmed this report
  created_at: string;
  expires_at: string;         // auto-set to created_at + 30 mins
}

// Aggregated status shown on map / detail screen
export interface QueueStatus {
  eatery_id: string;
  stall_id?: string;
  level: QueueLevel | 'no_data';
  estimated_minutes?: number;
  report_count: number;
  latest_report_at?: string;
  freshness_percent: number;  // 100 = just reported, 0 = expired
}
