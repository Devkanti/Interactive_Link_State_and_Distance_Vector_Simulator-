import { describe, it, expect, beforeEach } from 'vitest';
import { NetworkGraph } from '../NetworkGraph';
import { DistanceVectorEngine } from '../dvr/DistanceVectorEngine';
import { LinkStateEngine } from '../lsr/LinkStateEngine';
import { PacketTracer } from '../tracer/PacketTracer';

describe('Phase 5 - Issue #14: Automated Unit & Protocol Verification Test Suite', () => {
  describe('1. Dijkstra SPF on Cyclic, Acyclic, and Disconnected Graphs', () => {
    it('computes shortest path on cyclic graph with multiple overlapping cycles', () => {
      // 4-Node Ring with cross-diagonal shortcut:
      // A - B (1)
      // B - C (2)
      // C - D (1)
      // A - D (10)
      // A - C (2) [Shortcut cycle!]
      const graph = new NetworkGraph();
      graph.addNode('A');
      graph.addNode('B');
      graph.addNode('C');
      graph.addNode('D');

      graph.addEdge('A', 'B', 1);
      graph.addEdge('B', 'C', 2);
      graph.addEdge('C', 'D', 1);
      graph.addEdge('A', 'D', 10);
      graph.addEdge('A', 'C', 2); // shortcut: A -> C (2) + C -> D (1) = 3 < 10

      const engine = new LinkStateEngine(graph);
      engine.originateAll(0);
      engine.stepTick(1);
      engine.stepTick(2);

      const tableA = engine.getRoutingTable('A');
      expect(tableA).toBeDefined();
      expect(tableA!['D'].cost).toBe(3);
      expect(tableA!['D'].nextHop).toBe('C');
      expect(tableA!['D'].path).toEqual(['A', 'C', 'D']);
    });

    it('computes shortest path on strictly acyclic tree graph (DAG)', () => {
      // Tree: Root A -> B, Root A -> C, B -> D, B -> E
      const graph = new NetworkGraph();
      for (const id of ['A', 'B', 'C', 'D', 'E']) graph.addNode(id);
      graph.addEdge('A', 'B', 2);
      graph.addEdge('A', 'C', 5);
      graph.addEdge('B', 'D', 3);
      graph.addEdge('B', 'E', 4);

      const engine = new LinkStateEngine(graph);
      engine.originateAll(0);
      engine.stepTick(1);
      engine.stepTick(2);

      const tableA = engine.getRoutingTable('A');
      expect(tableA!['D'].cost).toBe(5); // 2 + 3
      expect(tableA!['D'].nextHop).toBe('B');
      expect(tableA!['D'].path).toEqual(['A', 'B', 'D']);

      expect(tableA!['E'].cost).toBe(6); // 2 + 4
      expect(tableA!['E'].nextHop).toBe('B');
      expect(tableA!['E'].path).toEqual(['A', 'B', 'E']);
    });

    it('handles disconnected graphs with completely isolated components', () => {
      // Component 1: A - B (cost 1)
      // Component 2 (Isolated): X - Y (cost 2)
      const graph = new NetworkGraph();
      graph.addNode('A');
      graph.addNode('B');
      graph.addNode('X');
      graph.addNode('Y');

      graph.addEdge('A', 'B', 1);
      graph.addEdge('X', 'Y', 2);

      const engine = new LinkStateEngine(graph);
      engine.originateAll(0);
      engine.stepTick(1);
      engine.stepTick(2);

      const tableA = engine.getRoutingTable('A');
      expect(tableA!['B'].cost).toBe(1);
      expect(tableA!['B'].nextHop).toBe('B');

      // Isolated nodes X and Y must be marked unreachable (cost Infinity)
      expect(tableA!['X'].cost).toBe(Infinity);
      expect(tableA!['X'].nextHop).toBeNull();
      expect(tableA!['X'].path).toEqual([]);

      expect(tableA!['Y'].cost).toBe(Infinity);
      expect(tableA!['Y'].nextHop).toBeNull();
    });
  });

  describe('2. Bellman-Ford Convergence on 3-Node, 5-Node, and Mesh Graphs', () => {
    it('converges on classic 3-node linear topology (A - B - C)', () => {
      const graph = new NetworkGraph();
      graph.addNode('A');
      graph.addNode('B');
      graph.addNode('C');
      graph.addEdge('A', 'B', 3);
      graph.addEdge('B', 'C', 4);

      const dvr = new DistanceVectorEngine(graph);
      dvr.advertiseAll(0);

      // Tick 1: Neighbors exchange direct vectors
      dvr.stepTick(1);
      expect(dvr.getRoutingTable('A')!['C'].cost).toBe(7);

      // Tick 2: Updates settle
      dvr.stepTick(2);
      expect(dvr.getMetrics().isStable).toBe(true);
    });

    it('converges on 5-node topology with chords (Pentagon)', () => {
      // 5 Nodes: R1 to R5 in a ring with chord R1 - R4
      const graph = new NetworkGraph();
      for (let i = 1; i <= 5; i++) graph.addNode(`R${i}`);

      graph.addEdge('R1', 'R2', 1);
      graph.addEdge('R2', 'R3', 1);
      graph.addEdge('R3', 'R4', 1);
      graph.addEdge('R4', 'R5', 1);
      graph.addEdge('R5', 'R1', 1);
      // Shortcut chord
      graph.addEdge('R1', 'R4', 1);

      const dvr = new DistanceVectorEngine(graph);
      dvr.advertiseAll(0);

      // Step until stable
      for (let t = 1; t <= 5; t++) dvr.stepTick(t);

      expect(dvr.getMetrics().isStable).toBe(true);
      // R1 to R4 should use direct chord (cost 1) rather than multi-hop ring
      expect(dvr.getRoutingTable('R1')!['R4'].cost).toBe(1);
      expect(dvr.getRoutingTable('R1')!['R4'].nextHop).toBe('R4');

      // R1 to R3 should use chord via R4 (R1 -> R4 -> R3 = 1 + 1 = 2)
      expect(dvr.getRoutingTable('R1')!['R3'].cost).toBe(2);
    });

    it('converges on full mesh graph (K4 dense connectivity)', () => {
      const graph = new NetworkGraph();
      const nodes = ['M1', 'M2', 'M3', 'M4'];
      for (const n of nodes) graph.addNode(n);

      // Connect every pair with varying edge costs
      graph.addEdge('M1', 'M2', 2);
      graph.addEdge('M1', 'M3', 5);
      graph.addEdge('M1', 'M4', 10);
      graph.addEdge('M2', 'M3', 1); // M1 -> M2 -> M3 = 2 + 1 = 3 < 5
      graph.addEdge('M2', 'M4', 4); // M1 -> M2 -> M4 = 2 + 4 = 6 < 10
      graph.addEdge('M3', 'M4', 1); // M1 -> M2 -> M3 -> M4 = 2 + 1 + 1 = 4 < 6

      const dvr = new DistanceVectorEngine(graph);
      dvr.advertiseAll(0);

      for (let t = 1; t <= 6; t++) dvr.stepTick(t);

      expect(dvr.getMetrics().isStable).toBe(true);
      // Optimal path from M1 to M4 is M1 -> M2 -> M3 -> M4 = 4
      expect(dvr.getRoutingTable('M1')!['M4'].cost).toBe(4);
      expect(dvr.getRoutingTable('M1')!['M4'].nextHop).toBe('M2');
    });
  });

  describe('3. Split Horizon & Poison Reverse Mitigations', () => {
    it('prevents 2-node routing loops using Split Horizon on critical link drop', () => {
      const graph = new NetworkGraph();
      graph.addNode('A');
      graph.addNode('B');
      graph.addNode('C');
      graph.addEdge('A', 'B', 1);
      const edgeBC = graph.addEdge('B', 'C', 1);

      const dvr = new DistanceVectorEngine(graph, {
        splitHorizonEnabled: true,
        poisonReverseEnabled: false,
        infinityThreshold: 16,
      });

      // Settle initial routes
      dvr.advertiseAll(0);
      dvr.stepTick(1);
      dvr.stepTick(2);

      // Sever link B - C
      graph.setEdgeStatus(edgeBC.id, 'DOWN');
      dvr.stepTick(3);
      dvr.stepTick(4);

      // With Split Horizon enabled, A never falsely advertised its route to C back to B.
      // Therefore, B never adopted a bouncing routing loop back through A!
      const tableB = dvr.getRoutingTable('B');
      expect(tableB!['C'].cost).toBe(16);
      expect(tableB!['C'].nextHop).toBeNull();
    });

    it('advertises explicit metric infinity using Poison Reverse to eliminate loops', () => {
      const graph = new NetworkGraph();
      graph.addNode('A');
      graph.addNode('B');
      graph.addNode('C');
      graph.addEdge('A', 'B', 1);
      const edgeBC = graph.addEdge('B', 'C', 1);

      const dvr = new DistanceVectorEngine(graph, {
        splitHorizonEnabled: true,
        poisonReverseEnabled: true,
        infinityThreshold: 16,
      });

      dvr.advertiseAll(0);
      dvr.stepTick(1);
      dvr.stepTick(2);

      // Sever link B - C
      graph.setEdgeStatus(edgeBC.id, 'DOWN');
      dvr.stepTick(3);
      dvr.stepTick(4);

      // B converges to unreachable immediately without bouncing
      expect(dvr.getRoutingTable('B')!['C'].cost).toBe(16);
      expect(dvr.getRoutingTable('A')!['C'].cost).toBe(16);
    });
  });

  describe('4. Count-to-Infinity Verification', () => {
    it('climbs iteration-by-iteration to infinity threshold (16) and halts when Split Horizon is disabled', () => {
      const graph = new NetworkGraph();
      graph.addNode('A');
      graph.addNode('B');
      graph.addNode('C');
      graph.addEdge('A', 'B', 1);
      const edgeBC = graph.addEdge('B', 'C', 1);

      // Explicitly disable both Split Horizon and Poison Reverse
      const dvr = new DistanceVectorEngine(graph, {
        splitHorizonEnabled: false,
        poisonReverseEnabled: false,
        infinityThreshold: 16,
      });

      // Initial convergence: A-C is 2, B-C is 1
      dvr.advertiseAll(0);
      dvr.stepTick(1);
      dvr.stepTick(2);
      expect(dvr.getRoutingTable('A')!['C'].cost).toBe(2);
      expect(dvr.getRoutingTable('B')!['C'].cost).toBe(1);

      // Break link B - C
      graph.setEdgeStatus(edgeBC.id, 'DOWN');

      // Iteratively step: cost to C will count up to 16
      let loopObserved = false;
      for (let t = 5; t <= 40; t++) {
        dvr.stepTick(t);
        if (dvr.getMetrics().activeLoops.length > 0) {
          loopObserved = true;
        }
        if (dvr.getMetrics().isStable) {
          break;
        }
      }

      expect(loopObserved).toBe(true);

      // Must halt exactly at infinity threshold 16
      const tableA = dvr.getRoutingTable('A')!;
      const tableB = dvr.getRoutingTable('B')!;
      expect(tableA['C'].cost).toBe(16);
      expect(tableA['C'].nextHop).toBeNull();
      expect(tableB['C'].cost).toBe(16);
      expect(tableB['C'].nextHop).toBeNull();

      expect(dvr.getMetrics().isStable).toBe(true);
    });
  });

  describe('5. In-Flight Packet Tracer: Loop Detection & TTL Expiry', () => {
    let graph: NetworkGraph;
    let tracer: PacketTracer;

    beforeEach(() => {
      graph = new NetworkGraph();
      graph.addNode('R1');
      graph.addNode('R2');
      graph.addNode('R3');
      graph.addEdge('R1', 'R2', 1);
      graph.addEdge('R2', 'R3', 1);
      graph.addEdge('R3', 'R1', 1);
    });

    it('decrements TTL on each hop and drops packet with ICMP Time Exceeded when loop causes TTL=0', () => {
      // Artificially induce a routing loop: R1 -> R2 -> R3 -> R1 for destination Target
      graph.addNode('Target');
      const routingTables: Record<string, any> = {
        R1: { Target: { nextHop: 'R2', cost: 3 } },
        R2: { Target: { nextHop: 'R3', cost: 2 } },
        R3: { Target: { nextHop: 'R1', cost: 2 } },
      };

      tracer = new PacketTracer(graph, (nodeId) => routingTables[nodeId]);

      // Inject ping packet with TTL = 3
      const packet = tracer.sendPing('R1', 'Target', 3, 'Loop ping', 0);
      expect(packet.ttl).toBe(3);
      expect(packet.status).toBe('IN_FLIGHT');

      // Step 1: Hop R1 -> R2 (TTL: 3 -> 2)
      tracer.stepTick(1);
      let active = tracer.getActivePackets()[0];
      expect(active.currentHop).toBe('R2');
      expect(active.ttl).toBe(2);

      // Step 2: Hop R2 -> R3 (TTL: 2 -> 1)
      tracer.stepTick(2);
      active = tracer.getActivePackets()[0];
      expect(active.currentHop).toBe('R3');
      expect(active.ttl).toBe(1);

      // Step 3: Hop R3 -> R1 (TTL: 1 -> 0, loop detected and TTL expires!)
      tracer.stepTick(3);
      expect(tracer.getActivePackets().length).toBe(0);

      const completed = tracer.getCompletedPackets()[0];
      expect(completed.status).toBe('TTL_EXPIRED');
      expect(completed.ttl).toBe(0);
      expect(completed.cycleDetected).toBe(true);
      expect(completed.dropReason).toContain('ICMP Time Exceeded');
    });

    it('successfully delivers packet with green check when path is loop-free and valid', () => {
      const routingTables: Record<string, any> = {
        R1: { R3: { nextHop: 'R2', cost: 2 } },
        R2: { R3: { nextHop: 'R3', cost: 1 } },
        R3: { R3: { nextHop: 'R3', cost: 0 } },
      };

      tracer = new PacketTracer(graph, (nodeId) => routingTables[nodeId]);
      tracer.sendPing('R1', 'R3', 10, 'Valid ping', 0);

      // Step 1: R1 -> R2
      tracer.stepTick(1);
      expect(tracer.getActivePackets()[0].currentHop).toBe('R2');

      // Step 2: R2 -> R3 (Destination reached!)
      tracer.stepTick(2);
      expect(tracer.getActivePackets().length).toBe(0);

      const delivered = tracer.getCompletedPackets()[0];
      expect(delivered.status).toBe('DELIVERED');
      expect(delivered.currentHop).toBe('R3');
      expect(delivered.cycleDetected).toBe(false);
    });
  });
});
