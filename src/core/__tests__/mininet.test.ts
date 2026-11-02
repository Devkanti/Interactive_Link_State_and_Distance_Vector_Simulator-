import { describe, it, expect } from 'vitest';
import { MininetBridgeClient } from '../mininet/MininetBridgeClient';
import { NetworkNode, NetworkEdge } from '../types';

describe('Mininet Python Script Generator & Bridge Client', () => {
  const sampleNodes: NetworkNode[] = [
    { id: 'A', label: 'Router A', x: 100, y: 100, status: 'ACTIVE' },
    { id: 'B', label: 'Router B', x: 200, y: 100, status: 'ACTIVE' },
    { id: 'C', label: 'Router C', x: 300, y: 200, status: 'ACTIVE' },
  ];

  const sampleEdges: NetworkEdge[] = [
    { id: 'A-B', source: 'A', target: 'B', cost: 4, status: 'UP', directed: false },
    { id: 'B-C', source: 'B', target: 'C', cost: 2, status: 'UP', directed: false },
  ];

  it('generates a valid, executable standalone Mininet script', () => {
    const client = new MininetBridgeClient('http://localhost:8080');
    const script = client.generatePythonScript(sampleNodes, sampleEdges, 'LSR');

    // 1. Mininet and Linux router requirements
    expect(script).toContain('#!/usr/bin/env python3');
    expect(script).toContain('from mininet.net import Mininet');
    expect(script).toContain('class LinuxRouter(Node):');
    expect(script).toContain("self.cmd('sysctl -w net.ipv4.ip_forward=1')");

    // 2. Node definitions
    expect(script).toContain("a = net.addHost('a', cls=LinuxRouter, ip='10.1.0.1/16')");
    expect(script).toContain("b = net.addHost('b', cls=LinuxRouter, ip='10.2.0.1/16')");
    expect(script).toContain("c = net.addHost('c', cls=LinuxRouter, ip='10.3.0.1/16')");

    // 3. Point-to-point virtual ethernet links with subnets
    expect(script).toContain("link_a_b = net.addLink(a, b,");
    expect(script).toContain("params1={'ip': '10.0.1.1/24'}");
    expect(script).toContain("params2={'ip': '10.0.1.2/24'}");

    expect(script).toContain("link_b_c = net.addLink(b, c,");
    expect(script).toContain("params1={'ip': '10.0.2.1/24'}");
    expect(script).toContain("params2={'ip': '10.0.2.2/24'}");

    // 4. Verification commands for the professor
    expect(script).toContain('CLI(net)');
    expect(script).toContain('a ip route show');
  });

  it('correctly adapts script headers for Distance Vector (DVR)', () => {
    const client = new MininetBridgeClient();
    const script = client.generatePythonScript(sampleNodes, sampleEdges, 'DVR');
    expect(script).toContain('Target Protocol: DVR');
    expect(script).toContain('Distance Vector / RIP / Bellman-Ford');
  });

  it('manages bridge URL configuration', () => {
    const client = new MininetBridgeClient('http://192.168.1.100:8080/');
    expect(client.getBaseUrl()).toBe('http://192.168.1.100:8080/');

    client.setBaseUrl('http://127.0.0.1:9000///');
    expect(client.getBaseUrl()).toBe('http://127.0.0.1:9000');
  });

  it('returns graceful offline state when bridge server cannot be reached', async () => {
    const client = new MininetBridgeClient('http://127.0.0.1:54321');
    const status = await client.fetchStatus();
    expect(status.online).toBe(false);
    expect(client.getIsConnected()).toBe(false);
  });
});
