import { describe, it, expect } from 'vitest';
import {
  createLinear3Node,
  createDiamondMultiPath,
  createArpanet1972,
  createDualRingTopology,
  generateRandomMesh,
  BENCHMARK_PRESETS,
} from '../presets';
import { NetworkGraph } from '../NetworkGraph';

describe('Phase 2 - Issue #6: Benchmark Preset Topology Library', () => {
  it('should generate valid Linear 3-Node Topology (A - B - C)', () => {
    const snap = createLinear3Node();
    expect(snap.nodes.length).toBe(3);
    expect(snap.nodes.map((n) => n.id)).toEqual(['A', 'B', 'C']);
    expect(snap.edges.length).toBe(2);
    expect(snap.edges.every((e) => e.cost === 1)).toBe(true);

    const graph = new NetworkGraph(snap);
    expect(graph.getNeighbors('B', true).length).toBe(2);
  });

  it('should generate valid Diamond Multi-Path Topology with asymmetric costs', () => {
    const snap = createDiamondMultiPath();
    expect(snap.nodes.length).toBe(4);
    expect(snap.edges.length).toBe(4);

    const edgeMap = new Map(snap.edges.map((e) => [e.id, e.cost]));
    expect(edgeMap.get('A<->B')).toBe(1);
    expect(edgeMap.get('A<->C')).toBe(4);
    expect(edgeMap.get('B<->D')).toBe(5);
    expect(edgeMap.get('C<->D')).toBe(1);
  });

  it('should generate valid ARPANET 1972 Core Subnet', () => {
    const snap = createArpanet1972();
    expect(snap.nodes.length).toBe(9);
    expect(snap.edges.length).toBe(10);
    const nodeIds = snap.nodes.map((n) => n.id);
    expect(nodeIds).toContain('SRI');
    expect(nodeIds).toContain('UCLA');
    expect(nodeIds).toContain('MIT');
    expect(nodeIds).toContain('BBN');
  });

  it('should generate valid Dual-Ring & Core Cross-Links Topology', () => {
    const snap = createDualRingTopology();
    expect(snap.nodes.length).toBe(8);
    expect(snap.edges.length).toBe(11);
  });

  describe('Random Mesh Generator with Guaranteed Connectivity', () => {
    it('should generate exact node counts requested', () => {
      const snap6 = generateRandomMesh(6, 0.4);
      expect(snap6.nodes.length).toBe(6);

      const snap10 = generateRandomMesh(10, 0.3);
      expect(snap10.nodes.length).toBe(10);
    });

    it('should guarantee 100% connectivity (no disconnected components)', () => {
      for (const count of [4, 7, 12]) {
        const snap = generateRandomMesh(count, 0.2);
        const graph = new NetworkGraph(snap);

        // Run BFS reachability from the first node
        const startNode = snap.nodes[0].id;
        const visited = new Set<string>();
        const queue = [startNode];
        visited.add(startNode);

        while (queue.length > 0) {
          const curr = queue.shift()!;
          const neighbors = graph.getNeighbors(curr, true);
          for (const n of neighbors) {
            if (!visited.has(n.neighborId)) {
              visited.add(n.neighborId);
              queue.push(n.neighborId);
            }
          }
        }

        expect(visited.size).toBe(count);
      }
    });

    it('should scale edge density with linkProbability', () => {
      // With high probability (0.9), edge count should exceed minimum spanning tree (N-1)
      const denseSnap = generateRandomMesh(8, 0.9);
      expect(denseSnap.edges.length).toBeGreaterThan(7);
    });
  });

  it('should have complete benchmark presets catalog with descriptors', () => {
    expect(BENCHMARK_PRESETS.length).toBe(4);
    for (const preset of BENCHMARK_PRESETS) {
      expect(preset.id).toBeTruthy();
      expect(preset.name).toBeTruthy();
      expect(preset.description).toBeTruthy();
      const snap = preset.generateSnapshot();
      expect(snap.nodes.length).toBeGreaterThan(0);
      expect(snap.edges.length).toBeGreaterThan(0);
    }
  });
});
