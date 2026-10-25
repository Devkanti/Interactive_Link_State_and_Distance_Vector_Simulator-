import { describe, it, expect } from 'vitest';
import { NetworkGraph } from '../NetworkGraph';
import { DistanceVectorEngine } from '../dvr/DistanceVectorEngine';

describe('Phase 1 - Issue #3: Distance Vector Routing (DVR) Protocol Engine', () => {
  it('should initialize local routing tables with direct neighbor costs and infinity for non-neighbors', () => {
    const graph = new NetworkGraph();
    graph.addNode('A');
    graph.addNode('B');
    graph.addNode('C');
    graph.addEdge('A', 'B', 4);
    graph.addEdge('B', 'C', 7);

    const engine = new DistanceVectorEngine(graph);
    const tableA = engine.getRoutingTable('A');
    expect(tableA).toBeDefined();

    // Cost to self is 0
    expect(tableA!['A'].cost).toBe(0);
    expect(tableA!['A'].nextHop).toBe('A');

    // Cost to direct neighbor B is 4
    expect(tableA!['B'].cost).toBe(4);
    expect(tableA!['B'].nextHop).toBe('B');

    // Cost to non-neighbor C is initially infinity (16)
    expect(tableA!['C'].cost).toBe(16);
    expect(tableA!['C'].nextHop).toBeNull();
  });

  it('should converge via Bellman-Ford relaxation on 3-node linear topology (A - B - C)', () => {
    const graph = new NetworkGraph();
    graph.addNode('A');
    graph.addNode('B');
    graph.addNode('C');
    graph.addEdge('A', 'B', 2);
    graph.addEdge('B', 'C', 3);

    const engine = new DistanceVectorEngine(graph);
    // Initial advertisement
    engine.advertiseAll(0);
    expect(engine.getInFlightMessages().length).toBeGreaterThan(0);
    expect(engine.getMetrics().isStable).toBe(false);

    // Tick 1: B's vector arrives at A and C; A and C's vectors arrive at B
    engine.stepTick(1);

    // Check table at A: D_A(C) = c(A, B) + D_B(C) = 2 + 3 = 5
    const tableA = engine.getRoutingTable('A');
    expect(tableA!['C'].cost).toBe(5);
    expect(tableA!['C'].nextHop).toBe('B');

    // Tick 2: Updates settle
    engine.stepTick(2);
    // Tick 3: No further changes -> STABLE
    engine.stepTick(3);

    expect(engine.getMetrics().isStable).toBe(true);
    expect(engine.getMetrics().iterationsToConvergence).toBeGreaterThan(0);
  });

  it('should find the minimum cost path in a diamond multi-path network', () => {
    // Topology:
    //     A
    //   1/ \4
    //   B   C
    //   5\ /1
    //     D
    // Path via B: 1 + 5 = 6
    // Path via C: 4 + 1 = 5 (Minimum!)
    const graph = new NetworkGraph();
    graph.addNode('A');
    graph.addNode('B');
    graph.addNode('C');
    graph.addNode('D');
    graph.addEdge('A', 'B', 1);
    graph.addEdge('A', 'C', 4);
    graph.addEdge('B', 'D', 5);
    graph.addEdge('C', 'D', 1);

    const engine = new DistanceVectorEngine(graph);
    engine.advertiseAll(0);

    for (let t = 1; t <= 5; t++) {
      engine.stepTick(t);
      if (engine.getMetrics().isStable) break;
    }

    const tableA = engine.getRoutingTable('A');
    expect(tableA).toBeDefined();
    expect(tableA!['D'].cost).toBe(5);
    expect(tableA!['D'].nextHop).toBe('C');
    expect(engine.getMetrics().isStable).toBe(true);
  });

  it('should track message overhead and vectors transmitted per tick', () => {
    const graph = new NetworkGraph();
    graph.addNode('R1');
    graph.addNode('R2');
    graph.addEdge('R1', 'R2', 10);

    const engine = new DistanceVectorEngine(graph);
    engine.advertiseAll(0);

    const metricsAfterAd = engine.getMetrics();
    // 2 routers, each sends 1 vector to its neighbor -> 2 messages
    expect(metricsAfterAd.totalVectorsTransmitted).toBe(2);
    expect(metricsAfterAd.vectorsTransmittedLastTick).toBe(2);

    engine.stepTick(1);
    engine.stepTick(2);

    expect(engine.getMetrics().isStable).toBe(true);
    expect(engine.getMetrics().vectorsTransmittedLastTick).toBe(0);
  });

  it('should react to dynamic link cost changes and re-converge', () => {
    const graph = new NetworkGraph();
    graph.addNode('A');
    graph.addNode('B');
    const edge = graph.addEdge('A', 'B', 8);

    const engine = new DistanceVectorEngine(graph);
    engine.advertiseAll(0);
    engine.stepTick(1);
    engine.stepTick(2);

    expect(engine.getRoutingTable('A')!['B'].cost).toBe(8);

    // Reduce link cost to 3
    graph.setEdgeCost(edge.id, 3);
    engine.stepTick(3);
    engine.stepTick(4);

    expect(engine.getRoutingTable('A')!['B'].cost).toBe(3);
    expect(engine.getMetrics().isStable).toBe(true);
  });
});
