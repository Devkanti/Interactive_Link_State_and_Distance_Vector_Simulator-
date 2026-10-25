import { GraphSnapshot, NetworkEdge, NetworkNode } from '../types';
import { PresetTopology } from './types';

/**
 * Preset 1: Linear 3-Node Topology (A - B - C)
 * Ideal for demonstrating Count-to-Infinity and Poison Reverse.
 */
export function createLinear3Node(): GraphSnapshot {
  const nodes: NetworkNode[] = [
    { id: 'A', label: 'Router A', x: 220, y: 260, status: 'ACTIVE' },
    { id: 'B', label: 'Router B', x: 470, y: 260, status: 'ACTIVE' },
    { id: 'C', label: 'Router C', x: 720, y: 260, status: 'ACTIVE' },
  ];

  const edges: NetworkEdge[] = [
    { id: 'A<->B', source: 'A', target: 'B', cost: 1, status: 'UP', directed: false },
    { id: 'B<->C', source: 'B', target: 'C', cost: 1, status: 'UP', directed: false },
  ];

  return { nodes, edges };
}

/**
 * Preset 2: Diamond / Multi-Path Topology
 * Demonstrates alternate path failover and asymmetric routing metrics.
 */
export function createDiamondMultiPath(): GraphSnapshot {
  const nodes: NetworkNode[] = [
    { id: 'A', label: 'Router A', x: 220, y: 260, status: 'ACTIVE' },
    { id: 'B', label: 'Router B', x: 470, y: 140, status: 'ACTIVE' },
    { id: 'C', label: 'Router C', x: 470, y: 380, status: 'ACTIVE' },
    { id: 'D', label: 'Router D', x: 720, y: 260, status: 'ACTIVE' },
  ];

  const edges: NetworkEdge[] = [
    { id: 'A<->B', source: 'A', target: 'B', cost: 1, status: 'UP', directed: false },
    { id: 'A<->C', source: 'A', target: 'C', cost: 4, status: 'UP', directed: false },
    { id: 'B<->D', source: 'B', target: 'D', cost: 5, status: 'UP', directed: false },
    { id: 'C<->D', source: 'C', target: 'D', cost: 1, status: 'UP', directed: false },
  ];

  return { nodes, edges };
}

/**
 * Preset 3: ARPANET 1972 Core Subnet
 * Historical 9-node core backbone representing early computer networking.
 */
export function createArpanet1972(): GraphSnapshot {
  const nodes: NetworkNode[] = [
    { id: 'STAN', label: 'STAN', x: 180, y: 160, status: 'ACTIVE' },
    { id: 'SRI', label: 'SRI', x: 180, y: 280, status: 'ACTIVE' },
    { id: 'UCLA', label: 'UCLA', x: 240, y: 400, status: 'ACTIVE' },
    { id: 'UCSB', label: 'UCSB', x: 120, y: 360, status: 'ACTIVE' },
    { id: 'UTAH', label: 'UTAH', x: 380, y: 220, status: 'ACTIVE' },
    { id: 'ILL', label: 'ILL', x: 550, y: 240, status: 'ACTIVE' },
    { id: 'MIT', label: 'MIT', x: 740, y: 160, status: 'ACTIVE' },
    { id: 'BBN', label: 'BBN', x: 760, y: 280, status: 'ACTIVE' },
    { id: 'HARV', label: 'HARV', x: 680, y: 380, status: 'ACTIVE' },
  ];

  const edges: NetworkEdge[] = [
    { id: 'STAN<->SRI', source: 'STAN', target: 'SRI', cost: 2, status: 'UP', directed: false },
    { id: 'SRI<->UCSB', source: 'SRI', target: 'UCSB', cost: 3, status: 'UP', directed: false },
    { id: 'UCSB<->UCLA', source: 'UCSB', target: 'UCLA', cost: 2, status: 'UP', directed: false },
    { id: 'SRI<->UTAH', source: 'SRI', target: 'UTAH', cost: 6, status: 'UP', directed: false },
    { id: 'UCLA<->STAN', source: 'UCLA', target: 'STAN', cost: 4, status: 'UP', directed: false },
    { id: 'UTAH<->ILL', source: 'UTAH', target: 'ILL', cost: 8, status: 'UP', directed: false },
    { id: 'ILL<->MIT', source: 'ILL', target: 'MIT', cost: 5, status: 'UP', directed: false },
    { id: 'MIT<->BBN', source: 'MIT', target: 'BBN', cost: 2, status: 'UP', directed: false },
    { id: 'BBN<->HARV', source: 'BBN', target: 'HARV', cost: 2, status: 'UP', directed: false },
    { id: 'HARV<->ILL', source: 'HARV', target: 'ILL', cost: 6, status: 'UP', directed: false },
  ];

  return { nodes, edges };
}

/**
 * Preset 4: Ring & Dual-Ring Topology
 * Evaluates convergence speed, route oscillation, and link flapping resilience across redundant paths.
 */
export function createDualRingTopology(): GraphSnapshot {
  const nodes: NetworkNode[] = [
    // Outer Ring
    { id: 'R1', label: 'R1', x: 450, y: 100, status: 'ACTIVE' },
    { id: 'R2', label: 'R2', x: 670, y: 180, status: 'ACTIVE' },
    { id: 'R3', label: 'R3', x: 670, y: 360, status: 'ACTIVE' },
    { id: 'R4', label: 'R4', x: 450, y: 440, status: 'ACTIVE' },
    { id: 'R5', label: 'R5', x: 230, y: 360, status: 'ACTIVE' },
    { id: 'R6', label: 'R6', x: 230, y: 180, status: 'ACTIVE' },
    // Inner Core Links
    { id: 'Core1', label: 'C1', x: 380, y: 270, status: 'ACTIVE' },
    { id: 'Core2', label: 'C2', x: 520, y: 270, status: 'ACTIVE' },
  ];

  const edges: NetworkEdge[] = [
    // Outer Ring Edges
    { id: 'R1<->R2', source: 'R1', target: 'R2', cost: 2, status: 'UP', directed: false },
    { id: 'R2<->R3', source: 'R2', target: 'R3', cost: 2, status: 'UP', directed: false },
    { id: 'R3<->R4', source: 'R3', target: 'R4', cost: 2, status: 'UP', directed: false },
    { id: 'R4<->R5', source: 'R4', target: 'R5', cost: 2, status: 'UP', directed: false },
    { id: 'R5<->R6', source: 'R5', target: 'R6', cost: 2, status: 'UP', directed: false },
    { id: 'R6<->R1', source: 'R6', target: 'R1', cost: 2, status: 'UP', directed: false },
    // Cross / Core Links
    { id: 'Core1<->Core2', source: 'Core1', target: 'Core2', cost: 1, status: 'UP', directed: false },
    { id: 'Core1<->R6', source: 'Core1', target: 'R6', cost: 3, status: 'UP', directed: false },
    { id: 'Core1<->R5', source: 'Core1', target: 'R5', cost: 3, status: 'UP', directed: false },
    { id: 'Core2<->R2', source: 'Core2', target: 'R2', cost: 3, status: 'UP', directed: false },
    { id: 'Core2<->R3', source: 'Core2', target: 'R3', cost: 3, status: 'UP', directed: false },
  ];

  return { nodes, edges };
}

/**
 * Preset 5: Random Mesh Generator
 * Generates N nodes with guaranteed connectivity and link probability P.
 */
export function generateRandomMesh(
  nodeCount = 6,
  linkProbability = 0.4,
  minCost = 1,
  maxCost = 10
): GraphSnapshot {
  const count = Math.max(3, Math.min(16, nodeCount));
  const prob = Math.max(0.05, Math.min(1.0, linkProbability));

  const centerX = 470;
  const centerY = 270;
  const radius = Math.min(200, 40 + count * 18);

  const nodes: NetworkNode[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    const x = Math.round(centerX + radius * Math.cos(angle));
    const y = Math.round(centerY + radius * Math.sin(angle));
    const id = `R${i + 1}`;
    nodes.push({ id, label: id, x, y, status: 'ACTIVE' });
  }

  const edges: NetworkEdge[] = [];
  const addedEdgeKeys = new Set<string>();

  const addEdgeIfNotExists = (u: string, v: string) => {
    if (u === v) return;
    const key = [u, v].sort().join('<->');
    if (addedEdgeKeys.has(key)) return;

    addedEdgeKeys.add(key);
    const cost = Math.floor(Math.random() * (maxCost - minCost + 1)) + minCost;
    edges.push({
      id: key,
      source: u,
      target: v,
      cost,
      status: 'UP',
      directed: false,
    });
  };

  // Guarantee Connectivity: Spanning Tree across all nodes
  const connected = [nodes[0].id];
  const remaining = nodes.slice(1).map((n) => n.id);

  while (remaining.length > 0) {
    const targetIdx = Math.floor(Math.random() * remaining.length);
    const targetNode = remaining[targetIdx];
    remaining.splice(targetIdx, 1);

    const sourceNode = connected[Math.floor(Math.random() * connected.length)];
    addEdgeIfNotExists(sourceNode, targetNode);
    connected.push(targetNode);
  }

  // Add additional edges according to linkProbability P
  for (let i = 0; i < count; i++) {
    for (let j = i + 1; j < count; j++) {
      const u = nodes[i].id;
      const v = nodes[j].id;
      const key = [u, v].sort().join('<->');
      if (!addedEdgeKeys.has(key) && Math.random() < prob) {
        addEdgeIfNotExists(u, v);
      }
    }
  }

  return { nodes, edges };
}

/**
 * Standard Presets Catalog
 */
export const BENCHMARK_PRESETS: PresetTopology[] = [
  {
    id: 'linear-3',
    name: 'Linear 3-Node (A - B - C)',
    category: 'academic',
    description: 'Textbook 3-node linear network. Tuned for Count-to-Infinity, Split Horizon, and Poison Reverse demonstrations.',
    badge: 'Core Academic',
    tags: ['Count-to-Infinity', 'RIP', 'Split Horizon'],
    recommendedAlgorithm: 'DVR',
    generateSnapshot: createLinear3Node,
  },
  {
    id: 'diamond',
    name: 'Diamond Multi-Path',
    category: 'benchmark',
    description: 'Diamond network with asymmetric costs. Demonstrates optimal shortest-path selection and link failover.',
    badge: 'Multi-Path',
    tags: ['Failover', 'Dijkstra', 'Load Balancing'],
    recommendedAlgorithm: 'BOTH',
    generateSnapshot: createDiamondMultiPath,
  },
  {
    id: 'arpanet-1972',
    name: 'ARPANET 1972 Core',
    category: 'historical',
    description: 'Historical 9-node core backbone representing the early Stanford, UCLA, MIT, and BBN ARPANET topology.',
    badge: 'Historical',
    tags: ['ARPANET', 'Real-World', 'Backbone'],
    recommendedAlgorithm: 'LSR',
    generateSnapshot: createArpanet1972,
  },
  {
    id: 'dual-ring',
    name: 'Dual-Ring & Cross Links',
    category: 'benchmark',
    description: 'Redundant 8-node dual-ring network with core bridging. Stresses convergence speed and link flapping stability.',
    badge: 'High Redundancy',
    tags: ['Flapping', 'Loops', 'Convergence Speed'],
    recommendedAlgorithm: 'BOTH',
    generateSnapshot: createDualRingTopology,
  },
];
