export interface ScoreboardTickData {
  tick: number;
  timestamp: number;
  lsrConverged: boolean;
  dvrConverged: boolean;
  lsrMessagesCumulative: number;
  dvrMessagesCumulative: number;
  lsrMessagesDelta: number;
  dvrMessagesDelta: number;
  lsrMemoryBytes: number;
  dvrMemoryBytes: number;
  dvrActiveLoopsCount: number;
  hasActiveDisruption: boolean;
  eventDescription?: string;
}

export interface DisruptionRecoveryRecord {
  id: string;
  disruptionTick: number;
  description: string;
  lsrConvergedTick: number | null;
  dvrConvergedTick: number | null;
  lsrDurationTicks: number | null;
  dvrDurationTicks: number | null;
  lsrMessagesDuringRecovery: number;
  dvrMessagesDuringRecovery: number;
  winner: 'LSR' | 'DVR' | 'TIE' | 'PENDING';
}

export interface ComparativeMetricsSummary {
  currentTick: number;
  lsrConverged: boolean;
  dvrConverged: boolean;
  lsrTotalMessages: number;
  dvrTotalMessages: number;
  lsrMemoryBytes: number;
  dvrMemoryBytes: number;
  totalLoopTicks: number;
  currentActiveLoops: number;
  recoveryRecords: DisruptionRecoveryRecord[];
  latestRecovery?: DisruptionRecoveryRecord;
}
