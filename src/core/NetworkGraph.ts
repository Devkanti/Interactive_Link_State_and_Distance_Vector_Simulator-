import {
  EdgeId,
  EdgeStatus,
  GraphSnapshot,
  NetworkEdge,
  NetworkNode,
  NodeId,
  NodeStatus,
} from './types';

export class NetworkGraph {
  private nodes: Map<NodeId, NetworkNode> = new Map();
  private edges: Map<EdgeId, NetworkEdge> = new Map();
  private changeListeners: Array<() => void> = [];

  constructor(snapshot?: GraphSnapshot) {
    if (snapshot) {
      this.importSnapshot(snapshot);
    }
  }

  // --- Change Listeners ---
  public subscribe(listener: () => void): () => void {
    this.changeListeners.push(listener);
    return () => {
      this.changeListeners = this.changeListeners.filter((l) => l !== listener);
    };
  }

  private notifyChange(): void {
    for (const listener of this.changeListeners) {
      listener();
    }
  }

  // --- Node Management ---
  public addNode(id: NodeId, label?: string, x = 0, y = 0): NetworkNode {
    const trimmedId = id.trim();
    if (!trimmedId) {
      throw new Error('Node ID cannot be empty');
    }
    if (this.nodes.has(trimmedId)) {
      throw new Error(`Node with ID "${trimmedId}" already exists`);
    }

    const node: NetworkNode = {
      id: trimmedId,
      label: label?.trim() || trimmedId,
      x,
      y,
      status: 'ACTIVE',
    };

    this.nodes.set(trimmedId, node);
    this.notifyChange();
    return { ...node };
  }

  public removeNode(id: NodeId): boolean {
    if (!this.nodes.has(id)) {
      return false;
    }

    // Remove all associated edges
    const edgesToRemove: EdgeId[] = [];
    for (const [edgeId, edge] of this.edges.entries()) {
      if (edge.source === id || edge.target === id) {
        edgesToRemove.push(edgeId);
      }
    }

    for (const edgeId of edgesToRemove) {
      this.edges.delete(edgeId);
    }

    this.nodes.delete(id);
    this.notifyChange();
    return true;
  }

  public getNode(id: NodeId): NetworkNode | undefined {
    const node = this.nodes.get(id);
    return node ? { ...node } : undefined;
  }

  public getNodes(): NetworkNode[] {
    return Array.from(this.nodes.values()).map((n) => ({ ...n }));
  }

  public setNodePosition(id: NodeId, x: number, y: number): boolean {
    const node = this.nodes.get(id);
    if (!node) return false;
    node.x = x;
    node.y = y;
    this.notifyChange();
    return true;
  }

  public setNodeStatus(id: NodeId, status: NodeStatus): boolean {
    const node = this.nodes.get(id);
    if (!node) return false;
    if (node.status !== status) {
      node.status = status;
      this.notifyChange();
    }
    return true;
  }

  // --- Edge Management ---
  public static generateEdgeId(source: NodeId, target: NodeId, directed = false): EdgeId {
    if (directed) {
      return `${source}->${target}`;
    }
    const [u, v] = [source, target].sort();
    return `${u}<->${v}`;
  }

  public addEdge(
    source: NodeId,
    target: NodeId,
    cost: number,
    directed = false,
    customId?: EdgeId
  ): NetworkEdge {
    if (!this.nodes.has(source)) {
      throw new Error(`Source node "${source}" does not exist`);
    }
    if (!this.nodes.has(target)) {
      throw new Error(`Target node "${target}" does not exist`);
    }
    if (source === target) {
      throw new Error('Self-loops are not allowed');
    }
    if (cost < 0) {
      throw new Error('Edge cost must be non-negative');
    }

    const id = customId || NetworkGraph.generateEdgeId(source, target, directed);
    if (this.edges.has(id)) {
      throw new Error(`Edge "${id}" already exists`);
    }

    const edge: NetworkEdge = {
      id,
      source,
      target,
      cost,
      status: 'UP',
      directed,
    };

    this.edges.set(id, edge);
    this.notifyChange();
    return { ...edge };
  }

  public removeEdge(id: EdgeId): boolean {
    if (!this.edges.has(id)) return false;
    this.edges.delete(id);
    this.notifyChange();
    return true;
  }

  public removeEdgeBetween(u: NodeId, v: NodeId): boolean {
    const edge = this.getEdgeBetween(u, v);
    if (!edge) return false;
    return this.removeEdge(edge.id);
  }

  public getEdge(id: EdgeId): NetworkEdge | undefined {
    const edge = this.edges.get(id);
    return edge ? { ...edge } : undefined;
  }

  public getEdgeBetween(u: NodeId, v: NodeId): NetworkEdge | undefined {
    for (const edge of this.edges.values()) {
      if (edge.directed) {
        if (edge.source === u && edge.target === v) return { ...edge };
      } else {
        if (
          (edge.source === u && edge.target === v) ||
          (edge.source === v && edge.target === u)
        ) {
          return { ...edge };
        }
      }
    }
    return undefined;
  }

  public getEdges(): NetworkEdge[] {
    return Array.from(this.edges.values()).map((e) => ({ ...e }));
  }

  public setEdgeCost(id: EdgeId, cost: number): boolean {
    if (cost < 0) {
      throw new Error('Edge cost must be non-negative');
    }
    const edge = this.edges.get(id);
    if (!edge) return false;
    if (edge.cost !== cost) {
      edge.cost = cost;
      this.notifyChange();
    }
    return true;
  }

  public setEdgeStatus(id: EdgeId, status: EdgeStatus, flapInterval = 2): boolean {
    const edge = this.edges.get(id);
    if (!edge) return false;
    edge.status = status;
    if (status === 'FLAPPING') {
      edge.flapInterval = Math.max(1, flapInterval);
      edge.flapTickCounter = 0;
    } else {
      edge.flapInterval = undefined;
      edge.flapTickCounter = undefined;
    }
    this.notifyChange();
    return true;
  }

  public toggleEdgeStatus(id: EdgeId): EdgeStatus | undefined {
    const edge = this.edges.get(id);
    if (!edge) return undefined;
    const nextStatus: EdgeStatus = edge.status === 'UP' ? 'DOWN' : 'UP';
    this.setEdgeStatus(id, nextStatus);
    return nextStatus;
  }

  /**
   * Called on simulation tick to handle any flapping edge oscillations
   */
  public handleTickFlapping(): void {
    let hasChanged = false;
    for (const edge of this.edges.values()) {
      if (edge.status === 'FLAPPING' && edge.flapInterval) {
        edge.flapTickCounter = (edge.flapTickCounter ?? 0) + 1;
        if (edge.flapTickCounter >= edge.flapInterval) {
          edge.flapTickCounter = 0;
          hasChanged = true;
        }
      }
    }
    if (hasChanged) {
      this.notifyChange();
    }
  }

  /**
   * Determines if a flapping edge is effectively UP or DOWN at the current flap phase
   */
  public isEdgeEffectivelyUp(edge: NetworkEdge): boolean {
    if (edge.status === 'UP') return true;
    if (edge.status === 'DOWN') return false;
    if (edge.status === 'FLAPPING' && edge.flapInterval) {
      // Toggle every flapInterval: even cycles UP, odd cycles DOWN
      const counter = edge.flapTickCounter ?? 0;
      return counter % 2 === 0;
    }
    return false;
  }

  /**
   * Retrieves adjacent neighbors for a given node.
   * If `activeOnly` is true, only returns neighbors reachable through operational links and active nodes.
   */
  public getNeighbors(
    nodeId: NodeId,
    activeOnly = false
  ): Array<{ neighborId: NodeId; cost: number; edgeId: EdgeId; edge: NetworkEdge }> {
    const node = this.nodes.get(nodeId);
    if (!node) return [];

    if (activeOnly && node.status !== 'ACTIVE') {
      return [];
    }

    const neighbors: Array<{
      neighborId: NodeId;
      cost: number;
      edgeId: EdgeId;
      edge: NetworkEdge;
    }> = [];

    for (const edge of this.edges.values()) {
      if (activeOnly && !this.isEdgeEffectivelyUp(edge)) {
        continue;
      }

      let neighborId: NodeId | null = null;
      if (edge.directed) {
        if (edge.source === nodeId) {
          neighborId = edge.target;
        }
      } else {
        if (edge.source === nodeId) {
          neighborId = edge.target;
        } else if (edge.target === nodeId) {
          neighborId = edge.source;
        }
      }

      if (neighborId) {
        const neighborNode = this.nodes.get(neighborId);
        if (activeOnly && neighborNode?.status !== 'ACTIVE') {
          continue;
        }
        neighbors.push({
          neighborId,
          cost: edge.cost,
          edgeId: edge.id,
          edge: { ...edge },
        });
      }
    }

    return neighbors;
  }

  // --- Snapshot & Serialization ---
  public exportSnapshot(): GraphSnapshot {
    return {
      nodes: this.getNodes(),
      edges: this.getEdges(),
    };
  }

  public importSnapshot(snapshot: GraphSnapshot): void {
    this.nodes.clear();
    this.edges.clear();

    for (const n of snapshot.nodes) {
      this.nodes.set(n.id, { ...n });
    }
    for (const e of snapshot.edges) {
      this.edges.set(e.id, { ...e });
    }

    this.notifyChange();
  }

  public clone(): NetworkGraph {
    return new NetworkGraph(this.exportSnapshot());
  }

  public clear(): void {
    this.nodes.clear();
    this.edges.clear();
    this.notifyChange();
  }
}
