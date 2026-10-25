import { EdgeId, NodeId } from '../types';

export interface DVEntry {
  destNodeId: NodeId;
  cost: number;
}

export interface DistanceVectorMessage {
  id: string;
  senderId: NodeId;
  targetNeighborId: NodeId;
  edgeId: EdgeId;
  vector: DVEntry[];
  tick: number;
}

export interface InFlightDVMessage {
  message: DistanceVectorMessage;
  sourceNodeId: NodeId;
  targetNodeId: NodeId;
  edgeId: EdgeId;
  progress: number;
  traversalTicks: number;
  elapsedTicks: number;
}

export interface DVRNodeConfig {
  splitHorizonEnabled?: boolean;
  poisonReverseEnabled?: boolean;
}

export interface DVRConfig {
  infinityThreshold: number; // Cost representing unreachable (default: 16, RIP-style)
  splitHorizonEnabled: boolean; // Do not advertise route back to the neighbor learned from
  poisonReverseEnabled: boolean; // Advertise route as infinity back to the neighbor learned from
  perNodeConfig?: Record<NodeId, DVRNodeConfig>;
}

export interface RoutingLoopInfo {
  cycle: NodeId[];
  destination: NodeId;
}

export interface DVRMetrics {
  totalVectorsTransmitted: number;
  vectorsTransmittedLastTick: number;
  iterationsToConvergence: number;
  isStable: boolean;
  activeLoops: RoutingLoopInfo[];
  countToInfinityEvents: number;
}

export type NeighborVectorTable = Map<NodeId, Map<NodeId, number>>; // neighborId -> destNodeId -> cost

export interface BellmanFordNeighborEval {
  neighborId: NodeId;
  linkCost: number;
  neighborReportedDist: number;
  totalCost: number;
  isWinningNeighbor: boolean;
}

export interface BellmanFordRelaxationRow {
  destination: NodeId;
  previousCost: number;
  previousNextHop: NodeId | null;
  evaluations: BellmanFordNeighborEval[];
  winningNeighbor: NodeId | null;
  winningCost: number;
  hasImprovedOrChanged: boolean;
}

export interface BellmanFordStepExplanation {
  nodeId: NodeId;
  formula: string;
  infinityThreshold: number;
  rows: BellmanFordRelaxationRow[];
}
