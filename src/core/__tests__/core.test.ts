import { describe, it, expect, vi } from 'vitest';
import { NetworkGraph } from '../NetworkGraph';
import { SimulationClock } from '../SimulationClock';
import { StateLedger } from '../StateLedger';
import { StateSnapshot } from '../types';

describe('Phase 1 - Issue #1: Network Topology & Clock Engine', () => {
  describe('NetworkGraph', () => {
    it('should add and remove nodes properly', () => {
      const graph = new NetworkGraph();
      const n1 = graph.addNode('R1', 'Router 1', 100, 150);
      expect(n1.id).toBe('R1');
      expect(n1.label).toBe('Router 1');
      expect(n1.status).toBe('ACTIVE');
      expect(graph.getNodes().length).toBe(1);

      // Duplicate check
      expect(() => graph.addNode('R1')).toThrowError(/already exists/);

      // Remove check
      expect(graph.removeNode('R1')).toBe(true);
      expect(graph.getNodes().length).toBe(0);
      expect(graph.removeNode('R1')).toBe(false);
    });

    it('should handle node statuses (ACTIVE, CRASHED)', () => {
      const graph = new NetworkGraph();
      graph.addNode('R1');
      expect(graph.getNode('R1')?.status).toBe('ACTIVE');

      graph.setNodeStatus('R1', 'CRASHED');
      expect(graph.getNode('R1')?.status).toBe('CRASHED');

      graph.setNodeStatus('R1', 'ACTIVE');
      expect(graph.getNode('R1')?.status).toBe('ACTIVE');
    });

    it('should add, get, and remove weighted edges', () => {
      const graph = new NetworkGraph();
      graph.addNode('A');
      graph.addNode('B');
      graph.addNode('C');

      const edge = graph.addEdge('A', 'B', 5);
      expect(edge.cost).toBe(5);
      expect(edge.status).toBe('UP');
      expect(edge.directed).toBe(false);

      // Self loop rejection
      expect(() => graph.addEdge('A', 'A', 2)).toThrowError(/Self-loops/);
      // Negative cost rejection
      expect(() => graph.addEdge('A', 'C', -1)).toThrowError(/non-negative/);

      // Duplicate edge rejection
      expect(() => graph.addEdge('A', 'B', 10)).toThrowError(/already exists/);

      // Fetch edge
      const fetched = graph.getEdgeBetween('B', 'A');
      expect(fetched?.cost).toBe(5);

      // Remove edge
      expect(graph.removeEdgeBetween('A', 'B')).toBe(true);
      expect(graph.getEdges().length).toBe(0);
    });

    it('should correctly handle edge statuses (UP, DOWN, FLAPPING)', () => {
      const graph = new NetworkGraph();
      graph.addNode('A');
      graph.addNode('B');
      const edge = graph.addEdge('A', 'B', 4);

      // Toggle status
      const next1 = graph.toggleEdgeStatus(edge.id);
      expect(next1).toBe('DOWN');
      expect(graph.getEdge(edge.id)?.status).toBe('DOWN');

      const next2 = graph.toggleEdgeStatus(edge.id);
      expect(next2).toBe('UP');
      expect(graph.getEdge(edge.id)?.status).toBe('UP');

      // Flapping configuration
      graph.setEdgeStatus(edge.id, 'FLAPPING', 2);
      const flappingEdge = graph.getEdge(edge.id);
      expect(flappingEdge?.status).toBe('FLAPPING');
      expect(flappingEdge?.flapInterval).toBe(2);

      // Effective up calculation during flapping
      expect(graph.isEdgeEffectivelyUp(flappingEdge!)).toBe(true);
      graph.handleTickFlapping(); // counter becomes 1
      graph.handleTickFlapping(); // counter reached interval (2) and reset
    });

    it('should filter active neighbors correctly according to node and link statuses', () => {
      const graph = new NetworkGraph();
      graph.addNode('R1');
      graph.addNode('R2');
      graph.addNode('R3');
      const e1 = graph.addEdge('R1', 'R2', 3);
      graph.addEdge('R1', 'R3', 7);

      // Initially both neighbors are active
      let neighbors = graph.getNeighbors('R1', true);
      expect(neighbors.length).toBe(2);

      // Sever link R1 - R2
      graph.setEdgeStatus(e1.id, 'DOWN');
      neighbors = graph.getNeighbors('R1', true);
      expect(neighbors.length).toBe(1);
      expect(neighbors[0].neighborId).toBe('R3');

      // Crash node R3
      graph.setNodeStatus('R3', 'CRASHED');
      neighbors = graph.getNeighbors('R1', true);
      expect(neighbors.length).toBe(0);

      // But non-active query should still return topology structure
      const allNeighbors = graph.getNeighbors('R1', false);
      expect(allNeighbors.length).toBe(2);
    });

    it('should support clone, export, and import snapshot', () => {
      const graph = new NetworkGraph();
      graph.addNode('X', 'Node X', 10, 20);
      graph.addNode('Y', 'Node Y', 30, 40);
      graph.addEdge('X', 'Y', 9);

      const snapshot = graph.exportSnapshot();
      expect(snapshot.nodes.length).toBe(2);
      expect(snapshot.edges.length).toBe(1);

      const cloned = graph.clone();
      expect(cloned.getNodes().length).toBe(2);
      expect(cloned.getEdges().length).toBe(1);

      // Verify independence
      cloned.addNode('Z');
      expect(cloned.getNodes().length).toBe(3);
      expect(graph.getNodes().length).toBe(2);
    });

    it('should trigger subscription change listeners on mutations', () => {
      const graph = new NetworkGraph();
      let callCount = 0;
      const unsubscribe = graph.subscribe(() => {
        callCount++;
      });

      graph.addNode('N1');
      expect(callCount).toBe(1);

      graph.addNode('N2');
      expect(callCount).toBe(2);

      const edge = graph.addEdge('N1', 'N2', 4);
      expect(callCount).toBe(3);

      graph.setEdgeCost(edge.id, 10);
      expect(callCount).toBe(4);

      unsubscribe();
      graph.removeNode('N1');
      expect(callCount).toBe(4); // No increment after unsubscribe
    });
  });

  describe('SimulationClock', () => {
    it('should step deterministically and emit onTick events', () => {
      const clock = new SimulationClock();
      expect(clock.getTick()).toBe(0);

      const ticksObserved: number[] = [];
      clock.onTick((t) => ticksObserved.push(t));

      clock.step();
      clock.step();
      clock.step();

      expect(clock.getTick()).toBe(3);
      expect(ticksObserved).toEqual([1, 2, 3]);

      clock.setTick(10);
      expect(clock.getTick()).toBe(10);
      expect(ticksObserved).toContain(10);

      clock.reset();
      expect(clock.getTick()).toBe(0);
    });

    it('should handle speed configuration and running state transitions', () => {
      vi.useFakeTimers();
      const clock = new SimulationClock(0, 1000);
      expect(clock.getIsRunning()).toBe(false);

      const stateChanges: boolean[] = [];
      clock.onRunningStateChange((running) => stateChanges.push(running));

      clock.start();
      expect(clock.getIsRunning()).toBe(true);
      expect(stateChanges).toEqual([true]);

      vi.advanceTimersByTime(2000);
      expect(clock.getTick()).toBe(2);

      // Adjust speed to 2x (500ms per tick)
      clock.setSpeed(2.0);
      expect(clock.getSpeed()).toBe(2.0);
      vi.advanceTimersByTime(1000);
      expect(clock.getTick()).toBe(4);

      clock.pause();
      expect(clock.getIsRunning()).toBe(false);
      expect(stateChanges).toEqual([true, false]);

      vi.clearAllTimers();
      vi.useRealTimers();
    });
  });

  describe('StateLedger', () => {
    it('should record and retrieve immutable snapshots', () => {
      const ledger = new StateLedger();
      const initialSnapshot: StateSnapshot = {
        tick: 0,
        timestamp: Date.now(),
        graph: {
          nodes: [{ id: 'A', label: 'A', x: 0, y: 0, status: 'ACTIVE' }],
          edges: [],
        },
        routingTables: {
          A: {
            A: { destination: 'A', nextHop: 'A', cost: 0 },
          },
        },
      };

      ledger.recordSnapshot(initialSnapshot);
      expect(ledger.getSnapshotCount()).toBe(1);
      expect(ledger.getMaxTick()).toBe(0);

      // Verify deep clone immutability
      initialSnapshot.graph.nodes[0].status = 'CRASHED';
      initialSnapshot.routingTables['A']['A'].cost = 99;

      const retrieved = ledger.getSnapshot(0);
      expect(retrieved).toBeDefined();
      expect(retrieved?.graph.nodes[0].status).toBe('ACTIVE');
      expect(retrieved?.routingTables['A']['A'].cost).toBe(0);
    });

    it('should maintain chronological history and support truncation for time-travel branching', () => {
      const ledger = new StateLedger();
      for (let t = 0; t <= 5; t++) {
        ledger.recordSnapshot({
          tick: t,
          timestamp: 1000 + t * 100,
          graph: { nodes: [], edges: [] },
          routingTables: {},
        });
      }

      expect(ledger.getSnapshotCount()).toBe(6);
      expect(ledger.getMaxTick()).toBe(5);

      const history = ledger.getHistory();
      expect(history.map((h) => h.tick)).toEqual([0, 1, 2, 3, 4, 5]);

      // Truncate from tick 2 onwards (keep 0, 1, 2)
      ledger.truncateFromTick(2);
      expect(ledger.getSnapshotCount()).toBe(3);
      expect(ledger.getMaxTick()).toBe(2);
      expect(ledger.getSnapshot(3)).toBeUndefined();
    });

    it('should support JSON export and import', () => {
      const ledger = new StateLedger();
      ledger.recordSnapshot({
        tick: 1,
        timestamp: 1234567,
        graph: {
          nodes: [{ id: 'R1', label: 'R1', x: 10, y: 10, status: 'ACTIVE' }],
          edges: [],
        },
        routingTables: {},
      });

      const jsonStr = ledger.exportJson();
      const newLedger = new StateLedger();
      newLedger.importJson(jsonStr);

      expect(newLedger.getSnapshotCount()).toBe(1);
      const snap = newLedger.getSnapshot(1);
      expect(snap?.graph.nodes[0].id).toBe('R1');
    });
  });
});
