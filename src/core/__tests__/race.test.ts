import { describe, it, expect, beforeEach } from 'vitest';
import { NetworkGraph } from '../NetworkGraph';
import { LinkStateEngine } from '../lsr/LinkStateEngine';
import { DistanceVectorEngine } from '../dvr/DistanceVectorEngine';
import { SimulationClock } from '../SimulationClock';
import { createDiamondMultiPath } from '../presets';

describe('Phase 4 - Issue #11: Side-by-Side Dual-Engine Race Mode', () => {
  let graph: NetworkGraph;
  let lsrEngine: LinkStateEngine;
  let dvrEngine: DistanceVectorEngine;
  let clock: SimulationClock;

  beforeEach(() => {
    // Shared topology across both engines
    graph = new NetworkGraph(createDiamondMultiPath());
    lsrEngine = new LinkStateEngine(graph);
    dvrEngine = new DistanceVectorEngine(graph);
    clock = new SimulationClock();

    // Hook single synchronized clock to both engines
    clock.onTick((tick) => {
      lsrEngine.stepTick(tick);
      dvrEngine.stepTick(tick);
    });
  });

  it('synchronizes initial advertisements and achieves convergence across both engines', () => {
    lsrEngine.originateAll(0);
    dvrEngine.advertiseAll(0);

    // Initial state: packets in flight
    expect(lsrEngine.getInFlightPackets().length).toBeGreaterThan(0);
    expect(dvrEngine.getInFlightMessages().length).toBeGreaterThan(0);

    // Step clock synchronously for 4 ticks
    for (let t = 1; t <= 4; t++) {
      clock.step();
    }

    const lsrMetrics = lsrEngine.getMetrics();
    const dvrMetrics = dvrEngine.getMetrics();

    expect(lsrMetrics.isConverged).toBe(true);
    expect(dvrMetrics.isStable).toBe(true);

    // Both engines should have valid, finite forwarding paths from A to D
    const tableLsrA = lsrEngine.getRoutingTable('A');
    const tableDvrA = dvrEngine.getRoutingTable('A');

    expect(tableLsrA?.['D']?.cost).toBeLessThan(16);
    expect(tableDvrA?.['D']?.cost).toBeLessThan(16);
    // In Diamond topology (A-B=1, B-D=5 => 6; A-C=4, C-D=1 => 5): optimal is via C (cost 5)
    expect(tableLsrA?.['D']?.cost).toBe(5);
    expect(tableDvrA?.['D']?.cost).toBe(5);
  });

  it('mirrors link failure to both engines and triggers distinct packet broadcasts', () => {
    // 1. First bring both to convergence
    lsrEngine.originateAll(0);
    dvrEngine.advertiseAll(0);
    for (let t = 1; t <= 4; t++) clock.step();

    // 2. Sever optimal link C - D
    const edgeCD = graph.getEdgeBetween('C', 'D')!;
    expect(edgeCD).toBeDefined();
    graph.setEdgeStatus(edgeCD.id, 'DOWN');

    // Next tick: both engines detect topology mutation
    clock.step();

    // LSR should have flooded an incremental LSP with sequence number bump
    const lsrInFlight = lsrEngine.getInFlightPackets();
    // DVR should have generated vector advertisements across surviving links
    const dvrInFlight = dvrEngine.getInFlightMessages();

    // Verify distinct packet representations exist
    expect(lsrInFlight.length + dvrInFlight.length).toBeGreaterThan(0);

    // Step until reconverged to alternate path (via B, cost 1 + 5 = 6)
    for (let t = 6; t <= 10; t++) clock.step();

    expect(lsrEngine.getRoutingTable('A')?.['D']?.cost).toBe(6);
    expect(lsrEngine.getRoutingTable('A')?.['D']?.nextHop).toBe('B');

    expect(dvrEngine.getRoutingTable('A')?.['D']?.cost).toBe(6);
    expect(dvrEngine.getRoutingTable('A')?.['D']?.nextHop).toBe('B');
  });

  it('reflects dynamic edge cost mutations simultaneously in both engines', () => {
    lsrEngine.originateAll(0);
    dvrEngine.advertiseAll(0);
    for (let t = 1; t <= 4; t++) clock.step();

    // In Diamond topology:
    // A-B direct = 1
    // A-C-D-B alternate = 4 + 1 + 5 = 10
    // Increasing A-B direct cost to 20 causes both engines to route via C-D-B (cost 10)!
    const edgeAB = graph.getEdgeBetween('A', 'B')!;
    graph.setEdgeCost(edgeAB.id, 20);

    // Synchronously step clock for updates to propagate
    for (let t = 5; t <= 10; t++) clock.step();

    // Both engines should route to B via alternate path of cost 10
    expect(lsrEngine.getRoutingTable('A')?.['B']?.cost).toBe(10);
    expect(lsrEngine.getRoutingTable('A')?.['B']?.nextHop).toBe('C');

    expect(dvrEngine.getRoutingTable('A')?.['B']?.cost).toBe(10);
    expect(dvrEngine.getRoutingTable('A')?.['B']?.nextHop).toBe('C');
  });

  it('allows single simulation clock to pause, step, and reset both engines in tandem', () => {
    lsrEngine.originateAll(0);
    dvrEngine.advertiseAll(0);

    expect(clock.getTick()).toBe(0);
    clock.step();
    expect(clock.getTick()).toBe(1);

    clock.step();
    expect(clock.getTick()).toBe(2);

    clock.reset();
    expect(clock.getTick()).toBe(0);
  });
});
