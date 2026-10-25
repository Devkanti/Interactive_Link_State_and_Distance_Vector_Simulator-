import { describe, it, expect } from 'vitest';
import { NetworkGraph } from '../NetworkGraph';
import { Dijkstra } from '../lsr/Dijkstra';
import { LinkStateEngine } from '../lsr/LinkStateEngine';

describe('Phase 1 - Issue #2: Link State Routing (LSR) Protocol Engine', () => {
  describe('Dijkstra Algorithm', () => {
    it('should compute shortest paths on a 3-node linear topology (A - B - C)', () => {
      const graph = new NetworkGraph();
      graph.addNode('A');
      graph.addNode('B');
      graph.addNode('C');
      graph.addEdge('A', 'B', 2);
      graph.addEdge('B', 'C', 3);

      const engine = new LinkStateEngine(graph);
      // Let's populate LSDB directly or via originate
      engine.originateAll(0);
      // Step until all LSPs are delivered
      engine.stepTick(1);
      engine.stepTick(2);

      const tableA = engine.getRoutingTable('A');
      expect(tableA).toBeDefined();
      expect(tableA!['A'].cost).toBe(0);
      expect(tableA!['B'].cost).toBe(2);
      expect(tableA!['B'].nextHop).toBe('B');
      expect(tableA!['C'].cost).toBe(5);
      expect(tableA!['C'].nextHop).toBe('B');
      expect(tableA!['C'].path).toEqual(['A', 'B', 'C']);
    });

    it('should choose the optimal path in a diamond multi-path topology', () => {
      // Topology:
      //     A
      //   1/ \4
      //   B   C
      //   5\ /1
      //     D
      // Path A-B-D = 1 + 5 = 6
      // Path A-C-D = 4 + 1 = 5 (Optimal!)
      const graph = new NetworkGraph();
      graph.addNode('A');
      graph.addNode('B');
      graph.addNode('C');
      graph.addNode('D');
      graph.addEdge('A', 'B', 1);
      graph.addEdge('A', 'C', 4);
      graph.addEdge('B', 'D', 5);
      graph.addEdge('C', 'D', 1);

      const adj = new Map<string, Map<string, number>>();
      for (const n of ['A', 'B', 'C', 'D']) adj.set(n, new Map());
      adj.get('A')!.set('B', 1);
      adj.get('A')!.set('C', 4);
      adj.get('B')!.set('A', 1);
      adj.get('B')!.set('D', 5);
      adj.get('C')!.set('A', 4);
      adj.get('C')!.set('D', 1);
      adj.get('D')!.set('B', 5);
      adj.get('D')!.set('C', 1);

      const result = Dijkstra.compute('A', adj, ['A', 'B', 'C', 'D']);

      expect(result.distances['D']).toBe(5);
      expect(result.forwardingTable['D'].nextHop).toBe('C');
      expect(result.forwardingTable['D'].path).toEqual(['A', 'C', 'D']);
      expect(result.steps.length).toBeGreaterThan(1);
      expect(result.steps[0].visitedNodes).toEqual([]);
    });

    it('should mark disconnected nodes as unreachable', () => {
      const graph = new NetworkGraph();
      graph.addNode('A');
      graph.addNode('B');
      graph.addNode('Isolated');
      graph.addEdge('A', 'B', 2);

      const engine = new LinkStateEngine(graph);
      engine.originateAll(0);
      engine.stepTick(1);

      const tableA = engine.getRoutingTable('A');
      expect(tableA!['Isolated'].cost).toBe(Infinity);
      expect(tableA!['Isolated'].nextHop).toBeNull();
      expect(tableA!['Isolated'].path).toEqual([]);
    });
  });

  describe('LinkStateEngine Flooding & Synchronization', () => {
    it('should flood LSPs and synchronize LSDB across all nodes', () => {
      const graph = new NetworkGraph();
      graph.addNode('R1');
      graph.addNode('R2');
      graph.addNode('R3');
      graph.addEdge('R1', 'R2', 10);
      graph.addEdge('R2', 'R3', 20);

      const engine = new LinkStateEngine(graph);
      engine.originateAll(0);

      expect(engine.getInFlightPackets().length).toBeGreaterThan(0);
      expect(engine.getMetrics().totalLSPsOriginated).toBe(3);

      // Tick 1: Neighbors receive initial LSPs
      engine.stepTick(1);
      // Tick 2: Second hop receives flooded LSPs
      engine.stepTick(2);
      // Tick 3: Settle
      engine.stepTick(3);

      expect(engine.getMetrics().isConverged).toBe(true);

      // Check R1's LSDB has entries for R1, R2, and R3
      const lsdbR1 = engine.getLSDB('R1');
      expect(lsdbR1?.has('R1')).toBe(true);
      expect(lsdbR1?.has('R2')).toBe(true);
      expect(lsdbR1?.has('R3')).toBe(true);

      // Verify routing table at R1
      const tableR1 = engine.getRoutingTable('R1');
      expect(tableR1!['R3'].cost).toBe(30);
      expect(tableR1!['R3'].nextHop).toBe('R2');
    });

    it('should suppress duplicate LSPs using sequence numbers', () => {
      const graph = new NetworkGraph();
      graph.addNode('A');
      graph.addNode('B');
      graph.addNode('C');
      // Triangle topology creates multiple paths for flooding:
      graph.addEdge('A', 'B', 1);
      graph.addEdge('B', 'C', 1);
      graph.addEdge('A', 'C', 1);

      const engine = new LinkStateEngine(graph);
      engine.originateAll(0);

      // Advance through ticks
      engine.stepTick(1);
      engine.stepTick(2);
      engine.stepTick(3);

      const metrics = engine.getMetrics();
      // Triangle topology guarantees duplicate copies arrive at vertices
      expect(metrics.totalLSPsSuppressedDuplicates).toBeGreaterThan(0);
      expect(metrics.isConverged).toBe(true);
    });

    it('should trigger incremental LSP flood when link cost dynamically changes', () => {
      const graph = new NetworkGraph();
      graph.addNode('A');
      graph.addNode('B');
      const edge = graph.addEdge('A', 'B', 10);

      const engine = new LinkStateEngine(graph);
      engine.originateAll(0);
      engine.stepTick(1);

      expect(engine.getRoutingTable('A')!['B'].cost).toBe(10);

      const origCountBefore = engine.getMetrics().totalLSPsOriginated;

      // Dynamically change link cost from 10 to 2
      graph.setEdgeCost(edge.id, 2);

      // Advance tick: engine should detect change and originate new LSP
      engine.stepTick(2);
      expect(engine.getMetrics().totalLSPsOriginated).toBeGreaterThan(origCountBefore);

      engine.stepTick(3);
      expect(engine.getRoutingTable('A')!['B'].cost).toBe(2);
    });

    it('should handle edge DOWN failure and converge to alternate path', () => {
      // A - B (cost 1)
      // A - C (cost 10)
      // B - C (cost 1)
      // Initially path A -> C is via B (cost 2)
      // If A - B goes DOWN, path A -> C must failover to direct link (cost 10)
      const graph = new NetworkGraph();
      graph.addNode('A');
      graph.addNode('B');
      graph.addNode('C');
      const edgeAB = graph.addEdge('A', 'B', 1);
      graph.addEdge('A', 'C', 10);
      graph.addEdge('B', 'C', 1);

      const engine = new LinkStateEngine(graph);
      engine.originateAll(0);
      engine.stepTick(1);
      engine.stepTick(2);
      engine.stepTick(3);

      expect(engine.getRoutingTable('A')!['C'].cost).toBe(2);
      expect(engine.getRoutingTable('A')!['C'].nextHop).toBe('B');

      // Break edge A - B
      graph.setEdgeStatus(edgeAB.id, 'DOWN');

      // Tick 4: Failure detected, new LSPs originated
      engine.stepTick(4);
      engine.stepTick(5);
      engine.stepTick(6);

      const tableA = engine.getRoutingTable('A');
      expect(tableA!['C'].cost).toBe(10);
      expect(tableA!['C'].nextHop).toBe('C');
      expect(tableA!['B'].cost).toBe(11); // A -> C -> B
    });
  });
});
