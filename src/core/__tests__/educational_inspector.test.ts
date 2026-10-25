import { describe, it, expect, beforeEach } from 'vitest';
import { NetworkGraph } from '../NetworkGraph';
import { Dijkstra } from '../lsr/Dijkstra';
import { DistanceVectorEngine } from '../dvr/DistanceVectorEngine';
import { createDiamondMultiPath } from '../presets';

describe('Phase 5 - Issue #13: Step-by-Step Algorithm Educational Inspector', () => {
  let graph: NetworkGraph;
  let dvrEngine: DistanceVectorEngine;

  beforeEach(() => {
    graph = new NetworkGraph(createDiamondMultiPath());
    dvrEngine = new DistanceVectorEngine(graph);
  });

  describe('Dijkstra Step-by-Step Walkthrough Engine', () => {
    it('generates complete step-by-step trace from root node A', () => {
      // In Diamond topology: A (root), B (cost 1), C (cost 4), D (B-D=5, C-D=1)
      const allNodes = ['A', 'B', 'C', 'D'];
      const adj = new Map<string, Map<string, number>>();
      for (const n of allNodes) adj.set(n, new Map());
      for (const e of graph.getEdges()) {
        adj.get(e.source)?.set(e.target, e.cost);
        adj.get(e.target)?.set(e.source, e.cost);
      }

      const result = Dijkstra.compute('A', adj, allNodes);

      expect(result.steps.length).toBeGreaterThanOrEqual(4);

      // Step 0: Initialization
      const step0 = result.steps[0];
      expect(step0.stepIndex).toBe(0);
      expect(step0.visitedNodes.length).toBe(0); // S = empty
      expect(step0.unvisitedNodes.length).toBe(4); // Q = {A, B, C, D}
      expect(step0.tentativeDistances['A']).toBe(0);
      expect(step0.tentativeDistances['B']).toBe(Infinity);
      expect(step0.tentativeDistances['C']).toBe(Infinity);
      expect(step0.tentativeDistances['D']).toBe(Infinity);

      // Step 1: Root node A is finalized and its neighbors B and C are relaxed
      const step1 = result.steps[1];
      expect(step1.currentNode).toBe('A');
      expect(step1.visitedNodes).toContain('A');
      expect(step1.unvisitedNodes).not.toContain('A');
      expect(step1.tentativeDistances['B']).toBe(1); // Relaxed via A
      expect(step1.tentativeDistances['C']).toBe(4); // Relaxed via A
      expect(step1.predecessors['B']).toBe('A');
      expect(step1.predecessors['C']).toBe('A');

      // Final step: All nodes finalized in visited set S
      const finalStep = result.steps[result.steps.length - 1];
      expect(finalStep.visitedNodes.length).toBe(4);
      expect(finalStep.unvisitedNodes.length).toBe(0);

      // Final shortest path to D should be via C (cost 5: A -> C -> D)
      expect(result.distances['D']).toBe(5);
      expect(result.predecessors['D']).toBe('C');
      expect(result.forwardingTable['D'].nextHop).toBe('C');
      expect(result.forwardingTable['D'].path).toEqual(['A', 'C', 'D']);
    });

    it('traces execution from different root node C', () => {
      const allNodes = ['A', 'B', 'C', 'D'];
      const adj = new Map<string, Map<string, number>>();
      for (const n of allNodes) adj.set(n, new Map());
      for (const e of graph.getEdges()) {
        adj.get(e.source)?.set(e.target, e.cost);
        adj.get(e.target)?.set(e.source, e.cost);
      }

      const result = Dijkstra.compute('C', adj, allNodes);
      expect(result.steps[0].tentativeDistances['C']).toBe(0);
      expect(result.steps[0].tentativeDistances['A']).toBe(Infinity);
      expect(result.distances['D']).toBe(1); // C-D direct is 1
      expect(result.predecessors['D']).toBe('C');
    });
  });

  describe('Bellman-Ford Relaxation Matrix Engine', () => {
    it('produces detailed mathematical relaxation explanation with winning neighbors', () => {
      // Allow DVR to exchange initial vectors
      dvrEngine.advertiseAll(0);
      dvrEngine.stepTick(1);
      dvrEngine.stepTick(2);

      const explanation = dvrEngine.explainRelaxation('A');
      expect(explanation).toBeDefined();
      expect(explanation?.nodeId).toBe('A');
      expect(explanation?.formula).toContain('D_x(y) = min_v');

      // Should have rows for A, B, C, D
      expect(explanation?.rows.length).toBe(4);

      // Row for Destination D:
      const rowD = explanation?.rows.find((r) => r.destination === 'D');
      expect(rowD).toBeDefined();

      // In Diamond topology:
      // Operational neighbors of A are B and C
      // Evaluation via B: c(A, B) + D_B(D) = 1 + 5 = 6
      // Evaluation via C: c(A, C) + D_C(D) = 4 + 1 = 5
      expect(rowD?.evaluations.length).toBe(2);

      const evalB = rowD?.evaluations.find((e) => e.neighborId === 'B');
      const evalC = rowD?.evaluations.find((e) => e.neighborId === 'C');

      expect(evalB?.totalCost).toBe(6);
      expect(evalC?.totalCost).toBe(5);

      // Neighbor C offers minimum cost (5 < 6), so C must be winning neighbor
      expect(evalC?.isWinningNeighbor).toBe(true);
      expect(evalB?.isWinningNeighbor).toBe(false);
      expect(rowD?.winningNeighbor).toBe('C');
      expect(rowD?.winningCost).toBe(5);
    });

    it('correctly flags routes that change when an edge cost mutates', () => {
      dvrEngine.advertiseAll(0);
      dvrEngine.stepTick(1);
      dvrEngine.stepTick(2);

      // Sever link C-D
      const edgeCD = graph.getEdgeBetween('C', 'D')!;
      graph.setEdgeStatus(edgeCD.id, 'DOWN');
      dvrEngine.stepTick(3);
      dvrEngine.stepTick(4);

      const explanation = dvrEngine.explainRelaxation('A');
      const rowD = explanation?.rows.find((r) => r.destination === 'D');

      // Now route via C is broken/infinity, so winning neighbor should switch to B (cost 6)
      expect(rowD?.winningNeighbor).toBe('B');
      expect(rowD?.winningCost).toBe(6);
    });
  });
});
