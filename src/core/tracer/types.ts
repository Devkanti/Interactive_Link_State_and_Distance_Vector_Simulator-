import { EdgeId, NodeId } from '../types';

export type TracePacketStatus =
  | 'IN_FLIGHT'
  | 'DELIVERED'
  | 'TTL_EXPIRED'
  | 'NO_ROUTE_DROP'
  | 'LINK_DOWN_DROP';

export interface TraceHop {
  nodeId: NodeId;
  ttlRemaining: number;
  timestampTick: number;
}

export interface TracePacket {
  id: string;
  sourceId: NodeId;
  destId: NodeId;
  currentHop: NodeId;
  nextHop: NodeId | null;
  edgeId: EdgeId | null;
  ttl: number;
  initialTtl: number;
  payload: string;
  status: TracePacketStatus;
  hopHistory: TraceHop[];
  cycleDetected: boolean;
  cycleNodes?: NodeId[];
  dropReason?: string;
  createdAtTick: number;
  finishedAtTick?: number;
  totalHops: number;
  progress: number; // 0 to 1 for visual animation between currentHop and nextHop
}
