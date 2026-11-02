export interface MininetEvent {
  id: string;
  type: 'ping' | 'link' | 'protocol' | string;
  timestamp: number;
  src?: string;
  dst?: string;
  status?: string;
  protocol?: string;
  success?: boolean;
  [key: string]: any;
}

export interface MininetStatusResponse {
  online: boolean;
  engine?: string;
  mode?: 'LSR' | 'DVR' | string;
  nodes?: Array<{ id: string; label: string; status: string }>;
  links?: Array<{ id: string; source: string; target: string; cost: number; status: string }>;
  recentEvents?: MininetEvent[];
  timestamp?: number;
  error?: string;
}

export interface KernelRouteEntry {
  dst: string;
  dev?: string;
  gateway?: string;
  metric?: number;
  protocol?: string;
  scope?: string;
  raw?: string;
}

export interface RouterKernelRoutes {
  [routerId: string]: KernelRouteEntry[];
}

export interface MininetPingResult {
  success: boolean;
  src: string;
  dst: string;
  output: string;
  avgRttMs?: number;
  packetLoss?: number;
  raw?: any;
}
