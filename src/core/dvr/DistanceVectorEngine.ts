import { NetworkGraph } from '../NetworkGraph';
import { NodeId, RoutingTable } from '../types';
import {
  DistanceVectorMessage,
  DVRConfig,
  DVRMetrics,
  DVRNodeConfig,
  InFlightDVMessage,
  NeighborVectorTable,
  RoutingLoopInfo,
} from './types';

export class DistanceVectorEngine {
  private graph: NetworkGraph;
  private config: DVRConfig;

  // Local routing tables: nodeId -> RoutingTable
  private routingTables: Map<NodeId, RoutingTable> = new Map();

  // Neighbor vectors stored by each router:
  // routerId -> (neighborId -> (destId -> cost))
  private neighborVectors: Map<NodeId, NeighborVectorTable> = new Map();

  private inFlightMessages: InFlightDVMessage[] = [];
  private messageIdCounter = 0;

  // Track previous graph edge fingerprint to detect changes
  private lastKnownEdgeFingerprint = '';

  private metrics: DVRMetrics = {
    totalVectorsTransmitted: 0,
    vectorsTransmittedLastTick: 0,
    iterationsToConvergence: 0,
    isStable: false,
    activeLoops: [],
    countToInfinityEvents: 0,
  };

  constructor(graph: NetworkGraph, config?: Partial<DVRConfig>) {
    this.graph = graph;
    this.config = {
      infinityThreshold: 16,
      splitHorizonEnabled: false,
      poisonReverseEnabled: false,
      perNodeConfig: {},
      ...config,
    };
    this.initialize();
  }

  // --- Configuration Toggles ---

  public getConfig(): DVRConfig {
    return {
      ...this.config,
      perNodeConfig: { ...this.config.perNodeConfig },
    };
  }

  public setConfig(config: Partial<DVRConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      perNodeConfig: {
        ...this.config.perNodeConfig,
        ...(config.perNodeConfig || {}),
      },
    };
  }

  public setGlobalSplitHorizon(enabled: boolean): void {
    this.config.splitHorizonEnabled = enabled;
  }

  public setGlobalPoisonReverse(enabled: boolean): void {
    this.config.poisonReverseEnabled = enabled;
  }

  public setInfinityThreshold(threshold: number): void {
    this.config.infinityThreshold = Math.max(2, threshold);
  }

  public setNodeConfig(nodeId: NodeId, nodeConfig: DVRNodeConfig): void {
    if (!this.config.perNodeConfig) {
      this.config.perNodeConfig = {};
    }
    this.config.perNodeConfig[nodeId] = {
      ...this.config.perNodeConfig[nodeId],
      ...nodeConfig,
    };
  }

  public getNodeEffectiveConfig(nodeId: NodeId): {
    splitHorizonEnabled: boolean;
    poisonReverseEnabled: boolean;
  } {
    const perNode = this.config.perNodeConfig?.[nodeId];
    return {
      splitHorizonEnabled:
        perNode?.splitHorizonEnabled ?? this.config.splitHorizonEnabled,
      poisonReverseEnabled:
        perNode?.poisonReverseEnabled ?? this.config.poisonReverseEnabled,
    };
  }

  // --- Initialization ---

  public initialize(): void {
    this.routingTables.clear();
    this.neighborVectors.clear();
    this.inFlightMessages = [];

    const nodes = this.graph.getNodes();
    const allNodeIds = nodes.map((n) => n.id);

    for (const node of nodes) {
      const table: RoutingTable = {};
      const neighborTable: NeighborVectorTable = new Map();

      if (node.status === 'ACTIVE') {
        const directNeighbors = this.graph.getNeighbors(node.id, true);
        const directNeighborMap = new Map<NodeId, number>();
        for (const n of directNeighbors) {
          directNeighborMap.set(n.neighborId, n.cost);
          neighborTable.set(n.neighborId, new Map());
        }

        for (const dest of allNodeIds) {
          if (dest === node.id) {
            table[dest] = {
              destination: dest,
              nextHop: dest,
              cost: 0,
              path: [dest],
            };
          } else if (directNeighborMap.has(dest)) {
            const cost = directNeighborMap.get(dest)!;
            table[dest] = {
              destination: dest,
              nextHop: dest,
              cost,
              path: [node.id, dest],
            };
          } else {
            table[dest] = {
              destination: dest,
              nextHop: null,
              cost: this.config.infinityThreshold,
              path: [],
            };
          }
        }
      }

      this.routingTables.set(node.id, table);
      this.neighborVectors.set(node.id, neighborTable);
    }

    this.lastKnownEdgeFingerprint = this.computeEdgeFingerprint();
    this.metrics.isStable = false;
    this.metrics.iterationsToConvergence = 0;
    this.metrics.activeLoops = [];
  }

  private computeEdgeFingerprint(): string {
    return this.graph
      .getEdges()
      .map((e) => `${e.id}:${e.status}:${e.cost}`)
      .sort()
      .join('|');
  }

  // --- Advertisements & Mitigations ---

  /**
   * Triggers initial vector advertisements to all adjacent neighbors.
   */
  public advertiseAll(tick = 0): void {
    const activeNodes = this.graph.getNodes().filter((n) => n.status === 'ACTIVE');
    let messagesSent = 0;

    for (const node of activeNodes) {
      const neighbors = this.graph.getNeighbors(node.id, true);
      for (const neighbor of neighbors) {
        this.queueVectorAdvertisement(node.id, neighbor.neighborId, neighbor.edgeId, tick);
        messagesSent++;
      }
    }

    this.metrics.vectorsTransmittedLastTick = messagesSent;
    this.metrics.isStable = false;
  }

  /**
   * Prepares and queues a distance vector message from sender to target neighbor.
   * Enforces Split Horizon and Poison Reverse when enabled.
   */
  private queueVectorAdvertisement(
    senderId: NodeId,
    targetNeighborId: NodeId,
    edgeId: string,
    tick: number
  ): void {
    const senderTable = this.routingTables.get(senderId);
    if (!senderTable) return;

    const { splitHorizonEnabled, poisonReverseEnabled } =
      this.getNodeEffectiveConfig(senderId);

    const entries: Array<{ destNodeId: NodeId; cost: number }> = [];

    for (const [dest, entry] of Object.entries(senderTable)) {
      let advertisedCost = entry.cost;

      // When route to destination was learned via this target neighbor
      // (i.e. entry.nextHop === targetNeighborId)
      if (entry.nextHop === targetNeighborId && dest !== senderId) {
        if (poisonReverseEnabled) {
          // Poison Reverse: Advertise with metric infinity
          advertisedCost = this.config.infinityThreshold;
        } else if (splitHorizonEnabled) {
          // Split Horizon: Omit from advertisement entirely
          continue;
        }
      }

      entries.push({
        destNodeId: dest,
        cost: Math.min(advertisedCost, this.config.infinityThreshold),
      });
    }

    const message: DistanceVectorMessage = {
      id: `dv-${senderId}->${targetNeighborId}-${tick}-${++this.messageIdCounter}`,
      senderId,
      targetNeighborId,
      edgeId,
      vector: entries,
      tick,
    };

    const inFlight: InFlightDVMessage = {
      message,
      sourceNodeId: senderId,
      targetNodeId: targetNeighborId,
      edgeId,
      progress: 0,
      traversalTicks: 1,
      elapsedTicks: 0,
    };

    this.inFlightMessages.push(inFlight);
    this.metrics.totalVectorsTransmitted++;
  }

  // --- Bellman-Ford Relaxation ---

  /**
   * Performs Bellman-Ford relaxation on a single router:
   * D_x(y) = min_v { c(x, v) + D_v(y) }
   */
  public relaxNode(nodeId: NodeId, tick: number): boolean {
    const node = this.graph.getNode(nodeId);
    if (!node || node.status !== 'ACTIVE') {
      return false;
    }

    const currentTable = this.routingTables.get(nodeId);
    if (!currentTable) return false;

    const allNodeIds = this.graph.getNodes().map((n) => n.id);
    const activeNeighbors = this.graph.getNeighbors(nodeId, true);
    const neighborMap = new Map<NodeId, number>();
    for (const n of activeNeighbors) {
      neighborMap.set(n.neighborId, n.cost);
    }

    const neighborVectorsForNode = this.neighborVectors.get(nodeId) || new Map();
    let hasChanges = false;

    for (const dest of allNodeIds) {
      if (dest === nodeId) {
        if (currentTable[dest]?.cost !== 0 || currentTable[dest]?.nextHop !== nodeId) {
          currentTable[dest] = {
            destination: dest,
            nextHop: nodeId,
            cost: 0,
            path: [nodeId],
            updatedAtTick: tick,
          };
          hasChanges = true;
        }
        continue;
      }

      let minCost = this.config.infinityThreshold;
      let bestNextHop: NodeId | null = null;

      // Bellman-Ford relaxation over all operational neighbors v
      for (const [neighborId, linkCost] of neighborMap.entries()) {
        const neighborVector = neighborVectorsForNode.get(neighborId);
        // If dest not in neighbor vector (e.g. omitted by Split Horizon), treat as unreachable
        const neighborDistToDest =
          neighborVector?.get(dest) ??
          (neighborId === dest ? 0 : this.config.infinityThreshold);

        const totalCostViaNeighbor = linkCost + neighborDistToDest;
        if (totalCostViaNeighbor < minCost) {
          minCost = totalCostViaNeighbor;
          bestNextHop = neighborId;
        }
      }

      // Cap at infinity threshold
      if (minCost >= this.config.infinityThreshold) {
        minCost = this.config.infinityThreshold;
        bestNextHop = null;
      }

      const prevEntry = currentTable[dest];
      const isDifferent =
        !prevEntry ||
        prevEntry.cost !== minCost ||
        prevEntry.nextHop !== bestNextHop;

      if (isDifferent) {
        // Check if cost increased while next hop remains in a loop (Count-to-Infinity indicator)
        if (prevEntry && minCost > prevEntry.cost && minCost < this.config.infinityThreshold) {
          this.metrics.countToInfinityEvents++;
        }

        hasChanges = true;
        const newPath =
          bestNextHop && minCost < this.config.infinityThreshold
            ? [nodeId, bestNextHop, ...(bestNextHop !== dest ? [dest] : [])]
            : [];

        currentTable[dest] = {
          destination: dest,
          nextHop: bestNextHop,
          cost: minCost,
          path: newPath,
          updatedAtTick: tick,
        };
      }
    }

    return hasChanges;
  }

  // --- Step & Simulation Tick ---

  public stepTick(currentTick: number): void {
    let anyChangesOccurred = false;

    // 1. Detect topology changes (link failures, cost changes)
    const currentFingerprint = this.computeEdgeFingerprint();
    if (this.lastKnownEdgeFingerprint !== currentFingerprint) {
      this.lastKnownEdgeFingerprint = currentFingerprint;
      anyChangesOccurred = true;

      // Invalidate vectors from disconnected/down neighbors
      for (const [nodeId, neighborTable] of this.neighborVectors.entries()) {
        const activeNeighbors = new Set(
          this.graph.getNeighbors(nodeId, true).map((n) => n.neighborId)
        );
        for (const recordedNeighbor of neighborTable.keys()) {
          if (!activeNeighbors.has(recordedNeighbor)) {
            neighborTable.delete(recordedNeighbor);
          }
        }
      }
    }

    // 2. Deliver in-flight distance vectors
    const remainingInFlight: InFlightDVMessage[] = [];
    const deliveredMessages: InFlightDVMessage[] = [];

    for (const item of this.inFlightMessages) {
      item.elapsedTicks += 1;
      item.progress = Math.min(1.0, item.elapsedTicks / item.traversalTicks);

      if (item.elapsedTicks >= item.traversalTicks) {
        deliveredMessages.push(item);
      } else {
        remainingInFlight.push(item);
      }
    }
    this.inFlightMessages = remainingInFlight;

    // Apply delivered vectors
    for (const item of deliveredMessages) {
      const targetNode = this.graph.getNode(item.targetNodeId);
      if (!targetNode || targetNode.status !== 'ACTIVE') continue;

      const edge = this.graph.getEdge(item.edgeId);
      if (!edge || !this.graph.isEdgeEffectivelyUp(edge)) continue;

      let neighborTable = this.neighborVectors.get(item.targetNodeId);
      if (!neighborTable) {
        neighborTable = new Map();
        this.neighborVectors.set(item.targetNodeId, neighborTable);
      }

      let vecMap = neighborTable.get(item.sourceNodeId);
      if (!vecMap) {
        vecMap = new Map();
        neighborTable.set(item.sourceNodeId, vecMap);
      }

      // Update neighbor vector entries
      for (const entry of item.message.vector) {
        vecMap.set(entry.destNodeId, entry.cost);
      }
    }

    // 3. Bellman-Ford relaxation across all active nodes
    const activeNodes = this.graph.getNodes().filter((n) => n.status === 'ACTIVE');
    const nodesWithChanges: NodeId[] = [];

    for (const node of activeNodes) {
      const changed = this.relaxNode(node.id, currentTick);
      if (changed) {
        nodesWithChanges.push(node.id);
        anyChangesOccurred = true;
      }
    }

    // 4. If any node's vector changed, advertise updated vectors to direct neighbors
    let messagesSent = 0;
    if (nodesWithChanges.length > 0) {
      for (const changedNodeId of nodesWithChanges) {
        const neighbors = this.graph.getNeighbors(changedNodeId, true);
        for (const n of neighbors) {
          this.queueVectorAdvertisement(changedNodeId, n.neighborId, n.edgeId, currentTick);
          messagesSent++;
        }
      }
    }

    this.metrics.vectorsTransmittedLastTick = messagesSent;

    // 5. Detect active routing loops
    this.metrics.activeLoops = this.detectRoutingLoops();

    // 6. Convergence / Stability Check
    const isNowStable =
      this.inFlightMessages.length === 0 && !anyChangesOccurred;

    if (!this.metrics.isStable && isNowStable) {
      this.metrics.iterationsToConvergence = currentTick;
      this.metrics.isStable = true;
    } else if (!isNowStable) {
      this.metrics.isStable = false;
    }
  }

  /**
   * Traverses next-hop pointers across all active nodes to detect routing cycles.
   */
  public detectRoutingLoops(): RoutingLoopInfo[] {
    const loops: RoutingLoopInfo[] = [];
    const activeNodeIds = this.graph
      .getNodes()
      .filter((n) => n.status === 'ACTIVE')
      .map((n) => n.id);

    for (const dest of activeNodeIds) {
      for (const start of activeNodeIds) {
        if (start === dest) continue;

        const visited: NodeId[] = [];
        let curr: NodeId | null = start;

        while (curr && curr !== dest && !visited.includes(curr)) {
          visited.push(curr);
          const table = this.routingTables.get(curr);
          curr = table?.[dest]?.nextHop ?? null;
        }

        if (curr && visited.includes(curr)) {
          // Found loop: extract cycle
          const cycleStartIdx = visited.indexOf(curr);
          const cycle = visited.slice(cycleStartIdx);
          cycle.push(curr);

          // Avoid duplicate cycles
          const cycleKey = cycle.join('->');
          const alreadyRecorded = loops.some(
            (l) => l.destination === dest && l.cycle.join('->') === cycleKey
          );

          if (!alreadyRecorded) {
            loops.push({ cycle, destination: dest });
          }
        }
      }
    }

    return loops;
  }

  // --- Inspection & State Getters ---

  public getRoutingTable(nodeId: NodeId): RoutingTable | undefined {
    return this.routingTables.get(nodeId);
  }

  public getAllRoutingTables(): Record<NodeId, RoutingTable> {
    const result: Record<NodeId, RoutingTable> = {};
    for (const [nodeId, table] of this.routingTables.entries()) {
      result[nodeId] = { ...table };
    }
    return result;
  }

  public getNeighborVectors(nodeId: NodeId): NeighborVectorTable | undefined {
    return this.neighborVectors.get(nodeId);
  }

  public getInFlightMessages(): InFlightDVMessage[] {
    return this.inFlightMessages.map((m) => ({ ...m }));
  }

  public getMetrics(): DVRMetrics {
    return {
      ...this.metrics,
      activeLoops: [...this.metrics.activeLoops],
    };
  }

  public reset(): void {
    this.messageIdCounter = 0;
    this.metrics = {
      totalVectorsTransmitted: 0,
      vectorsTransmittedLastTick: 0,
      iterationsToConvergence: 0,
      isStable: false,
      activeLoops: [],
      countToInfinityEvents: 0,
    };
    this.initialize();
  }
}
