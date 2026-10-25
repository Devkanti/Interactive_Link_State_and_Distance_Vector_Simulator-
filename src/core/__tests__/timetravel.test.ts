import { describe, it, expect, beforeEach } from 'vitest';
import { NetworkGraph } from '../NetworkGraph';
import { StateLedger } from '../StateLedger';
import { LinkStateEngine } from '../lsr/LinkStateEngine';
import { DistanceVectorEngine } from '../dvr/DistanceVectorEngine';
import { PacketTracer } from '../tracer/PacketTracer';
import { StateSnapshot } from '../types';

describe('Deterministic Time-Travel Scrubber & State Stepper (Issue #10)', () => {
  let graph: NetworkGraph;
  let ledger: StateLedger;
  let lsrEngine: LinkStateEngine;
  let dvrEngine: DistanceVectorEngine;
  let packetTracer: PacketTracer;

  beforeEach(() => {
    graph = new NetworkGraph();
    ledger = new StateLedger();

    // Create 3-node topology: A - B - C
    graph.addNode('A', 'A', 0, 0);
    graph.addNode('B', 'B', 100, 0);
    graph.addNode('C', 'C', 200, 0);
    graph.addEdge('A', 'B', 1);
    graph.addEdge('B', 'C', 2);

    lsrEngine = new LinkStateEngine(graph);
    dvrEngine = new DistanceVectorEngine(graph);
    packetTracer = new PacketTracer(graph, (nodeId) => lsrEngine.getRoutingTable(nodeId));
  });

  const captureSnapshot = (tick: number, eventDesc?: string, isMarker = false): StateSnapshot => {
    const snap: StateSnapshot = {
      tick,
      timestamp: Date.now(),
      graph: graph.exportSnapshot(),
      routingTables: lsrEngine.getAllRoutingTables(),
      eventDescription: eventDesc,
      isEventMarker: isMarker,
      activePacketsCount: packetTracer.getActivePackets().length,
      metadata: {
        lsrState: lsrEngine.exportState(),
        dvrState: dvrEngine.exportState(),
        tracerState: packetTracer.exportState(),
      },
    };
    ledger.recordSnapshot(snap);
    return snap;
  };

  const restoreSnapshot = (tick: number): boolean => {
    const snap = ledger.getSnapshot(tick);
    if (!snap) return false;

    graph.importSnapshot(snap.graph);
    if (snap.metadata?.lsrState) {
      lsrEngine.restoreState(snap.metadata.lsrState as any);
    }
    if (snap.metadata?.dvrState) {
      dvrEngine.restoreState(snap.metadata.dvrState as any);
    }
    if (snap.metadata?.tracerState) {
      packetTracer.restoreState(snap.metadata.tracerState as any);
    }
    return true;
  };

  it('records initial state at tick 0 and accurately stores graph & routing tables', () => {
    lsrEngine.originateAll(0);
    lsrEngine.stepTick(1);
    lsrEngine.stepTick(2);
    captureSnapshot(0, 'Simulation Initialized', true);

    expect(ledger.getMaxTick()).toBe(0);
    expect(ledger.getSnapshotCount()).toBe(1);

    const snap0 = ledger.getSnapshot(0);
    expect(snap0).toBeDefined();
    expect(snap0?.graph.nodes.length).toBe(3);
    expect(snap0?.graph.edges.length).toBe(2);
    expect(snap0?.routingTables['A']['C']?.cost).toBe(3);
  });

  it('restores historical topology when an edge is severed in a later tick', () => {
    // Tick 0: Healthy network converged
    lsrEngine.originateAll(0);
    lsrEngine.stepTick(1);
    lsrEngine.stepTick(2);
    captureSnapshot(0);

    // Tick 1: Sever link B - C
    const edgeBC = graph.getEdgeBetween('B', 'C')!;
    graph.setEdgeStatus(edgeBC.id, 'DOWN');
    lsrEngine.stepTick(1);
    lsrEngine.stepTick(2);
    captureSnapshot(1, 'Link B-C Severed', true);

    expect(graph.getEdge(edgeBC.id)?.status).toBe('DOWN');
    expect(lsrEngine.getRoutingTable('A')?.['C']?.cost).toBe(Infinity);

    // Scrub backward to Tick 0
    const restored = restoreSnapshot(0);
    expect(restored).toBe(true);

    // Edge B-C should now be restored to UP
    expect(graph.getEdge(edgeBC.id)?.status).toBe('UP');
    expect(lsrEngine.getRoutingTable('A')?.['C']?.cost).toBe(3);

    // Scrub forward to Tick 1
    restoreSnapshot(1);
    expect(graph.getEdge(edgeBC.id)?.status).toBe('DOWN');
    expect(lsrEngine.getRoutingTable('A')?.['C']?.cost).toBe(Infinity);
  });

  it('restores Distance Vector state and matrix across time steps', () => {
    dvrEngine.advertiseAll(0);
    dvrEngine.stepTick(1);
    captureSnapshot(0);

    // Update weight of A-B to 10
    const edgeAB = graph.getEdgeBetween('A', 'B')!;
    graph.setEdgeCost(edgeAB.id, 10);
    dvrEngine.stepTick(2);
    captureSnapshot(1, 'Cost A-B changed to 10', true);

    expect(graph.getEdge(edgeAB.id)?.cost).toBe(10);
    expect(dvrEngine.getRoutingTable('A')?.['B']?.cost).toBe(10);

    // Scrub back to tick 0
    restoreSnapshot(0);
    expect(graph.getEdge(edgeAB.id)?.cost).toBe(1);
    expect(dvrEngine.getRoutingTable('A')?.['B']?.cost).toBe(1);
  });

  it('restores in-flight packet status and position when scrubbing back', () => {
    lsrEngine.originateAll(0);
    lsrEngine.stepTick(1);
    lsrEngine.stepTick(2);

    packetTracer.sendPing('A', 'C', 10, 'Test Ping', 0);
    expect(packetTracer.getActivePackets().length).toBe(1);
    expect(packetTracer.getActivePackets()[0].currentHop).toBe('A');

    captureSnapshot(0);

    // Step 1: Packet moves A -> B
    packetTracer.stepTick(1);
    expect(packetTracer.getActivePackets()[0].currentHop).toBe('B');
    expect(packetTracer.getActivePackets()[0].ttl).toBe(9);
    captureSnapshot(1);

    // Step 2: Packet moves B -> C (reaches destination, delivered)
    packetTracer.stepTick(2);
    expect(packetTracer.getActivePackets().length).toBe(0);
    expect(packetTracer.getCompletedPackets()[0].status).toBe('DELIVERED');
    captureSnapshot(2);

    // Rewind back to Tick 1
    restoreSnapshot(1);
    expect(packetTracer.getActivePackets().length).toBe(1);
    expect(packetTracer.getActivePackets()[0].currentHop).toBe('B');
    expect(packetTracer.getActivePackets()[0].ttl).toBe(9);

    // Rewind back to Tick 0
    restoreSnapshot(0);
    expect(packetTracer.getActivePackets().length).toBe(1);
    expect(packetTracer.getActivePackets()[0].currentHop).toBe('A');
    expect(packetTracer.getActivePackets()[0].ttl).toBe(10);
  });

  it('correctly tracks event markers along the timeline', () => {
    captureSnapshot(0, 'Init', true);
    captureSnapshot(1);
    captureSnapshot(2);
    captureSnapshot(3, 'Link B-C Severed', true);

    const history = ledger.getHistory();
    expect(history.length).toBe(4);

    const markers = history.filter((h) => h.isEventMarker);
    expect(markers.length).toBe(2);
    expect(markers[0].tick).toBe(0);
    expect(markers[1].tick).toBe(3);
    expect(markers[1].eventDescription).toBe('Link B-C Severed');
  });

  it('supports truncation when branching history from past tick', () => {
    captureSnapshot(0);
    captureSnapshot(1);
    captureSnapshot(2);
    captureSnapshot(3);
    expect(ledger.getMaxTick()).toBe(3);

    ledger.truncateFromTick(1);
    expect(ledger.getMaxTick()).toBe(1);
    expect(ledger.getSnapshotCount()).toBe(2);
    expect(ledger.getSnapshot(2)).toBeUndefined();
    expect(ledger.getSnapshot(3)).toBeUndefined();
  });
});
