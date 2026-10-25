export type ClockTickListener = (tick: number) => void;

export class SimulationClock {
  private currentTick = 0;
  private isRunning = false;
  private intervalMs = 1000; // Base: 1 second per tick
  private speedMultiplier = 1.0;
  private timerId: ReturnType<typeof setInterval> | null = null;
  private tickListeners: ClockTickListener[] = [];
  private stateListeners: Array<(running: boolean) => void> = [];

  constructor(initialTick = 0, intervalMs = 1000) {
    this.currentTick = initialTick;
    this.intervalMs = intervalMs;
  }

  // --- Listeners ---
  public onTick(listener: ClockTickListener): () => void {
    this.tickListeners.push(listener);
    return () => {
      this.tickListeners = this.tickListeners.filter((l) => l !== listener);
    };
  }

  public onRunningStateChange(listener: (running: boolean) => void): () => void {
    this.stateListeners.push(listener);
    return () => {
      this.stateListeners = this.stateListeners.filter((l) => l !== listener);
    };
  }

  private notifyRunningState(running: boolean): void {
    for (const listener of this.stateListeners) {
      listener(running);
    }
  }

  // --- Clock Controls ---
  public getTick(): number {
    return this.currentTick;
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }

  public getSpeed(): number {
    return this.speedMultiplier;
  }

  private resetTimer(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    const delay = Math.max(50, Math.floor(this.intervalMs / this.speedMultiplier));
    this.timerId = setInterval(() => {
      this.step();
    }, delay);
  }

  public setSpeed(multiplier: number): void {
    this.speedMultiplier = Math.max(0.1, Math.min(10, multiplier));
    if (this.isRunning) {
      this.resetTimer();
    }
  }

  public setTick(tick: number): void {
    this.currentTick = Math.max(0, tick);
    for (const listener of this.tickListeners) {
      listener(this.currentTick);
    }
  }

  /**
   * Advances simulation by exactly 1 tick deterministically.
   * Returns the new tick number.
   */
  public step(): number {
    this.currentTick += 1;
    for (const listener of this.tickListeners) {
      listener(this.currentTick);
    }
    return this.currentTick;
  }

  /**
   * Starts automatic tick progression.
   */
  public start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.notifyRunningState(true);

    const delay = Math.max(50, Math.floor(this.intervalMs / this.speedMultiplier));
    this.timerId = setInterval(() => {
      this.step();
    }, delay);
  }

  /**
   * Pauses the clock.
   */
  public pause(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.notifyRunningState(false);
  }

  public toggle(): boolean {
    if (this.isRunning) {
      this.pause();
    } else {
      this.start();
    }
    return this.isRunning;
  }

  /**
   * Resets the clock to tick 0 and stops running.
   */
  public reset(): void {
    this.pause();
    this.currentTick = 0;
    for (const listener of this.tickListeners) {
      listener(0);
    }
  }
}
