import { LinkStateEngine } from '../lsr/LinkStateEngine';
import { DistanceVectorEngine } from '../dvr/DistanceVectorEngine';
import { NetworkGraph } from '../NetworkGraph';
import {
  ComparativeMetricsSummary,
  DisruptionRecoveryRecord,
  ScoreboardTickData,
} from './types';

export class MetricsCollector {
  private graph: NetworkGraph;
  private lsrEngine: LinkStateEngine;
  private dvrEngine: DistanceVectorEngine;

  private history: ScoreboardTickData[] = [];
  private recoveryRecords: DisruptionRecoveryRecord[] = [];
  private activeRecovery: DisruptionRecoveryRecord | null = null;

  private totalLoopTicks = 0;
  private lastLsrMsgCount = 0;
  private lastDvrMsgCount = 0;

  constructor(
    graph: NetworkGraph,
    lsrEngine: LinkStateEngine,
    dvrEngine: DistanceVectorEngine
  ) {
    this.graph = graph;
    this.lsrEngine = lsrEngine;
    this.dvrEngine = dvrEngine;
  }

  /**
   * Estimates total memory footprint of synchronized LSDBs across all routers (in bytes).
   * OSPF overhead model: Base LSDB entry (32B) + (24B per neighbor adjacency).
   */
  public calculateLSRMemoryBytes(): number {
    let totalBytes = 0;
    const allLSDBs = this.lsrEngine.getAllLSDBs();

    for (const [, nodeLSDB] of allLSDBs.entries()) {
      for (const [, entry] of nodeLSDB.entries()) {
        // Base LSDB entry: originator (16B) + seqNum (8B) + age (4B) + overhead (4B)
        totalBytes += 32;
        // Adjacency descriptors: neighborId (16B) + cost (8B)
        totalBytes += entry.neighbors.length * 24;
      }
    }
    return totalBytes;
  }

  /**
   * Estimates total memory footprint of Distance Vector tables and neighbor matrices (in bytes).
   * RIP overhead model: Routing table (32B per dest) + Neighbor vector matrix (24B per neighbor-dest pair).
   */
  public calculateDVRMemoryBytes(): number {
    let totalBytes = 0;
    const nodes = this.graph.getNodes();

    for (const node of nodes) {
      const table = this.dvrEngine.getRoutingTable(node.id);
      if (table) {
        totalBytes += Object.keys(table).length * 32;
      }

      const neighborTable = this.dvrEngine.getNeighborVectors(node.id);
      if (neighborTable) {
        for (const [, destMap] of neighborTable.entries()) {
          totalBytes += destMap.size * 24;
        }
      }
    }
    return totalBytes;
  }

  /**
   * Registers a topology mutation/failure event (e.g. link severed, node crashed).
   * Initiates a new recovery race tracking record.
   */
  public registerDisruption(tick: number, description: string): void {
    if (this.activeRecovery) {
      // Finalize existing incomplete recovery if new disruption happens
      if (!this.activeRecovery.winner || this.activeRecovery.winner === 'PENDING') {
        this.activeRecovery.winner = 'TIE';
      }
      this.recoveryRecords.unshift(this.activeRecovery);
    }

    const initialLsrMsg = this.lsrEngine.getMetrics().totalLSPsTransmitted;
    const initialDvrMsg = this.dvrEngine.getMetrics().totalVectorsTransmitted;

    this.activeRecovery = {
      id: `disruption-${tick}-${Date.now().toString(36)}`,
      disruptionTick: tick,
      description,
      lsrConvergedTick: null,
      dvrConvergedTick: null,
      lsrDurationTicks: null,
      dvrDurationTicks: null,
      lsrMessagesDuringRecovery: 0,
      dvrMessagesDuringRecovery: 0,
      winner: 'PENDING',
    };

    this.lastLsrMsgCount = initialLsrMsg;
    this.lastDvrMsgCount = initialDvrMsg;
  }

  /**
   * Samples simulation state at currentTick and computes comparative metrics.
   */
  public sampleTick(tick: number, eventDesc?: string): ScoreboardTickData {
    const lsrMetrics = this.lsrEngine.getMetrics();
    const dvrMetrics = this.dvrEngine.getMetrics();

    const lsrMsgTotal = lsrMetrics.totalLSPsTransmitted;
    const dvrMsgTotal = dvrMetrics.totalVectorsTransmitted;

    const lsrMsgDelta = Math.max(0, lsrMsgTotal - this.lastLsrMsgCount);
    const dvrMsgDelta = Math.max(0, dvrMsgTotal - this.lastDvrMsgCount);

    this.lastLsrMsgCount = lsrMsgTotal;
    this.lastDvrMsgCount = dvrMsgTotal;

    const lsrMemory = this.calculateLSRMemoryBytes();
    const dvrMemory = this.calculateDVRMemoryBytes();
    const activeLoops = dvrMetrics.activeLoops.length;

    // Track loop duration ticks
    if (activeLoops > 0) {
      this.totalLoopTicks++;
    }

    // If an explicit event description was provided, register disruption
    if (eventDesc && (!this.activeRecovery || this.activeRecovery.disruptionTick !== tick)) {
      this.registerDisruption(tick, eventDesc);
    }

    // Update active recovery record
    if (this.activeRecovery) {
      this.activeRecovery.lsrMessagesDuringRecovery += lsrMsgDelta;
      this.activeRecovery.dvrMessagesDuringRecovery += dvrMsgDelta;

      if (lsrMetrics.isConverged && this.activeRecovery.lsrConvergedTick === null) {
        this.activeRecovery.lsrConvergedTick = tick;
        this.activeRecovery.lsrDurationTicks = Math.max(
          0,
          tick - this.activeRecovery.disruptionTick
        );
      }

      if (dvrMetrics.isStable && this.activeRecovery.dvrConvergedTick === null) {
        this.activeRecovery.dvrConvergedTick = tick;
        this.activeRecovery.dvrDurationTicks = Math.max(
          0,
          tick - this.activeRecovery.disruptionTick
        );
      }

      // Check if both have converged to decide winner
      if (
        this.activeRecovery.lsrConvergedTick !== null &&
        this.activeRecovery.dvrConvergedTick !== null
      ) {
        const lsrDur = this.activeRecovery.lsrDurationTicks ?? 0;
        const dvrDur = this.activeRecovery.dvrDurationTicks ?? 0;

        if (lsrDur < dvrDur) {
          this.activeRecovery.winner = 'LSR';
        } else if (dvrDur < lsrDur) {
          this.activeRecovery.winner = 'DVR';
        } else {
          this.activeRecovery.winner = 'TIE';
        }

        this.recoveryRecords.unshift({ ...this.activeRecovery });
        this.activeRecovery = null;
      }
    }

    const point: ScoreboardTickData = {
      tick,
      timestamp: Date.now(),
      lsrConverged: lsrMetrics.isConverged,
      dvrConverged: dvrMetrics.isStable,
      lsrMessagesCumulative: lsrMsgTotal,
      dvrMessagesCumulative: dvrMsgTotal,
      lsrMessagesDelta: lsrMsgDelta,
      dvrMessagesDelta: dvrMsgDelta,
      lsrMemoryBytes: lsrMemory,
      dvrMemoryBytes: dvrMemory,
      dvrActiveLoopsCount: activeLoops,
      hasActiveDisruption: !!eventDesc || this.activeRecovery !== null,
      eventDescription: eventDesc,
    };

    this.history.push(point);
    if (this.history.length > 300) {
      this.history.shift();
    }

    return point;
  }

  public getHistory(): ScoreboardTickData[] {
    return [...this.history];
  }

  public getSummary(): ComparativeMetricsSummary {
    const latestSample = this.history[this.history.length - 1];
    const lsrMetrics = this.lsrEngine.getMetrics();
    const dvrMetrics = this.dvrEngine.getMetrics();

    return {
      currentTick: latestSample?.tick ?? 0,
      lsrConverged: lsrMetrics.isConverged,
      dvrConverged: dvrMetrics.isStable,
      lsrTotalMessages: lsrMetrics.totalLSPsTransmitted,
      dvrTotalMessages: dvrMetrics.totalVectorsTransmitted,
      lsrMemoryBytes: this.calculateLSRMemoryBytes(),
      dvrMemoryBytes: this.calculateDVRMemoryBytes(),
      totalLoopTicks: this.totalLoopTicks,
      currentActiveLoops: dvrMetrics.activeLoops.length,
      recoveryRecords: [...this.recoveryRecords],
      latestRecovery: this.activeRecovery
        ? { ...this.activeRecovery }
        : this.recoveryRecords[0],
    };
  }

  public reset(): void {
    this.history = [];
    this.recoveryRecords = [];
    this.activeRecovery = null;
    this.totalLoopTicks = 0;
    this.lastLsrMsgCount = 0;
    this.lastDvrMsgCount = 0;
  }
}
