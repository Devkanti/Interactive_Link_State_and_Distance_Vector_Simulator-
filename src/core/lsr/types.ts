import { EdgeId, NodeId, RoutingTable } from '../types';

export interface LSPNeighbor {
  neighborId: NodeId;
  cost: number;
}

export interface LinkStatePacket {
  id: string; // Unique packet tracking ID
  originatorId: NodeId; // Router that generated this link-state announcement
  senderId: NodeId; // Hop-by-hop forwarder that transmitted this packet across current link
  sequenceNumber: number; // Monotonically increasing sequence number
  age: number; // TTL / Age counter for LSA
  neighbors: LSPNeighbor[]; // Direct neighbors and link costs known to originator
  createdAtTick: number;
}

export interface LSDBEntry {
  originatorId: NodeId;
  sequenceNumber: number;
  age: number;
  neighbors: LSPNeighbor[];
  updatedAtTick: number;
}

export type NodeLSDB = Map<NodeId, LSDBEntry>;

export interface InFlightLSPPacket {
  packet: LinkStatePacket;
  edgeId: EdgeId;
  sourceNodeId: NodeId;
  targetNodeId: NodeId;
  progress: number; // 0 to 1 for visual animation
  traversalTicks: number; // Ticks required to cross link (default 1)
  elapsedTicks: number;
}

export interface DijkstraStep {
  stepIndex: number;
  currentNode: NodeId | null;
  visitedNodes: NodeId[]; // Finalized S set
  unvisitedNodes: NodeId[]; // Candidate Q set
  tentativeDistances: Record<NodeId, number>;
  predecessors: Record<NodeId, NodeId | null>;
  description: string;
}

export interface DijkstraResult {
  rootNode: NodeId;
  distances: Record<NodeId, number>;
  predecessors: Record<NodeId, NodeId | null>;
  forwardingTable: RoutingTable;
  shortestPathTree: Array<{ source: NodeId; target: NodeId; cost: number }>;
  steps: DijkstraStep[];
}

export interface LSRMetrics {
  totalLSPsOriginated: number;
  totalLSPsTransmitted: number;
  totalLSPsSuppressedDuplicates: number;
  convergenceTicks: number;
  isConverged: boolean;
}
