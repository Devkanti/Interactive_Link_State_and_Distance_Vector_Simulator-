import { EdgeId } from '../types';

export type ChaosFaultType =
  | 'LINK_SEVER'
  | 'LINK_RESTORE'
  | 'ROUTER_CRASH'
  | 'ROUTER_RECOVER'
  | 'METRIC_JITTER'
  | 'LINK_FLAP_START'
  | 'LINK_FLAP_STOP';

export interface ChaosEvent {
  id: string;
  tick: number;
  type: ChaosFaultType;
  targetId: string;
  targetName: string;
  description: string;
  timestamp: number;
}

export interface FlapRecord {
  edgeId: EdgeId;
  interval: number; // ticks per toggle
  currentPhase: 'UP' | 'DOWN';
  lastFlipTick: number;
}

export interface ChaosMonkeyConfig {
  enabled: boolean;
  linkSeverProbability: number; // 0 to 1
  routerCrashProbability: number; // 0 to 1
  metricJitterProbability: number; // 0 to 1
  metricJitterDelta: number; // Max ± delta
  autoRecoveryEnabled: boolean;
  recoveryTicks: number; // Ticks before a severed link or crashed router auto-recovers
}
