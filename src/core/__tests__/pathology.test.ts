import { describe, it, expect } from 'vitest';
import { NetworkGraph } from '../NetworkGraph';
import { DistanceVectorEngine } from '../dvr/DistanceVectorEngine';

describe('Phase 1 - Issue #4: Distance Vector Pathology Engine (Count-to-Infinity & Mitigations)', () => {
  it('should support global and per-node configuration toggles', () => {
    const graph = new NetworkGraph();
    graph.addNode('A');
    graph.addNode('B');
    graph.addEdge('A', 'B', 1);

    const engine = new DistanceVectorEngine(graph, {
      infinityThreshold: 16,
      splitHorizonEnabled: false,
      poisonReverseEnabled: false,
    });

    expect(engine.getConfig().splitHorizonEnabled).toBe(false);
    expect(engine.getConfig().poisonReverseEnabled).toBe(false);
    expect(engine.getConfig().infinityThreshold).toBe(16);

    // Global toggles
    engine.setGlobalSplitHorizon(true);
    expect(engine.getConfig().splitHorizonEnabled).toBe(true);

    engine.setGlobalPoisonReverse(true);
    expect(engine.getConfig().poisonReverseEnabled).toBe(true);

    engine.setInfinityThreshold(32);
    expect(engine.getConfig().infinityThreshold).toBe(32);

    // Per-node overrides
    engine.setNodeConfig('A', { splitHorizonEnabled: false });
    expect(engine.getNodeEffectiveConfig('A').splitHorizonEnabled).toBe(false);
    expect(engine.getNodeEffectiveConfig('B').splitHorizonEnabled).toBe(true);
  });

  it('should demonstrate Count-to-Infinity when Split Horizon is disabled and link severs', () => {
    // Classic 3-node linear topology: A - B - C
    // Edge costs: A-B = 1, B-C = 1
    const graph = new NetworkGraph();
    graph.addNode('A');
    graph.addNode('B');
    graph.addNode('C');
    graph.addEdge('A', 'B', 1);
    const edgeBC = graph.addEdge('B', 'C', 1);

    // Configure naive DVR: no Split Horizon, no Poison Reverse, infinity = 16
    const engine = new DistanceVectorEngine(graph, {
      infinityThreshold: 16,
      splitHorizonEnabled: false,
      poisonReverseEnabled: false,
    });

    // 1. Converge initial steady state
    engine.advertiseAll(0);
    for (let t = 1; t <= 4; t++) {
      engine.stepTick(t);
    }

    expect(engine.getMetrics().isStable).toBe(true);
    expect(engine.getRoutingTable('A')!['C'].cost).toBe(2);
    expect(engine.getRoutingTable('A')!['C'].nextHop).toBe('B');
    expect(engine.getRoutingTable('B')!['C'].cost).toBe(1);
    expect(engine.getRoutingTable('B')!['C'].nextHop).toBe('C');

    // 2. Sever link B - C
    graph.setEdgeStatus(edgeBC.id, 'DOWN');

    // 3. Step forward and observe Count-to-Infinity progression
    let maxCostObserved = 0;
    let loopDetected = false;

    for (let t = 5; t <= 40; t++) {
      engine.stepTick(t);

      const costA = engine.getRoutingTable('A')!['C'].cost;
      const costB = engine.getRoutingTable('B')!['C'].cost;
      maxCostObserved = Math.max(maxCostObserved, costA, costB);

      if (engine.getMetrics().activeLoops.length > 0) {
        loopDetected = true;
      }

      if (engine.getMetrics().isStable) {
        break;
      }
    }

    // Ping-pong count incremented through intermediate steps
    expect(engine.getMetrics().countToInfinityEvents).toBeGreaterThan(0);
    expect(loopDetected).toBe(true);

    // Eventually halts at infinity (16) and marks C unreachable
    const finalTableA = engine.getRoutingTable('A')!;
    const finalTableB = engine.getRoutingTable('B')!;
    expect(finalTableA['C'].cost).toBe(16);
    expect(finalTableA['C'].nextHop).toBeNull();
    expect(finalTableB['C'].cost).toBe(16);
    expect(finalTableB['C'].nextHop).toBeNull();
    expect(engine.getMetrics().isStable).toBe(true);
  });

  it('should immediately prevent Count-to-Infinity when Split Horizon is enabled', () => {
    const graph = new NetworkGraph();
    graph.addNode('A');
    graph.addNode('B');
    graph.addNode('C');
    graph.addEdge('A', 'B', 1);
    const edgeBC = graph.addEdge('B', 'C', 1);

    const engine = new DistanceVectorEngine(graph, {
      infinityThreshold: 16,
      splitHorizonEnabled: true,
      poisonReverseEnabled: false,
    });

    // 1. Initial convergence
    engine.advertiseAll(0);
    for (let t = 1; t <= 4; t++) {
      engine.stepTick(t);
    }
    expect(engine.getRoutingTable('A')!['C'].cost).toBe(2);

    // 2. Sever link B - C
    graph.setEdgeStatus(edgeBC.id, 'DOWN');

    // 3. Step simulation: With split horizon, B should not adopt A's route
    for (let t = 5; t <= 10; t++) {
      engine.stepTick(t);
      if (engine.getMetrics().isStable) break;
    }

    // Should stabilize rapidly without long count-to-infinity loop
    expect(engine.getMetrics().isStable).toBe(true);
    expect(engine.getRoutingTable('B')!['C'].cost).toBe(16);
    expect(engine.getRoutingTable('B')!['C'].nextHop).toBeNull();
    expect(engine.getRoutingTable('A')!['C'].cost).toBe(16);
    expect(engine.getRoutingTable('A')!['C'].nextHop).toBeNull();
    expect(engine.getMetrics().countToInfinityEvents).toBe(0);
  });

  it('should immediately poison the reverse route and halt loops when Poison Reverse is enabled', () => {
    const graph = new NetworkGraph();
    graph.addNode('A');
    graph.addNode('B');
    graph.addNode('C');
    graph.addEdge('A', 'B', 1);
    const edgeBC = graph.addEdge('B', 'C', 1);

    const engine = new DistanceVectorEngine(graph, {
      infinityThreshold: 16,
      splitHorizonEnabled: false,
      poisonReverseEnabled: true,
    });

    // 1. Initial convergence
    engine.advertiseAll(0);
    for (let t = 1; t <= 4; t++) {
      engine.stepTick(t);
    }
    expect(engine.getRoutingTable('A')!['C'].cost).toBe(2);

    // 2. Sever link B - C
    graph.setEdgeStatus(edgeBC.id, 'DOWN');

    // 3. Step simulation: B sees advertised distance of 16 from A and immediately rejects it
    for (let t = 5; t <= 10; t++) {
      engine.stepTick(t);
      if (engine.getMetrics().isStable) break;
    }

    expect(engine.getMetrics().isStable).toBe(true);
    expect(engine.getRoutingTable('B')!['C'].cost).toBe(16);
    expect(engine.getRoutingTable('B')!['C'].nextHop).toBeNull();
    expect(engine.getRoutingTable('A')!['C'].cost).toBe(16);
    expect(engine.getRoutingTable('A')!['C'].nextHop).toBeNull();
    expect(engine.getMetrics().countToInfinityEvents).toBe(0);
  });
});
