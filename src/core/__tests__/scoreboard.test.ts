import { describe, it, expect, beforeEach } from 'vitest';
import { NetworkGraph } from '../NetworkGraph';
import { LinkStateEngine } from '../lsr/LinkStateEngine';
import { DistanceVectorEngine } from '../dvr/DistanceVectorEngine';
import { MetricsCollector } from '../analytics/MetricsCollector';
import { createDiamondMultiPath } from '../presets';

describe('Phase 4 - Issue #12: Real-Time Comparative Metrics Scoreboard', () => {
  let graph: NetworkGraph;
  let lsrEngine: LinkStateEngine;
  let dvrEngine: DistanceVectorEngine;
  let collector: MetricsCollector;

  beforeEach(() => {
    graph = new NetworkGraph(createDiamondMultiPath());
    lsrEngine = new LinkStateEngine(graph);
    dvrEngine = new DistanceVectorEngine(graph);
    collector = new MetricsCollector(graph, lsrEngine, dvrEngine);
  });

  it('samples simulation ticks and collects cumulative message overhead metrics', () => {
    lsrEngine.originateAll(0);
    dvrEngine.advertiseAll(0);

    const sample0 = collector.sampleTick(0, 'Simulation Initialized');
    expect(sample0.tick).toBe(0);
    expect(sample0.lsrMessagesCumulative).toBeGreaterThan(0);
    expect(sample0.dvrMessagesCumulative).toBeGreaterThan(0);

    // Step tick 1
    lsrEngine.stepTick(1);
    dvrEngine.stepTick(1);
    const sample1 = collector.sampleTick(1);

    expect(sample1.tick).toBe(1);
    expect(collector.getHistory().length).toBe(2);
  });

  it('measures convergence time metric and determines recovery winner after a disruption', () => {
    // 1. Initial convergence
    lsrEngine.originateAll(0);
    dvrEngine.advertiseAll(0);
    for (let t = 1; t <= 4; t++) {
      lsrEngine.stepTick(t);
      dvrEngine.stepTick(t);
      collector.sampleTick(t);
    }

    expect(lsrEngine.getMetrics().isConverged).toBe(true);
    expect(dvrEngine.getMetrics().isStable).toBe(true);

    // 2. Inject failure disruption at tick 5: sever link C - D
    const edgeCD = graph.getEdgeBetween('C', 'D')!;
    graph.setEdgeStatus(edgeCD.id, 'DOWN');
    collector.registerDisruption(5, 'Link C-D Severed');

    // 3. Step ticks until re-converged
    for (let t = 6; t <= 10; t++) {
      lsrEngine.stepTick(t);
      dvrEngine.stepTick(t);
      collector.sampleTick(t);
    }

    const summary = collector.getSummary();
    expect(summary.recoveryRecords.length).toBeGreaterThan(0);

    const latest = summary.recoveryRecords[0];
    expect(latest.disruptionTick).toBe(5);
    expect(latest.lsrDurationTicks).toBeDefined();
    expect(latest.dvrDurationTicks).toBeDefined();
    expect(['LSR', 'DVR', 'TIE']).toContain(latest.winner);
  });

  it('computes realistic memory footprint for LSDB vs Distance Vector states', () => {
    lsrEngine.originateAll(0);
    dvrEngine.advertiseAll(0);
    lsrEngine.stepTick(1);
    dvrEngine.stepTick(1);

    const lsrBytes = collector.calculateLSRMemoryBytes();
    const dvrBytes = collector.calculateDVRMemoryBytes();

    // Memory footprint must be non-zero positive bytes
    expect(lsrBytes).toBeGreaterThan(0);
    expect(dvrBytes).toBeGreaterThan(0);

    // 4 nodes in Diamond topology:
    // LSDB: 4 nodes * (32B base + neighbors * 24B)
    expect(lsrBytes).toBeGreaterThan(100);
    // DVR: 4 nodes * (4 dests * 32B + neighbors * dests * 24B)
    expect(dvrBytes).toBeGreaterThan(100);
  });

  it('accurately measures routing loop duration during Count-to-Infinity instability', () => {
    // 3-node linear topology: A - B - C
    const linearGraph = new NetworkGraph();
    linearGraph.addNode('A');
    linearGraph.addNode('B');
    linearGraph.addNode('C');
    linearGraph.addEdge('A', 'B', 1);
    linearGraph.addEdge('B', 'C', 1);

    const lsr = new LinkStateEngine(linearGraph);
    const dvr = new DistanceVectorEngine(linearGraph);
    // Disable Split Horizon to trigger standard Count-to-Infinity loop
    dvr.setGlobalSplitHorizon(false);
    dvr.setGlobalPoisonReverse(false);

    const linearCollector = new MetricsCollector(linearGraph, lsr, dvr);

    // Initial convergence
    lsr.originateAll(0);
    dvr.advertiseAll(0);
    for (let t = 1; t <= 3; t++) {
      lsr.stepTick(t);
      dvr.stepTick(t);
      linearCollector.sampleTick(t);
    }

    // Sever link B-C
    const edgeBC = linearGraph.getEdgeBetween('B', 'C')!;
    linearGraph.setEdgeStatus(edgeBC.id, 'DOWN');
    linearCollector.registerDisruption(4, 'Link B-C Severed (Pathology Test)');

    // Step through count to infinity iterations
    for (let t = 5; t <= 12; t++) {
      lsr.stepTick(t);
      dvr.stepTick(t);
      linearCollector.sampleTick(t);
    }

    const summary = linearCollector.getSummary();
    // Loop duration ticks should have tracked the ticks where active routing loops existed
    expect(summary.totalLoopTicks).toBeGreaterThan(0);
  });

  it('resets all analytical telemetry cleanly on reset()', () => {
    collector.sampleTick(0, 'Init');
    collector.sampleTick(1);
    expect(collector.getHistory().length).toBe(2);

    collector.reset();
    expect(collector.getHistory().length).toBe(0);
    expect(collector.getSummary().totalLoopTicks).toBe(0);
  });
});
