import { StateSnapshot } from './types';

export class StateLedger {
  private snapshots: Map<number, StateSnapshot> = new Map();
  private maxTickRecorded = 0;

  constructor(initialSnapshots?: StateSnapshot[]) {
    if (initialSnapshots) {
      for (const s of initialSnapshots) {
        this.recordSnapshot(s);
      }
    }
  }

  /**
   * Helper to deeply clone an object ensuring complete immutability of the snapshot ledger.
   */
  public static deepClone<T>(obj: T): T {
    if (typeof structuredClone === 'function') {
      try {
        return structuredClone(obj);
      } catch {
        // Fallback for non-cloneable objects
      }
    }
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Records a snapshot for the specified tick. Deeply clones to protect snapshot immutability.
   */
  public recordSnapshot(snapshot: StateSnapshot): void {
    const cloned = StateLedger.deepClone(snapshot);
    this.snapshots.set(cloned.tick, cloned);
    if (cloned.tick > this.maxTickRecorded) {
      this.maxTickRecorded = cloned.tick;
    }
  }

  /**
   * Retrieves an immutable copy of the state snapshot at tick t.
   */
  public getSnapshot(tick: number): StateSnapshot | undefined {
    const found = this.snapshots.get(tick);
    return found ? StateLedger.deepClone(found) : undefined;
  }

  /**
   * Returns all recorded snapshots in ascending order of tick.
   */
  public getHistory(): StateSnapshot[] {
    const list = Array.from(this.snapshots.values());
    list.sort((a, b) => a.tick - b.tick);
    return StateLedger.deepClone(list);
  }

  public getLatestSnapshot(): StateSnapshot | undefined {
    if (this.snapshots.size === 0) return undefined;
    return this.getSnapshot(this.maxTickRecorded);
  }

  public getMaxTick(): number {
    return this.maxTickRecorded;
  }

  public getSnapshotCount(): number {
    return this.snapshots.size;
  }

  /**
   * Clears all recorded states beyond the given tick (used when time-traveling and branching).
   */
  public truncateFromTick(tick: number): void {
    const ticksToDelete: number[] = [];
    for (const t of this.snapshots.keys()) {
      if (t > tick) {
        ticksToDelete.push(t);
      }
    }
    for (const t of ticksToDelete) {
      this.snapshots.delete(t);
    }
    this.maxTickRecorded = Math.max(0, ...Array.from(this.snapshots.keys()));
  }

  public reset(): void {
    this.snapshots.clear();
    this.maxTickRecorded = 0;
  }

  public exportJson(): string {
    return JSON.stringify(this.getHistory(), null, 2);
  }

  public importJson(jsonStr: string): void {
    const parsed = JSON.parse(jsonStr) as StateSnapshot[];
    if (!Array.isArray(parsed)) {
      throw new Error('Invalid JSON format: expected an array of snapshots');
    }
    this.reset();
    for (const snap of parsed) {
      this.recordSnapshot(snap);
    }
  }
}
