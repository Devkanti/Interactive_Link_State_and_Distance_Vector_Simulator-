/**
 * Core type definitions for RoutingSimulator
 */

export type NodeStatus = 'ACTIVE' | 'CRASHED';

export type EdgeStatus = 'UP' | 'DOWN' | 'FLAPPING';

export type NodeId = string;
export type EdgeId = string;

export interface NetworkNode {
  id: NodeId;
  label: string;
  x: number;
  y: number;
  status: NodeStatus;
}

export interface NetworkEdge {
  id: EdgeId;
  source: NodeId;
  target: NodeId;
  cost: number;
  status: EdgeStatus;
  directed: boolean;
  flapInterval?: number; // In ticks: flips status every flapInterval ticks
  flapTickCounter?: number;
}

export interface RoutingTableEntry {
  destination: NodeId;
  nextHop: NodeId | null;
  cost: number;
  path?: NodeId[];
  updatedAtTick?: number;
}

export type RoutingTable = Record<NodeId, RoutingTableEntry>;

export interface GraphSnapshot {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}

export interface StateSnapshot {
  tick: number;
  timestamp: number;
  graph: GraphSnapshot;
  routingTables: Record<NodeId, RoutingTable>;
  eventDescription?: string;
  isEventMarker?: boolean;
  activePacketsCount?: number;
  metadata?: Record<string, unknown>;
}
