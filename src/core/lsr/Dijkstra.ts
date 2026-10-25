import { NodeId, RoutingTable } from '../types';
import { DijkstraResult, DijkstraStep, NodeLSDB } from './types';

export class Dijkstra {
  /**
   * Builds an adjacency map from a router's synchronized LSDB.
   * Only includes bidirectional operational links if both routers agree,
   * or direct advertised neighbors.
   */
  public static buildAdjacencyFromLSDB(
    lsdb: NodeLSDB
  ): Map<NodeId, Map<NodeId, number>> {
    const adj = new Map<NodeId, Map<NodeId, number>>();

    // Initialize all originators in the database
    for (const [originator, entry] of lsdb.entries()) {
      if (!adj.has(originator)) {
        adj.set(originator, new Map());
      }
      for (const neighbor of entry.neighbors) {
        if (!adj.has(neighbor.neighborId)) {
          adj.set(neighbor.neighborId, new Map());
        }
        adj.get(originator)!.set(neighbor.neighborId, neighbor.cost);
      }
    }

    return adj;
  }

  /**
   * Computes Shortest Path First tree using Dijkstra's algorithm.
   * Can run either on an LSDB or directly on an adjacency map.
   * Also captures detailed steps for educational visualization.
   */
  public static compute(
    rootNode: NodeId,
    adjacencyOrLSDB: Map<NodeId, Map<NodeId, number>> | NodeLSDB,
    allKnownNodes?: NodeId[]
  ): DijkstraResult {
    let adj: Map<NodeId, Map<NodeId, number>>;
    if (adjacencyOrLSDB.size === 0) {
      adj = new Map();
    } else {
      const firstVal = adjacencyOrLSDB.values().next().value;
      if (firstVal instanceof Map) {
        adj = adjacencyOrLSDB as Map<NodeId, Map<NodeId, number>>;
      } else {
        adj = Dijkstra.buildAdjacencyFromLSDB(adjacencyOrLSDB as NodeLSDB);
      }
    }

    // Collect all unique nodes in the topology
    const nodeSet = new Set<NodeId>(allKnownNodes || []);
    nodeSet.add(rootNode);
    for (const [u, neighbors] of adj.entries()) {
      nodeSet.add(u);
      for (const v of neighbors.keys()) {
        nodeSet.add(v);
      }
    }

    const allNodes = Array.from(nodeSet);
    const dist: Record<NodeId, number> = {};
    const prev: Record<NodeId, NodeId | null> = {};
    const unvisited = new Set<NodeId>(allNodes);
    const visited: NodeId[] = [];
    const steps: DijkstraStep[] = [];

    // Initialization
    for (const node of allNodes) {
      dist[node] = node === rootNode ? 0 : Infinity;
      prev[node] = null;
    }

    steps.push({
      stepIndex: 0,
      currentNode: null,
      visitedNodes: [],
      unvisitedNodes: Array.from(unvisited),
      tentativeDistances: { ...dist },
      predecessors: { ...prev },
      description: `Initialized tentative distances from root ${rootNode}: dist[${rootNode}] = 0, others = \u221E`,
    });

    let stepCounter = 1;

    while (unvisited.size > 0) {
      // Find unvisited node with minimum tentative distance
      let minDist = Infinity;
      let curr: NodeId | null = null;

      for (const node of unvisited) {
        if (dist[node] < minDist) {
          minDist = dist[node];
          curr = node;
        }
      }

      // If remaining unvisited nodes are unreachable, we are done
      if (curr === null || minDist === Infinity) {
        break;
      }

      unvisited.delete(curr);
      visited.push(curr);

      // Relax neighbors of curr
      const currNeighbors = adj.get(curr) || new Map<NodeId, number>();
      const relaxationNotes: string[] = [];

      for (const [neighbor, edgeCost] of currNeighbors.entries()) {
        if (!unvisited.has(neighbor)) continue;

        const newDist = dist[curr] + edgeCost;
        if (newDist < dist[neighbor]) {
          dist[neighbor] = newDist;
          prev[neighbor] = curr;
          relaxationNotes.push(
            `Relaxed ${neighbor}: new dist = ${newDist} via ${curr}`
          );
        }
      }

      steps.push({
        stepIndex: stepCounter++,
        currentNode: curr,
        visitedNodes: [...visited],
        unvisitedNodes: Array.from(unvisited),
        tentativeDistances: { ...dist },
        predecessors: { ...prev },
        description:
          relaxationNotes.length > 0
            ? `Finalized node ${curr} (dist: ${minDist}). ${relaxationNotes.join('; ')}`
            : `Finalized node ${curr} (dist: ${minDist}). No neighbor improvements.`,
      });
    }

    // Build Forwarding Table & Shortest Path Tree
    const forwardingTable: RoutingTable = {};
    const shortestPathTree: Array<{ source: NodeId; target: NodeId; cost: number }> = [];

    for (const dest of allNodes) {
      if (dest === rootNode) {
        forwardingTable[dest] = {
          destination: dest,
          nextHop: dest,
          cost: 0,
          path: [dest],
        };
        continue;
      }

      if (dist[dest] === Infinity || prev[dest] === null) {
        forwardingTable[dest] = {
          destination: dest,
          nextHop: null,
          cost: Infinity,
          path: [],
        };
        continue;
      }

      // Reconstruct path from root to dest
      const path: NodeId[] = [];
      let step: NodeId | null = dest;
      while (step !== null) {
        path.unshift(step);
        if (step === rootNode) break;
        step = prev[step];
      }

      // Next hop is the node right after rootNode along the path
      const nextHop = path.length > 1 ? path[1] : null;

      forwardingTable[dest] = {
        destination: dest,
        nextHop,
        cost: dist[dest],
        path,
      };

      // Add to Shortest Path Tree edges
      if (prev[dest] !== null) {
        const p = prev[dest]!;
        const edgeCost = adj.get(p)?.get(dest) ?? 0;
        shortestPathTree.push({ source: p, target: dest, cost: edgeCost });
      }
    }

    return {
      rootNode,
      distances: dist,
      predecessors: prev,
      forwardingTable,
      shortestPathTree,
      steps,
    };
  }
}
