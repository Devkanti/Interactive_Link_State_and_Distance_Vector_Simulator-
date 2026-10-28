import { NetworkGraph } from '../NetworkGraph';
import { NodeId, RoutingTable } from '../types';
import { Dijkstra } from './Dijkstra';
import {
  InFlightLSPPacket,
  LinkStatePacket,
  LSPNeighbor,
  LSRMetrics,
  NodeLSDB,
} from './types';

export class LinkStateEngine {
  private graph: NetworkGraph;
  private nodeLSDBs: Map<NodeId, NodeLSDB> = new Map();
  private nodeSequenceNumbers: Map<NodeId, number> = new Map();
  private routingTables: Map<NodeId, RoutingTable> = new Map();
  private dirtyNodes: Set<NodeId> = new Set();

  private inFlightPackets: InFlightLSPPacket[] = [];
  private packetIdCounter = 0;

  // Cached previous neighbor states to detect local link changes
  private lastKnownNeighbors: Map<NodeId, string> = new Map();

  private metrics: LSRMetrics = {
    totalLSPsOriginated: 0,
    totalLSPsTransmitted: 0,
    totalLSPsSuppressedDuplicates: 0,
    convergenceTicks: 0,
    isConverged: false,
  };

  private lastActivityTick = 0;

  constructor(graph: NetworkGraph) {
    this.graph = graph;
    this.initializeAllNodes();
  }

  /**
   * Initializes or refreshes all nodes in the network.
   */
  public initializeAllNodes(): void {
    const nodes = this.graph.getNodes();
    for (const node of nodes) {
      if (!this.nodeLSDBs.has(node.id)) {
        this.nodeLSDBs.set(node.id, new Map());
      }
      if (!this.nodeSequenceNumbers.has(node.id)) {
        this.nodeSequenceNumbers.set(node.id, 0);
      }
      if (!this.routingTables.has(node.id)) {
        this.routingTables.set(node.id, {});
      }
    }
  }

  /**
   * Triggers initial LSP originations across all active nodes to establish convergence.
   */
  public originateAll(tick = 0): void {
    this.initializeAllNodes();
    const nodes = this.graph.getNodes();
    for (const node of nodes) {
      if (node.status === 'ACTIVE') {
        this.originateLSP(node.id, tick);
      }
    }
  }

  /**
   * Generates a new Link State Packet for a specific node and queues flooding to neighbors.
   */
  public originateLSP(nodeId: NodeId, tick = 0): void {
    const node = this.graph.getNode(nodeId);
    if (!node || node.status !== 'ACTIVE') {
      return;
    }

    const currentSeq = (this.nodeSequenceNumbers.get(nodeId) || 0) + 1;
    this.nodeSequenceNumbers.set(nodeId, currentSeq);

    // Get active operational neighbors
    const neighbors = this.graph.getNeighbors(nodeId, true);
    const lspNeighbors: LSPNeighbor[] = neighbors.map((n) => ({
      neighborId: n.neighborId,
      cost: n.cost,
    }));

    const packet: LinkStatePacket = {
      id: `lsp-${nodeId}-${currentSeq}-${++this.packetIdCounter}`,
      originatorId: nodeId,
      senderId: nodeId,
      sequenceNumber: currentSeq,
      age: 64,
      neighbors: lspNeighbors,
      createdAtTick: tick,
    };

    this.metrics.totalLSPsOriginated++;
    this.lastActivityTick = tick;

    // Update node's own local LSDB
    const selfLSDB = this.nodeLSDBs.get(nodeId)!;
    selfLSDB.set(nodeId, {
      originatorId: nodeId,
      sequenceNumber: currentSeq,
      age: packet.age,
      neighbors: lspNeighbors,
      updatedAtTick: tick,
    });
    this.dirtyNodes.add(nodeId);

    // Flood to all operational immediate neighbors
    for (const neighbor of neighbors) {
      this.queuePacketTransmission(packet, nodeId, neighbor.neighborId, neighbor.edgeId);
    }
  }

  private queuePacketTransmission(
    packet: LinkStatePacket,
    fromNode: NodeId,
    toNode: NodeId,
    edgeId: string
  ): void {
    const inFlight: InFlightLSPPacket = {
      packet: { ...packet, senderId: fromNode },
      edgeId,
      sourceNodeId: fromNode,
      targetNodeId: toNode,
      progress: 0,
      traversalTicks: 1, // Arrives next tick
      elapsedTicks: 0,
    };

    this.inFlightPackets.push(inFlight);
    this.metrics.totalLSPsTransmitted++;
  }

  /**
   * Detects changes in local interfaces (link failures, cost changes, router crashes)
   * and automatically originates new LSPs for affected active nodes.
   */
  public detectTopologyChanges(tick: number): void {
    this.initializeAllNodes();
    const nodes = this.graph.getNodes();

    for (const node of nodes) {
      if (node.status !== 'ACTIVE') {
        this.lastKnownNeighbors.delete(node.id);
        continue;
      }

      const activeNeighbors = this.graph.getNeighbors(node.id, true);
      const neighborFingerprint = activeNeighbors
        .map((n) => `${n.neighborId}:${n.cost}`)
        .sort()
        .join('|');

      const prevFingerprint = this.lastKnownNeighbors.get(node.id);
      if (prevFingerprint !== undefined && prevFingerprint !== neighborFingerprint) {
        // Link cost changed, broken, or recovered: originate new LSP
        this.originateLSP(node.id, tick);
      }

      this.lastKnownNeighbors.set(node.id, neighborFingerprint);
    }
  }

  /**
   * Advances the Link State simulation by one tick:
   * 1. Detects topology changes and triggers incremental LSP flooding
   * 2. Delivers and processes in-flight LSPs
   * 3. Performs controlled flooding (duplicate suppression & reverse-path exclusion)
   * 4. Recalculates Dijkstra SPF trees for all nodes with updated LSDBs
   * 5. Updates convergence metrics
   */
  public stepTick(currentTick: number): void {
    this.detectTopologyChanges(currentTick);

    // Process in-flight packets
    const remainingPackets: InFlightLSPPacket[] = [];
    const deliveredPackets: InFlightLSPPacket[] = [];

    for (const item of this.inFlightPackets) {
      item.elapsedTicks += 1;
      item.progress = Math.min(1.0, item.elapsedTicks / item.traversalTicks);

      if (item.elapsedTicks >= item.traversalTicks) {
        deliveredPackets.push(item);
      } else {
        remainingPackets.push(item);
      }
    }

    this.inFlightPackets = remainingPackets;

    // Process delivered packets
    for (const item of deliveredPackets) {
      this.handlePacketArrival(item, currentTick);
    }

    // Recompute Dijkstra for all nodes whose LSDB changed
    if (this.dirtyNodes.size > 0) {
      this.recomputeDijkstraForDirtyNodes();
      this.lastActivityTick = currentTick;
    }

    // Update convergence state
    const isNowConverged =
      this.inFlightPackets.length === 0 && this.dirtyNodes.size === 0;

    if (!this.metrics.isConverged && isNowConverged) {
      this.metrics.convergenceTicks = currentTick;
      this.metrics.isConverged = true;
    } else if (!isNowConverged) {
      this.metrics.isConverged = false;
    }
  }

  /**
   * Processes an LSP arrival at target router.
   * Performs sequence-number duplicate suppression and re-flooding.
   */
  private handlePacketArrival(inFlight: InFlightLSPPacket, currentTick: number): void {
    const targetNodeId = inFlight.targetNodeId;
    const targetNode = this.graph.getNode(targetNodeId);

    // If target node is crashed, packet is dropped
    if (!targetNode || targetNode.status !== 'ACTIVE') {
      return;
    }

    // Check link operational status: if link dropped while in-flight, packet is lost
    const edge = this.graph.getEdge(inFlight.edgeId);
    if (!edge || !this.graph.isEdgeEffectivelyUp(edge)) {
      return;
    }

    const lsp = inFlight.packet;
    let targetLSDB = this.nodeLSDBs.get(targetNodeId);
    if (!targetLSDB) {
      targetLSDB = new Map();
      this.nodeLSDBs.set(targetNodeId, targetLSDB);
    }

    const existingEntry = targetLSDB.get(lsp.originatorId);

    // Controlled Flooding: Duplicate Suppression
    if (existingEntry && existingEntry.sequenceNumber >= lsp.sequenceNumber) {
      this.metrics.totalLSPsSuppressedDuplicates++;
      return;
    }

    // New or updated LSP: Update LSDB
    targetLSDB.set(lsp.originatorId, {
      originatorId: lsp.originatorId,
      sequenceNumber: lsp.sequenceNumber,
      age: lsp.age,
      neighbors: lsp.neighbors,
      updatedAtTick: currentTick,
    });

    this.dirtyNodes.add(targetNodeId);
    this.lastActivityTick = currentTick;

    // Controlled Re-flooding:
    // Transmit out of all operational interfaces EXCEPT the one it arrived on
    const neighbors = this.graph.getNeighbors(targetNodeId, true);
    for (const n of neighbors) {
      if (n.neighborId !== inFlight.sourceNodeId) {
        this.queuePacketTransmission(lsp, targetNodeId, n.neighborId, n.edgeId);
      }
    }
  }

  /**
   * Recalculates Dijkstra SPF trees and forwarding tables for dirty nodes.
   */
  private recomputeDijkstraForDirtyNodes(): void {
    const allKnownNodes = this.graph.getNodes().map((n) => n.id);

    for (const nodeId of this.dirtyNodes) {
      const node = this.graph.getNode(nodeId);
      if (!node || node.status !== 'ACTIVE') {
        this.routingTables.set(nodeId, {});
        continue;
      }

      const lsdb = this.nodeLSDBs.get(nodeId) || new Map();
      const result = Dijkstra.compute(nodeId, lsdb, allKnownNodes);
      this.routingTables.set(nodeId, result.forwardingTable);
    }

    this.dirtyNodes.clear();
  }

  // --- Inspection & Query Methods ---

  public getLSDB(nodeId: NodeId): NodeLSDB | undefined {
    return this.nodeLSDBs.get(nodeId);
  }

  public getAllLSDBs(): Map<NodeId, NodeLSDB> {
    return this.nodeLSDBs;
  }

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

  public getInFlightPackets(): InFlightLSPPacket[] {
    return this.inFlightPackets.map((p) => ({ ...p }));
  }

  public getMetrics(): LSRMetrics {
    return { ...this.metrics };
  }

  public getLastActivityTick(): number {
    return this.lastActivityTick;
  }

  public exportState(): {
    lsdb: Record<NodeId, Record<NodeId, unknown>>;
    routingTables: Record<NodeId, RoutingTable>;
    sequenceNumbers: Record<NodeId, number>;
    inFlightPackets: InFlightLSPPacket[];
  } {
    const lsdbExport: Record<NodeId, Record<NodeId, unknown>> = {};
    for (const [nodeId, map] of this.nodeLSDBs.entries()) {
      lsdbExport[nodeId] = {};
      for (const [orig, entry] of map.entries()) {
        lsdbExport[nodeId][orig] = { ...entry, neighbors: [...entry.neighbors] };
      }
    }
    const seqExport: Record<NodeId, number> = {};
    for (const [nodeId, seq] of this.nodeSequenceNumbers.entries()) {
      seqExport[nodeId] = seq;
    }
    return {
      lsdb: lsdbExport,
      routingTables: this.getAllRoutingTables(),
      sequenceNumbers: seqExport,
      inFlightPackets: this.inFlightPackets.map((p) => ({ ...p, packet: { ...p.packet } })),
    };
  }

  public restoreState(state: {
    lsdb: Record<NodeId, Record<NodeId, unknown>>;
    routingTables: Record<NodeId, RoutingTable>;
    sequenceNumbers: Record<NodeId, number>;
    inFlightPackets?: InFlightLSPPacket[];
  }): void {
    this.nodeLSDBs.clear();
    for (const [nodeId, mapObj] of Object.entries(state.lsdb)) {
      const map: NodeLSDB = new Map();
      for (const [orig, entry] of Object.entries(mapObj)) {
        map.set(orig, entry as any);
      }
      this.nodeLSDBs.set(nodeId, map);
    }
    this.routingTables.clear();
    for (const [nodeId, table] of Object.entries(state.routingTables)) {
      this.routingTables.set(nodeId, { ...table });
    }
    this.nodeSequenceNumbers.clear();
    for (const [nodeId, seq] of Object.entries(state.sequenceNumbers)) {
      this.nodeSequenceNumbers.set(nodeId, seq);
    }
    this.inFlightPackets = (state.inFlightPackets || []).map((p) => ({ ...p, packet: { ...p.packet } }));
    this.dirtyNodes.clear();
  }

  public reset(): void {
    this.nodeLSDBs.clear();
    this.nodeSequenceNumbers.clear();
    this.routingTables.clear();
    this.dirtyNodes.clear();
    this.inFlightPackets = [];
    this.lastKnownNeighbors.clear();
    this.packetIdCounter = 0;
    this.lastActivityTick = 0;
    this.metrics = {
      totalLSPsOriginated: 0,
      totalLSPsTransmitted: 0,
      totalLSPsSuppressedDuplicates: 0,
      convergenceTicks: 0,
      isConverged: false,
    };
    this.initializeAllNodes();
  }
}
