import { describe, it, expect } from 'vitest';
import { NetworkGraph } from '../NetworkGraph';
import { PacketTracer } from '../tracer/PacketTracer';
import { RoutingTable } from '../types';

describe('Phase 3 - Issue #9: Live In-Flight Packet Tracer & Routing Loop Visualizer', () => {
  it('should forward packet hop-by-hop along routing table to destination', () => {
    const graph = new NetworkGraph();
    graph.addNode('A');
    graph.addNode('B');
    graph.addNode('C');
    graph.addEdge('A', 'B', 1);
    graph.addEdge('B', 'C', 1);

    // Mock routing table provider
    const tables: Record<string, RoutingTable> = {
      A: {
        C: { destination: 'C', nextHop: 'B', cost: 2, path: ['A', 'B', 'C'] },
      },
      B: {
        C: { destination: 'C', nextHop: 'C', cost: 1, path: ['B', 'C'] },
      },
      C: {
        C: { destination: 'C', nextHop: 'C', cost: 0, path: ['C'] },
      },
    };

    const tracer = new PacketTracer(graph, (id) => tables[id]);

    // Send Ping A -> C with TTL = 10
    const packet = tracer.sendPing('A', 'C', 10, 'Test Ping', 0);
    expect(packet.status).toBe('IN_FLIGHT');
    expect(packet.ttl).toBe(10);
    expect(packet.currentHop).toBe('A');

    // Tick 1: A forwards to B
    tracer.stepTick(1);
    const active1 = tracer.getActivePackets();
    expect(active1.length).toBe(1);
    expect(active1[0].currentHop).toBe('B');
    expect(active1[0].ttl).toBe(9);
    expect(active1[0].totalHops).toBe(1);

    // Tick 2: B forwards to C -> Destination reached!
    tracer.stepTick(2);
    expect(tracer.getActivePackets().length).toBe(0);

    const completed = tracer.getCompletedPackets();
    expect(completed.length).toBe(1);
    expect(completed[0].status).toBe('DELIVERED');
    expect(completed[0].currentHop).toBe('C');
    expect(completed[0].totalHops).toBe(2);
    expect(completed[0].ttl).toBe(8);
  });

  it('should detect routing loops and expire with ICMP Time Exceeded upon TTL=0', () => {
    const graph = new NetworkGraph();
    graph.addNode('A');
    graph.addNode('B');
    graph.addNode('Target');
    graph.addEdge('A', 'B', 1);

    // Cyclic forwarding loop: A forwards to B, B forwards to A
    const tables: Record<string, RoutingTable> = {
      A: {
        Target: { destination: 'Target', nextHop: 'B', cost: 3 },
      },
      B: {
        Target: { destination: 'Target', nextHop: 'A', cost: 4 },
      },
    };

    const tracer = new PacketTracer(graph, (id) => tables[id]);

    // Send ping with small TTL = 4
    tracer.sendPing('A', 'Target', 4, 'Looping Ping', 0);

    // Step 1: A -> B (TTL = 3)
    tracer.stepTick(1);
    let active = tracer.getActivePackets();
    expect(active[0].currentHop).toBe('B');
    expect(active[0].ttl).toBe(3);

    // Step 2: B -> A (TTL = 2) -> Loop detected!
    tracer.stepTick(2);
    active = tracer.getActivePackets();
    expect(active[0].currentHop).toBe('A');
    expect(active[0].cycleDetected).toBe(true);
    expect(active[0].ttl).toBe(2);

    // Step 3: A -> B (TTL = 1)
    tracer.stepTick(3);
    // Step 4: B -> A (TTL = 0) -> Expiry!
    tracer.stepTick(4);

    expect(tracer.getActivePackets().length).toBe(0);
    const completed = tracer.getCompletedPackets();
    expect(completed.length).toBe(1);
    expect(completed[0].status).toBe('TTL_EXPIRED');
    expect(completed[0].dropReason).toContain('ICMP Time Exceeded');
    expect(completed[0].cycleDetected).toBe(true);
  });

  it('should drop packet with NO_ROUTE_DROP if destination is unreachable', () => {
    const graph = new NetworkGraph();
    graph.addNode('A');
    graph.addNode('B');
    graph.addEdge('A', 'B', 1);

    const tables: Record<string, RoutingTable> = {
      A: {}, // Empty table
    };

    const tracer = new PacketTracer(graph, (id) => tables[id]);
    tracer.sendPing('A', 'B', 10, 'Ping', 0);

    tracer.stepTick(1);
    const completed = tracer.getCompletedPackets();
    expect(completed.length).toBe(1);
    expect(completed[0].status).toBe('NO_ROUTE_DROP');
    expect(completed[0].dropReason).toContain('Destination Unreachable');
  });

  it('should drop packet with LINK_DOWN_DROP if intermediate link is severed', () => {
    const graph = new NetworkGraph();
    graph.addNode('A');
    graph.addNode('B');
    const edge = graph.addEdge('A', 'B', 1);

    const tables: Record<string, RoutingTable> = {
      A: {
        B: { destination: 'B', nextHop: 'B', cost: 1 },
      },
    };

    const tracer = new PacketTracer(graph, (id) => tables[id]);
    tracer.sendPing('A', 'B', 10, 'Ping', 0);

    // Sever the link
    graph.setEdgeStatus(edge.id, 'DOWN');

    tracer.stepTick(1);
    const completed = tracer.getCompletedPackets();
    expect(completed.length).toBe(1);
    expect(completed[0].status).toBe('LINK_DOWN_DROP');
    expect(completed[0].dropReason).toContain('is DOWN');
  });
});
