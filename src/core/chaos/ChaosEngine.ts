import { NetworkGraph } from '../NetworkGraph';
import { EdgeId, NodeId } from '../types';
import { ChaosEvent, ChaosMonkeyConfig, FlapRecord } from './types';

export class ChaosEngine {
  private graph: NetworkGraph;
  private config: ChaosMonkeyConfig;
  private flappingLinks: Map<EdgeId, FlapRecord> = new Map();
  private eventHistory: ChaosEvent[] = [];
  private eventIdCounter = 0;

  // Track scheduled auto-recoveries: targetId -> recoverAtTick
  private scheduledRecoveries: Map<string, { type: 'ROUTER' | 'LINK'; recoverAtTick: number }> =
    new Map();

  constructor(graph: NetworkGraph, config?: Partial<ChaosMonkeyConfig>) {
    this.graph = graph;
    this.config = {
      enabled: false,
      linkSeverProbability: 0.15,
      routerCrashProbability: 0.08,
      metricJitterProbability: 0.2,
      metricJitterDelta: 3,
      autoRecoveryEnabled: false,
      recoveryTicks: 4,
      ...config,
    };
  }

  public getConfig(): ChaosMonkeyConfig {
    return { ...this.config };
  }

  public setConfig(config: Partial<ChaosMonkeyConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public getEventHistory(): ChaosEvent[] {
    return [...this.eventHistory];
  }

  public clearEventHistory(): void {
    this.eventHistory = [];
  }

  public getFlappingLinks(): FlapRecord[] {
    return Array.from(this.flappingLinks.values());
  }

  private recordEvent(
    tick: number,
    type: ChaosEvent['type'],
    targetId: string,
    targetName: string,
    description: string
  ): ChaosEvent {
    const event: ChaosEvent = {
      id: `chaos-${++this.eventIdCounter}`,
      tick,
      type,
      targetId,
      targetName,
      description,
      timestamp: Date.now(),
    };
    this.eventHistory.unshift(event);
    if (this.eventHistory.length > 50) {
      this.eventHistory.pop();
    }
    return event;
  }

  // --- 1. Link Sever & Restore ---

  public severRandomLink(tick = 0): ChaosEvent | null {
    const upEdges = this.graph.getEdges().filter((e) => e.status === 'UP');
    if (upEdges.length === 0) return null;

    const chosen = upEdges[Math.floor(Math.random() * upEdges.length)];
    this.graph.setEdgeStatus(chosen.id, 'DOWN');

    if (this.config.autoRecoveryEnabled) {
      this.scheduledRecoveries.set(chosen.id, {
        type: 'LINK',
        recoverAtTick: tick + this.config.recoveryTicks,
      });
    }

    return this.recordEvent(
      tick,
      'LINK_SEVER',
      chosen.id,
      chosen.id,
      `Severed link ${chosen.source} \u2194 ${chosen.target}`
    );
  }

  public restoreLink(edgeId: EdgeId, tick = 0): ChaosEvent | null {
    const edge = this.graph.getEdge(edgeId);
    if (!edge || edge.status === 'UP') return null;

    this.graph.setEdgeStatus(edgeId, 'UP');
    this.scheduledRecoveries.delete(edgeId);

    return this.recordEvent(
      tick,
      'LINK_RESTORE',
      edgeId,
      edgeId,
      `Restored link ${edge.source} \u2194 ${edge.target}`
    );
  }

  // --- 2. Router Crash & Recover ---

  public crashRandomRouter(tick = 0): ChaosEvent | null {
    const activeNodes = this.graph.getNodes().filter((n) => n.status === 'ACTIVE');
    if (activeNodes.length === 0) return null;

    const chosen = activeNodes[Math.floor(Math.random() * activeNodes.length)];
    this.graph.setNodeStatus(chosen.id, 'CRASHED');

    if (this.config.autoRecoveryEnabled) {
      this.scheduledRecoveries.set(chosen.id, {
        type: 'ROUTER',
        recoverAtTick: tick + this.config.recoveryTicks,
      });
    }

    return this.recordEvent(
      tick,
      'ROUTER_CRASH',
      chosen.id,
      chosen.label,
      `Crashed router ${chosen.label} (${chosen.id})`
    );
  }

  public recoverRouter(nodeId: NodeId, tick = 0): ChaosEvent | null {
    const node = this.graph.getNode(nodeId);
    if (!node || node.status === 'ACTIVE') return null;

    this.graph.setNodeStatus(nodeId, 'ACTIVE');
    this.scheduledRecoveries.delete(nodeId);

    return this.recordEvent(
      tick,
      'ROUTER_RECOVER',
      nodeId,
      node.label,
      `Recovered router ${node.label} (${nodeId})`
    );
  }

  // --- 3. Metric Jitter / Dynamic Congestion ---

  public applyMetricJitter(
    tick = 0,
    maxDelta?: number,
    minCost = 1,
    maxCost = 25
  ): ChaosEvent[] {
    const delta = maxDelta ?? this.config.metricJitterDelta;
    const upEdges = this.graph.getEdges().filter((e) => e.status === 'UP');
    if (upEdges.length === 0) return [];

    const events: ChaosEvent[] = [];
    // Jitter 1 or 2 random edges
    const sampleSize = Math.max(1, Math.min(3, Math.floor(upEdges.length / 2)));
    const shuffled = [...upEdges].sort(() => Math.random() - 0.5).slice(0, sampleSize);

    for (const edge of shuffled) {
      const change = (Math.random() < 0.5 ? -1 : 1) * (Math.floor(Math.random() * delta) + 1);
      const newCost = Math.max(minCost, Math.min(maxCost, edge.cost + change));

      if (newCost !== edge.cost) {
        const oldCost = edge.cost;
        this.graph.setEdgeCost(edge.id, newCost);

        const ev = this.recordEvent(
          tick,
          'METRIC_JITTER',
          edge.id,
          edge.id,
          `Jittered cost on ${edge.source} \u2194 ${edge.target}: ${oldCost} \u2192 ${newCost}`
        );
        events.push(ev);
      }
    }

    return events;
  }

  // --- 4. Link Flapping Generator ---

  public startLinkFlap(edgeId: EdgeId, interval = 2, tick = 0): ChaosEvent | null {
    const edge = this.graph.getEdge(edgeId);
    if (!edge) return null;

    const sanitizedInterval = Math.max(1, interval);
    this.flappingLinks.set(edgeId, {
      edgeId,
      interval: sanitizedInterval,
      currentPhase: 'UP',
      lastFlipTick: tick,
    });

    this.graph.setEdgeStatus(edgeId, 'FLAPPING', sanitizedInterval);

    return this.recordEvent(
      tick,
      'LINK_FLAP_START',
      edgeId,
      edgeId,
      `Started link flap on ${edge.source} \u2194 ${edge.target} (every ${sanitizedInterval} ticks)`
    );
  }

  public stopLinkFlap(
    edgeId: EdgeId,
    finalStatus: 'UP' | 'DOWN' = 'UP',
    tick = 0
  ): ChaosEvent | null {
    if (!this.flappingLinks.has(edgeId)) return null;

    this.flappingLinks.delete(edgeId);
    this.graph.setEdgeStatus(edgeId, finalStatus);

    return this.recordEvent(
      tick,
      'LINK_FLAP_STOP',
      edgeId,
      edgeId,
      `Stopped flapping on ${edgeId}. Restored to ${finalStatus}`
    );
  }

  public toggleLinkFlap(edgeId: EdgeId, interval = 2, tick = 0): boolean {
    if (this.flappingLinks.has(edgeId)) {
      this.stopLinkFlap(edgeId, 'UP', tick);
      return false;
    } else {
      this.startLinkFlap(edgeId, interval, tick);
      return true;
    }
  }

  public isEdgeFlapping(edgeId: EdgeId): boolean {
    return this.flappingLinks.has(edgeId);
  }

  // --- Step Tick Cycle ---

  public stepTick(currentTick: number): ChaosEvent[] {
    const events: ChaosEvent[] = [];

    // 1. Process active flapping links
    for (const flap of this.flappingLinks.values()) {
      if ((currentTick - flap.lastFlipTick) >= flap.interval) {
        flap.currentPhase = flap.currentPhase === 'UP' ? 'DOWN' : 'UP';
        flap.lastFlipTick = currentTick;

        // Effective status on graph is handled via isEdgeEffectivelyUp in NetworkGraph
      }
    }

    // 2. Process scheduled auto-recoveries
    if (this.config.autoRecoveryEnabled) {
      for (const [targetId, recovery] of Array.from(this.scheduledRecoveries.entries())) {
        if (currentTick >= recovery.recoverAtTick) {
          if (recovery.type === 'ROUTER') {
            const ev = this.recoverRouter(targetId, currentTick);
            if (ev) events.push(ev);
          } else if (recovery.type === 'LINK') {
            const ev = this.restoreLink(targetId, currentTick);
            if (ev) events.push(ev);
          }
        }
      }
    }

    // 3. Process automated chaos monkey if enabled
    if (this.config.enabled) {
      if (Math.random() < this.config.linkSeverProbability) {
        const ev = this.severRandomLink(currentTick);
        if (ev) events.push(ev);
      }

      if (Math.random() < this.config.routerCrashProbability) {
        const ev = this.crashRandomRouter(currentTick);
        if (ev) events.push(ev);
      }

      if (Math.random() < this.config.metricJitterProbability) {
        const jitterEvs = this.applyMetricJitter(currentTick);
        events.push(...jitterEvs);
      }
    }

    return events;
  }

  public reset(): void {
    for (const edgeId of this.flappingLinks.keys()) {
      this.graph.setEdgeStatus(edgeId, 'UP');
    }
    this.flappingLinks.clear();
    this.scheduledRecoveries.clear();
    this.eventHistory = [];
    this.eventIdCounter = 0;
  }
}
