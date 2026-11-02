import { NetworkGraph } from '../NetworkGraph';
import { EdgeId, NodeId } from '../types';

export interface PingHopSegment {
  fromNodeId: NodeId;
  toNodeId: NodeId;
  edgeId?: EdgeId;
  cost: number;
}

export interface ActiveAnimatedPing {
  id: string;
  sourceId: NodeId;
  destId: NodeId;
  sourceLabel: string;
  destLabel: string;
  forwardPath: NodeId[];
  returnPath: NodeId[];
  activePath: NodeId[];
  currentHopIndex: number;
  progress: number; // 0.0 to 1.0 along current hop
  phase: 'REQUEST' | 'REPLY' | 'DROPPED';
  ttl: number;
  initialTtl: number;
  color: string;
  label: string;
  statusText: string;
  isComplete: boolean;
  dropNodeId?: NodeId;
  startTime: number;
  hopDurationMs: number;
}

export interface CanvasActionBanner {
  id: string;
  type:
    | 'PING_SUCCESS'
    | 'PING_DROP'
    | 'LINK_DOWN'
    | 'LINK_UP'
    | 'PROTOCOL_SWITCH'
    | 'CHAOS_STRIKE'
    | 'METRIC_JITTER'
    | 'ROUTER_CRASH'
    | 'LINK_FLAP';
  title: string;
  subtitle?: string;
  color: string;
  timestamp: number;
  durationMs: number;
}

export interface NodePulseRing {
  id: string;
  nodeId: NodeId;
  color: string;
  startTime: number;
  durationMs: number;
}

export interface ChaosStrikeEffect {
  id: string;
  type: 'LINK_SEVER' | 'ROUTER_CRASH' | 'METRIC_SPIKE' | 'FLAP';
  sourceX: number;
  sourceY: number;
  targetX?: number;
  targetY?: number;
  color: string;
  label?: string;
  startTime: number;
  durationMs: number;
}

/**
 * Normalizes router identifiers across canvas ('A', 'B') and Mininet ('r1', 'r2', 'Router A').
 */
export function normalizeNodeId(id: string, availableNodeIds: NodeId[]): NodeId {
  const clean = id.trim();
  // Exact match
  if (availableNodeIds.includes(clean)) return clean;
  const lower = clean.toLowerCase();
  const foundExactLower = availableNodeIds.find((n) => n.toLowerCase() === lower);
  if (foundExactLower) return foundExactLower;

  // 'r1', 'r2' -> index 1 -> letter 'A', 'B' or 'R1', 'R2'
  if (lower.startsWith('r') && !isNaN(Number(lower.slice(1)))) {
    const idx = Number(lower.slice(1));
    const letter = String.fromCharCode(64 + idx);
    const foundLetter = availableNodeIds.find((n) => n.toUpperCase() === letter);
    if (foundLetter) return foundLetter;

    const rMatch = availableNodeIds.find((n) => n.toLowerCase() === lower);
    if (rMatch) return rMatch;
  }

  // 'c1', 'c2' -> 'Core1', 'Core2' or vice versa
  if (lower.startsWith('c') && !isNaN(Number(lower.slice(1)))) {
    const idx = Number(lower.slice(1));
    const coreMatch = availableNodeIds.find((n) => n.toLowerCase() === `core${idx}` || n.toLowerCase() === `c${idx}`);
    if (coreMatch) return coreMatch;
  }
  if (lower.startsWith('core') && !isNaN(Number(lower.slice(4)))) {
    const idx = Number(lower.slice(4));
    const cMatch = availableNodeIds.find((n) => n.toLowerCase() === `core${idx}` || n.toLowerCase() === `c${idx}`);
    if (cMatch) return cMatch;
  }

  // 'Router A', 'Router 1', 'Router R1'
  if (lower.startsWith('router')) {
    const rest = clean.replace(/router/i, '').replace(/_/g, '').trim();
    const foundRest = availableNodeIds.find((n) => n.toLowerCase() === rest.toLowerCase());
    if (foundRest) return foundRest;
    if (rest.length === 1 && rest.match(/[A-Z]/i)) {
      const idx = rest.toUpperCase().charCodeAt(0) - 64;
      const foundR = availableNodeIds.find((n) => n.toLowerCase() === `r${idx}`);
      if (foundR) return foundR;
    }
  }

  // Single letter 'A', 'B' -> 'r1', 'r2' or 'R1', 'R2'
  if (clean.length === 1 && clean.match(/[A-Z]/i)) {
    const idx = clean.toUpperCase().charCodeAt(0) - 64;
    const rKey = `r${idx}`;
    const foundR = availableNodeIds.find((n) => n.toLowerCase() === rKey);
    if (foundR) return foundR;
  }

  return clean;
}

/**
 * Computes shortest path on current active network topology (respecting UP link statuses).
 */
export function findShortestPath(
  graph: NetworkGraph,
  sourceId: NodeId,
  destId: NodeId
): { path: NodeId[]; reachable: boolean; totalCost: number } {
  const allNodes = graph.getNodes();
  const nodeIds = allNodes.map((n) => n.id);
  const normSrc = normalizeNodeId(sourceId, nodeIds);
  const normDst = normalizeNodeId(destId, nodeIds);

  if (normSrc === normDst) {
    return { path: [normSrc], reachable: true, totalCost: 0 };
  }

  const srcNode = graph.getNode(normSrc);
  const dstNode = graph.getNode(normDst);
  if (!srcNode || !dstNode || srcNode.status !== 'ACTIVE' || dstNode.status !== 'ACTIVE') {
    return { path: [normSrc], reachable: false, totalCost: Infinity };
  }

  // Dijkstra SPF
  const distances: Record<NodeId, number> = {};
  const previous: Record<NodeId, NodeId | null> = {};
  const unvisited = new Set<NodeId>();

  for (const n of allNodes) {
    distances[n.id] = Infinity;
    previous[n.id] = null;
    if (n.status === 'ACTIVE') {
      unvisited.add(n.id);
    }
  }
  distances[normSrc] = 0;

  while (unvisited.size > 0) {
    let currMinNode: NodeId | null = null;
    let currMinDist = Infinity;

    for (const nid of unvisited) {
      if (distances[nid] < currMinDist) {
        currMinDist = distances[nid];
        currMinNode = nid;
      }
    }

    if (!currMinNode || currMinDist === Infinity) break;
    if (currMinNode === normDst) break;

    unvisited.delete(currMinNode);

    const neighbors = graph.getNeighbors(currMinNode, true);
    for (const { neighborId, cost, edge } of neighbors) {
      if (!unvisited.has(neighborId)) continue;
      if (!graph.isEdgeEffectivelyUp(edge)) continue;

      const alt = currMinDist + cost;
      if (alt < distances[neighborId]) {
        distances[neighborId] = alt;
        previous[neighborId] = currMinNode;
      }
    }
  }

  if (distances[normDst] === Infinity || !previous[normDst]) {
    // If not reachable, find partial path up to closest node
    return { path: [normSrc], reachable: false, totalCost: Infinity };
  }

  // Reconstruct path
  const path: NodeId[] = [];
  let curr: NodeId | null = normDst;
  while (curr) {
    path.unshift(curr);
    curr = previous[curr];
  }

  return { path, reachable: true, totalCost: distances[normDst] };
}
