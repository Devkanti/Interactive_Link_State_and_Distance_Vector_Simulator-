import { MininetStatusResponse, RouterKernelRoutes, MininetPingResult } from './mininetTypes';
import { NetworkNode, NetworkEdge } from '../types';

export class MininetBridgeClient {
  private baseUrl: string;
  private isConnected: boolean = false;
  private statusListeners: Array<(online: boolean, data?: MininetStatusResponse) => void> = [];

  constructor(initialUrl: string = 'http://localhost:8080') {
    this.baseUrl = typeof window !== 'undefined' 
      ? (localStorage.getItem('mininet_bridge_url') || initialUrl)
      : initialUrl;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public setBaseUrl(url: string): void {
    this.baseUrl = url.trim().replace(/\/+$/, '');
    if (typeof window !== 'undefined') {
      localStorage.setItem('mininet_bridge_url', this.baseUrl);
    }
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }

  public onStatusChange(callback: (online: boolean, data?: MininetStatusResponse) => void): () => void {
    this.statusListeners.push(callback);
    return () => {
      this.statusListeners = this.statusListeners.filter(l => l !== callback);
    };
  }

  private notifyStatus(online: boolean, data?: MininetStatusResponse) {
    this.isConnected = online;
    for (const listener of this.statusListeners) {
      try {
        listener(online, data);
      } catch (err) {
        console.error('Error in Mininet status listener:', err);
      }
    }
  }

  public async fetchStatus(): Promise<MininetStatusResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    try {
      const response = await fetch(`${this.baseUrl}/api/status`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const statusData: MininetStatusResponse = {
        online: true,
        engine: data.engine || 'Mininet L3 Emulation',
        mode: data.mode || 'LSR',
        nodes: data.nodes || [],
        links: data.links || [],
        recentEvents: data.recentEvents || [],
        timestamp: Date.now()
      };
      this.notifyStatus(true, statusData);
      return statusData;
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isAbort = err.name === 'AbortError';
      const statusData: MininetStatusResponse = {
        online: false,
        error: isAbort ? 'Connection timed out' : (err.message || 'Bridge offline')
      };
      this.notifyStatus(false, statusData);
      return statusData;
    }
  }

  public async fetchRoutes(): Promise<RouterKernelRoutes> {
    try {
      const response = await fetch(`${this.baseUrl}/api/routes`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      
      const rawMap: Record<string, any> = data.routes || data || {};
      const normalized: RouterKernelRoutes = {};
      
      for (const [key, list] of Object.entries(rawMap)) {
        if (key === 'routes') continue;
        if (Array.isArray(list)) {
          normalized[key] = list.map((item: any) => ({
            dst: item.dst || item.destination || 'default',
            gateway: item.gateway || item.nextHop || undefined,
            dev: item.dev || item.interface || 'veth',
            metric: item.metric ?? item.cost ?? 0,
            protocol: item.protocol || (item.gateway || item.nextHop ? 'lsr' : 'kernel'),
            scope: item.scope || (item.gateway || item.nextHop ? 'global' : 'link'),
            raw: item.raw
          }));
        }
      }
      return normalized;
    } catch (err) {
      console.warn('Failed to fetch Mininet routes:', err);
      return {};
    }
  }

  public async setLinkStatus(source: string, target: string, status: 'up' | 'down'): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, target, status })
      });
      return response.ok;
    } catch (err) {
      console.warn('Failed to toggle Mininet link status:', err);
      return false;
    }
  }

  public async switchProtocol(protocol: 'LSR' | 'DVR'): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/protocol`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ protocol })
      });
      return response.ok;
    } catch (err) {
      console.warn('Failed to switch Mininet protocol:', err);
      return false;
    }
  }

  public async executePing(src: string, dst: string, count: number = 2): Promise<MininetPingResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ src, dst, count })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (err: any) {
      return {
        success: false,
        src,
        dst,
        output: `Ping failed: ${err.message || 'Unknown network error'}`
      };
    }
  }

  public async syncTopology(
    preset: string,
    nodes: NetworkNode[],
    edges: NetworkEdge[]
  ): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/topology`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preset,
          nodes: nodes.map((n) => ({ id: n.id, label: n.label || n.id, status: n.status })),
          edges: edges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            cost: e.cost,
            status: e.status,
          })),
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  public async fetchTopology(): Promise<{
    preset: string;
    nodes: Array<{ id: string; label: string; status: string }>;
    edges: Array<{ id: string; source: string; target: string; cost: number; status: string }>;
  } | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/topology`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  /**
   * Generates a complete, standalone Python Mininet script from the web canvas graph.
   * Can be executed with zero external dependencies on Ubuntu/Debian/WSL:
   * `sudo python3 custom_mininet_topo.py`
   */
  public generatePythonScript(
    nodes: NetworkNode[],
    edges: NetworkEdge[],
    protocol: 'LSR' | 'DVR' = 'LSR'
  ): string {
    const nodeLines: string[] = [];
    const linkLines: string[] = [];
    const nodeVarMap: Record<string, string> = {};

    nodes.forEach((n, idx) => {
      const rawId = String(n.id).toLowerCase().replace(/[^a-z0-9_]/g, '_');
      const varName = /^[a-z_][a-z0-9_]*$/.test(rawId) ? rawId : `r${idx + 1}`;
      nodeVarMap[n.id] = varName;
      const label = n.label || varName.toUpperCase();
      nodeLines.push(`    # Router ${label}\n    ${varName} = net.addHost('${varName}', cls=LinuxRouter, ip='10.${idx + 1}.0.1/16')`);
    });

    let subnetCounter = 1;
    edges.forEach((e) => {
      const srcVar = nodeVarMap[e.source];
      const dstVar = nodeVarMap[e.target];
      const cost = e.cost ?? 1;

      if (srcVar && dstVar) {
        const s = subnetCounter++;
        linkLines.push(
          `    # Link ${srcVar} <-> ${dstVar} (Cost: ${cost}, Subnet: 10.0.${s}.0/24)\n` +
          `    link_${srcVar}_${dstVar} = net.addLink(${srcVar}, ${dstVar},\n` +
          `        params1={'ip': '10.0.${s}.1/24'},\n` +
          `        params2={'ip': '10.0.${s}.2/24'}\n` +
          `    )`
        );
      }
    });

    const routerVars = Object.values(nodeVarMap).join(', ');

    return `#!/usr/bin/env python3
"""
custom_mininet_topo.py
======================
Generated by Interactive Link State & Distance Vector Simulator.
Emulates real Linux network namespaces and kernel routing tables.
Target Protocol: ${protocol} (${protocol === 'LSR' ? 'Link State / OSPF / Dijkstra' : 'Distance Vector / RIP / Bellman-Ford'})

Prerequisites on Ubuntu/Debian/WSL:
    sudo apt-get update && sudo apt-get install -y mininet iproute2

Execution:
    sudo python3 custom_mininet_topo.py
"""

from mininet.net import Mininet
from mininet.node import Node
from mininet.cli import CLI
from mininet.log import setLogLevel, info
import sys
import time

class LinuxRouter(Node):
    """A Node with IP forwarding enabled, acting as a real Layer 3 Linux Router."""
    def config(self, **params):
        super(LinuxRouter, self).config(**params)
        # Enable IPv4 forwarding across network namespace interfaces
        self.cmd('sysctl -w net.ipv4.ip_forward=1')

    def terminate(self):
        self.cmd('sysctl -w net.ipv4.ip_forward=0')
        super(LinuxRouter, self).terminate()

def run_topology():
    setLogLevel('info')
    info('*** Initializing Mininet Layer 3 Router Topology\\n')
    net = Mininet(controller=None)

    info('*** Adding Linux Router Nodes\\n')
${nodeLines.join('\n')}

    info('*** Creating Virtual Ethernet Point-to-Point Links\\n')
${linkLines.join('\n')}

    info('*** Starting Network\\n')
    net.start()

    routers = [${routerVars}]

    info('\\n=================================================================\\n')
    info('  MININET ROUTER EMULATION ACTIVE\\n')
    info('  Network Verification & Diagnostic Commands:\\n')
    info('    1. Kernel FIB routes:   mininet> ${Object.values(nodeVarMap)[0] || 'r1'} ip route show\\n')
    info('    2. ICMP Echo (Ping):    mininet> ${Object.values(nodeVarMap)[0] || 'r1'} ping -c 2 10.2.0.1\\n')
    info('    3. Sever link:          mininet> link ${Object.values(nodeVarMap)[0] || 'r1'} ${Object.values(nodeVarMap)[1] || 'r2'} down\\n')
    info('    4. Verify convergence:  mininet> ${Object.values(nodeVarMap)[0] || 'r1'} ip route show\\n')
    info('=================================================================\\n\\n')

    # Drop into Mininet Interactive CLI
    CLI(net)

    info('*** Stopping Network\\n')
    net.stop()

if __name__ == '__main__':
    run_topology()
`;
  }

  /**
   * Triggers a browser download of the generated Python Mininet file.
   */
  public downloadScript(filename: string, content: string): void {
    if (typeof window === 'undefined') return;
    const blob = new Blob([content], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.py') ? filename : `${filename}.py`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Global singleton instance for easy access across components
export const mininetBridge = new MininetBridgeClient();
