import { NetworkGraph } from '../NetworkGraph';
import { NodeId, RoutingTable } from '../types';
import { TracePacket } from './types';

export class PacketTracer {
  private graph: NetworkGraph;
  private getRoutingTableFn: (nodeId: NodeId) => RoutingTable | undefined;
  private activePackets: TracePacket[] = [];
  private completedPackets: TracePacket[] = [];
  private packetCounter = 0;

  constructor(
    graph: NetworkGraph,
    getRoutingTableFn: (nodeId: NodeId) => RoutingTable | undefined
  ) {
    this.graph = graph;
    this.getRoutingTableFn = getRoutingTableFn;
  }

  public setRoutingTableProvider(
    provider: (nodeId: NodeId) => RoutingTable | undefined
  ): void {
    this.getRoutingTableFn = provider;
  }

  /**
   * Dispatches a new test ping data packet from source router to destination router.
   */
  public sendPing(
    sourceId: NodeId,
    destId: NodeId,
    initialTtl = 15,
    payload = 'ICMP Echo Request (Ping)',
    tick = 0
  ): TracePacket {
    const srcNode = this.graph.getNode(sourceId);
    if (!srcNode) {
      throw new Error(`Source router ${sourceId} does not exist`);
    }
    const destNode = this.graph.getNode(destId);
    if (!destNode) {
      throw new Error(`Destination router ${destId} does not exist`);
    }

    const packet: TracePacket = {
      id: `ping-${++this.packetCounter}-${Date.now().toString(36)}`,
      sourceId,
      destId,
      currentHop: sourceId,
      nextHop: null,
      edgeId: null,
      ttl: initialTtl,
      initialTtl,
      payload,
      status: 'IN_FLIGHT',
      hopHistory: [
        {
          nodeId: sourceId,
          ttlRemaining: initialTtl,
          timestampTick: tick,
        },
      ],
      cycleDetected: false,
      totalHops: 0,
      progress: 0,
      createdAtTick: tick,
    };

    // If source is destination, immediately deliver
    if (sourceId === destId) {
      packet.status = 'DELIVERED';
      packet.finishedAtTick = tick;
      this.completedPackets.unshift(packet);
      return { ...packet };
    }

    this.activePackets.push(packet);
    return { ...packet };
  }

  /**
   * Advances all in-flight test packets by one discrete simulation tick.
   */
  public stepTick(currentTick: number): TracePacket[] {
    const remainingPackets: TracePacket[] = [];
    const finishedThisTick: TracePacket[] = [];

    for (const packet of this.activePackets) {
      // 1. Check if current hop router is crashed
      const currNode = this.graph.getNode(packet.currentHop);
      if (!currNode || currNode.status !== 'ACTIVE') {
        packet.status = 'NO_ROUTE_DROP';
        packet.dropReason = `Dropped at crashed router ${packet.currentHop}`;
        packet.finishedAtTick = currentTick;
        finishedThisTick.push(packet);
        continue;
      }

      // 2. Check if reached destination
      if (packet.currentHop === packet.destId) {
        packet.status = 'DELIVERED';
        packet.finishedAtTick = currentTick;
        finishedThisTick.push(packet);
        continue;
      }

      // 3. Query local router's forwarding table for next hop
      const table = this.getRoutingTableFn(packet.currentHop);
      const route = table?.[packet.destId];

      if (!route || !route.nextHop || route.cost >= 16 || route.cost === Infinity) {
        packet.status = 'NO_ROUTE_DROP';
        packet.dropReason = `ICMP Destination Unreachable: No route to ${packet.destId} at ${packet.currentHop}`;
        packet.finishedAtTick = currentTick;
        finishedThisTick.push(packet);
        continue;
      }

      const nextHop = route.nextHop;
      packet.nextHop = nextHop;

      // 4. Verify link operational status between currentHop and nextHop
      const edge = this.graph.getEdgeBetween(packet.currentHop, nextHop);
      if (!edge || !this.graph.isEdgeEffectivelyUp(edge)) {
        packet.status = 'LINK_DOWN_DROP';
        packet.dropReason = `Packet dropped: Link ${packet.currentHop} \u2194 ${nextHop} is DOWN`;
        packet.finishedAtTick = currentTick;
        finishedThisTick.push(packet);
        continue;
      }

      packet.edgeId = edge.id;

      // 5. Decrement TTL and traverse
      packet.ttl -= 1;
      packet.totalHops += 1;

      // Detect routing loops / cycles
      const previousHopIds = packet.hopHistory.map((h) => h.nodeId);
      if (previousHopIds.includes(nextHop)) {
        packet.cycleDetected = true;
        const cycleStartIdx = previousHopIds.indexOf(nextHop);
        packet.cycleNodes = previousHopIds.slice(cycleStartIdx);
        packet.cycleNodes.push(nextHop);
      }

      packet.hopHistory.push({
        nodeId: nextHop,
        ttlRemaining: packet.ttl,
        timestampTick: currentTick,
      });

      // 6. Check TTL expiry
      if (packet.ttl <= 0) {
        packet.status = 'TTL_EXPIRED';
        packet.dropReason = `ICMP Time Exceeded: TTL decremented to 0 during routing loop`;
        packet.finishedAtTick = currentTick;
        finishedThisTick.push(packet);
        continue;
      }

      // Move packet to nextHop
      packet.currentHop = nextHop;
      packet.nextHop = null;
      packet.progress = 1.0;

      // If reached destination on this hop, finish
      if (packet.currentHop === packet.destId) {
        packet.status = 'DELIVERED';
        packet.finishedAtTick = currentTick;
        finishedThisTick.push(packet);
      } else {
        remainingPackets.push(packet);
      }
    }

    this.activePackets = remainingPackets;
    for (const p of finishedThisTick) {
      this.completedPackets.unshift(p);
      if (this.completedPackets.length > 20) {
        this.completedPackets.pop();
      }
    }

    return [...finishedThisTick];
  }

  public getActivePackets(): TracePacket[] {
    return this.activePackets.map((p) => ({ ...p }));
  }

  public getCompletedPackets(): TracePacket[] {
    return this.completedPackets.map((p) => ({ ...p }));
  }

  public getAllPackets(): TracePacket[] {
    return [...this.activePackets, ...this.completedPackets];
  }

  public clearHistory(): void {
    this.activePackets = [];
    this.completedPackets = [];
  }

  public exportState(): { activePackets: TracePacket[]; completedPackets: TracePacket[]; packetCounter: number } {
    return {
      activePackets: JSON.parse(JSON.stringify(this.activePackets)),
      completedPackets: JSON.parse(JSON.stringify(this.completedPackets)),
      packetCounter: this.packetCounter,
    };
  }

  public restoreState(state: { activePackets: TracePacket[]; completedPackets: TracePacket[]; packetCounter: number }): void {
    if (!state) return;
    this.activePackets = JSON.parse(JSON.stringify(state.activePackets || []));
    this.completedPackets = JSON.parse(JSON.stringify(state.completedPackets || []));
    this.packetCounter = state.packetCounter || 0;
  }
}
