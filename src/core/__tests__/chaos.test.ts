import { describe, it, expect } from 'vitest';
import { NetworkGraph } from '../NetworkGraph';
import { ChaosEngine } from '../chaos/ChaosEngine';

describe('Phase 3 - Issue #8: Chaos Monkey & Link Flapping Engine', () => {
  it('should randomly sever and restore operational links', () => {
    const graph = new NetworkGraph();
    graph.addNode('A');
    graph.addNode('B');
    graph.addEdge('A', 'B', 5);

    const chaos = new ChaosEngine(graph);
    expect(graph.getEdgeBetween('A', 'B')?.status).toBe('UP');

    // Sever random link
    const ev = chaos.severRandomLink(1);
    expect(ev).toBeDefined();
    expect(ev?.type).toBe('LINK_SEVER');
    expect(graph.getEdgeBetween('A', 'B')?.status).toBe('DOWN');

    // If no UP links remain, returns null
    const ev2 = chaos.severRandomLink(2);
    expect(ev2).toBeNull();

    // Restore link
    const restoreEv = chaos.restoreLink('A<->B', 3);
    expect(restoreEv).toBeDefined();
    expect(restoreEv?.type).toBe('LINK_RESTORE');
    expect(graph.getEdgeBetween('A', 'B')?.status).toBe('UP');
  });

  it('should crash and recover routers cleanly', () => {
    const graph = new NetworkGraph();
    graph.addNode('R1');
    graph.addNode('R2');
    graph.addEdge('R1', 'R2', 2);

    const chaos = new ChaosEngine(graph);
    expect(graph.getNode('R1')?.status).toBe('ACTIVE');

    const crashEv = chaos.crashRandomRouter(1);
    expect(crashEv).toBeDefined();
    expect(crashEv?.type).toBe('ROUTER_CRASH');

    const crashedId = crashEv!.targetId;
    expect(graph.getNode(crashedId)?.status).toBe('CRASHED');

    // Recover router
    const recoverEv = chaos.recoverRouter(crashedId, 2);
    expect(recoverEv).toBeDefined();
    expect(recoverEv?.type).toBe('ROUTER_RECOVER');
    expect(graph.getNode(crashedId)?.status).toBe('ACTIVE');
  });

  it('should perturb edge weights within bounds using metric jitter', () => {
    const graph = new NetworkGraph();
    graph.addNode('A');
    graph.addNode('B');
    graph.addEdge('A', 'B', 10);

    const chaos = new ChaosEngine(graph, { metricJitterDelta: 3 });
    const jitterEvs = chaos.applyMetricJitter(1, 3, 1, 25);

    expect(jitterEvs.length).toBeGreaterThan(0);
    const newCost = graph.getEdgeBetween('A', 'B')?.cost;
    expect(newCost).toBeGreaterThanOrEqual(1);
    expect(newCost).toBeLessThanOrEqual(25);
    expect(newCost).not.toBe(10);
  });

  it('should manage link flapping intervals and phase transitions', () => {
    const graph = new NetworkGraph();
    graph.addNode('A');
    graph.addNode('B');
    graph.addEdge('A', 'B', 4);

    const chaos = new ChaosEngine(graph);
    const edgeId = 'A<->B';

    // Start flapping with interval 2 ticks
    const startEv = chaos.startLinkFlap(edgeId, 2, 0);
    expect(startEv?.type).toBe('LINK_FLAP_START');
    expect(chaos.isEdgeFlapping(edgeId)).toBe(true);
    expect(graph.getEdge(edgeId)?.status).toBe('FLAPPING');

    // Advance ticks and verify flap processing
    chaos.stepTick(1);
    chaos.stepTick(2); // Flips phase

    // Stop flapping
    const stopEv = chaos.stopLinkFlap(edgeId, 'UP', 3);
    expect(stopEv?.type).toBe('LINK_FLAP_STOP');
    expect(chaos.isEdgeFlapping(edgeId)).toBe(false);
    expect(graph.getEdge(edgeId)?.status).toBe('UP');
  });

  it('should maintain an incident event history log', () => {
    const graph = new NetworkGraph();
    graph.addNode('A');
    graph.addNode('B');
    graph.addEdge('A', 'B', 2);

    const chaos = new ChaosEngine(graph);
    chaos.severRandomLink(1);
    chaos.crashRandomRouter(2);

    const history = chaos.getEventHistory();
    expect(history.length).toBe(2);
    expect(history[0].type).toBe('ROUTER_CRASH'); // Most recent first
    expect(history[1].type).toBe('LINK_SEVER');

    chaos.clearEventHistory();
    expect(chaos.getEventHistory().length).toBe(0);
  });
});
