import React, { useState, useEffect } from 'react';
import { SimulationClock } from '../../core/SimulationClock';
import { LinkStateEngine } from '../../core/lsr/LinkStateEngine';
import { DistanceVectorEngine } from '../../core/dvr/DistanceVectorEngine';
import { ProtocolMode } from '../inspector/RouterInspector';
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Zap,
  Activity,
  Send,
  Gauge,
} from 'lucide-react';

interface SimulationBarProps {
  clock: SimulationClock;
  lsrEngine: LinkStateEngine;
  dvrEngine: DistanceVectorEngine;
  mode: ProtocolMode;
  onModeChange: (mode: ProtocolMode) => void;
  onStep: () => void;
  onReset: () => void;
  currentTick: number;
}

export const SimulationBar: React.FC<SimulationBarProps> = ({
  clock,
  lsrEngine,
  dvrEngine,
  mode,
  onModeChange,
  onStep,
  onReset,
  currentTick,
}) => {
  const [isRunning, setIsRunning] = useState(clock.getIsRunning());
  const [speed, setSpeed] = useState(clock.getSpeed());

  useEffect(() => {
    return clock.onRunningStateChange((running) => {
      setIsRunning(running);
    });
  }, [clock]);

  const handleTogglePlay = () => {
    clock.toggle();
    setIsRunning(clock.getIsRunning());
  };

  const handleSpeedChange = (newSpeed: number) => {
    clock.setSpeed(newSpeed);
    setSpeed(newSpeed);
  };

  const lsrMetrics = lsrEngine.getMetrics();
  const dvrMetrics = dvrEngine.getMetrics();
  const isConverged = mode === 'LSR' ? lsrMetrics.isConverged : dvrMetrics.isStable;

  return (
    <div
      className="glass-panel"
      style={{
        position: 'absolute',
        top: 16,
        left: 20,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '8px 14px',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      {/* Protocol Mode Toggle */}
      <div
        style={{
          display: 'flex',
          background: 'rgba(0, 0, 0, 0.4)',
          padding: '2px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <button
          className={`btn ${mode === 'LSR' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => onModeChange('LSR')}
          style={{ padding: '6px 10px', fontSize: '11px' }}
        >
          <Zap size={13} /> Link State
        </button>
        <button
          className={`btn ${mode === 'DVR' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => onModeChange('DVR')}
          style={{ padding: '6px 10px', fontSize: '11px' }}
        >
          <Activity size={13} /> Distance Vector
        </button>
      </div>

      <div style={{ width: 1, height: 22, background: 'var(--border-subtle)' }} />

      {/* Clock Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button
          className={`btn ${isRunning ? 'btn-accent' : 'btn-primary'} btn-icon`}
          onClick={handleTogglePlay}
          title={isRunning ? 'Pause Simulation' : 'Run Simulation'}
        >
          {isRunning ? <Pause size={15} /> : <Play size={15} />}
        </button>

        <button
          className="btn btn-secondary btn-icon"
          onClick={onStep}
          title="Step Forward (+1 Discrete Tick)"
        >
          <SkipForward size={15} />
        </button>

        <button
          className="btn btn-secondary btn-icon"
          onClick={onReset}
          title="Reset Simulation Clock"
        >
          <RotateCcw size={15} />
        </button>
      </div>

      <div style={{ width: 1, height: 22, background: 'var(--border-subtle)' }} />

      {/* Speed Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <Gauge size={13} color="var(--text-muted)" />
        {[0.5, 1.0, 2.0].map((s) => (
          <button
            key={s}
            className={`btn ${speed === s ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '3px 7px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}
            onClick={() => handleSpeedChange(s)}
          >
            {s}x
          </button>
        ))}
      </div>

      <div style={{ width: 1, height: 22, background: 'var(--border-subtle)' }} />

      {/* Clock Tick & Status Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Discrete Clock
          </span>
          <span
            style={{
              fontSize: '13px',
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              color: 'var(--accent-cyan)',
            }}
          >
            Tick #{currentTick}
          </span>
        </div>

        <span
          className={`badge ${isConverged ? 'badge-active' : 'badge-flapping'}`}
          style={{ fontSize: '10px' }}
        >
          {isConverged ? '\u2713 Stable' : '\u27F3 Converging'}
        </span>
      </div>

      {/* Protocol Trigger */}
      <button
        className="btn btn-secondary"
        style={{ fontSize: '11px', padding: '6px 10px' }}
        onClick={() => {
          if (mode === 'LSR') {
            lsrEngine.originateAll(currentTick);
          } else {
            dvrEngine.advertiseAll(currentTick);
          }
          onStep();
        }}
        title={mode === 'LSR' ? 'Flood Link State Packets' : 'Send Distance Vector Updates'}
      >
        <Send size={12} /> {mode === 'LSR' ? 'Trigger LSA Flood' : 'Send DV Updates'}
      </button>
    </div>
  );
};
