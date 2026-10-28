import React from 'react';
import { SimulationClock } from '../../core/SimulationClock';
import { LinkStateEngine } from '../../core/lsr/LinkStateEngine';
import { DistanceVectorEngine } from '../../core/dvr/DistanceVectorEngine';
import { ProtocolMode } from '../inspector/RouterInspector';
import {
  Zap,
  Activity,
  Send,
  RotateCcw,
} from 'lucide-react';

interface SimulationBarProps {
  clock: SimulationClock;
  lsrEngine: LinkStateEngine;
  dvrEngine: DistanceVectorEngine;
  mode: ProtocolMode;
  onModeChange: (mode: ProtocolMode) => void;
  onStep: () => void;
  onBroadcast?: () => void;
  onReset: () => void;
  currentTick: number;
}

export const SimulationBar: React.FC<SimulationBarProps> = ({
  lsrEngine,
  dvrEngine,
  mode,
  onModeChange,
  onStep,
  onBroadcast,
  currentTick,
}) => {
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
        gap: '8px',
        padding: '4px 8px',
        boxShadow: '0 8px 30px rgba(92, 50, 20, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
        borderRadius: 'var(--radius-full)',
        border: '1px solid var(--border-subtle)',
        background: 'rgba(255, 255, 255, 0.88)',
        backdropFilter: 'blur(16px)',
        height: 42,
      }}
    >
      {/* Segmented Protocol Selector */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(254, 239, 229, 0.75)',
          padding: '3px',
          borderRadius: 'var(--radius-full)',
          border: '1px solid var(--border-subtle)',
          gap: '2px',
        }}
      >
        <button
          className="btn"
          onClick={() => onModeChange('LSR')}
          style={{
            padding: '4px 12px',
            fontSize: '11.5px',
            borderRadius: 'var(--radius-full)',
            height: 28,
            fontWeight: mode === 'LSR' ? 800 : 500,
            background: mode === 'LSR' ? 'linear-gradient(135deg, #3B8BEB, #6EAEFD)' : 'transparent',
            color: mode === 'LSR' ? '#ffffff' : 'var(--text-secondary)',
            boxShadow: mode === 'LSR' ? '0 2px 10px rgba(59, 139, 235, 0.4)' : 'none',
            border: 'none',
          }}
          title="Switch to Link State Routing (OSPF / Dijkstra SPF)"
        >
          <Zap size={13} color={mode === 'LSR' ? '#ffffff' : 'var(--accent-cyan)'} />
          Link State (OSPF)
        </button>

        <button
          className="btn"
          onClick={() => onModeChange('DVR')}
          style={{
            padding: '4px 12px',
            fontSize: '11.5px',
            borderRadius: 'var(--radius-full)',
            height: 28,
            fontWeight: mode === 'DVR' ? 700 : 500,
            background: mode === 'DVR' ? 'linear-gradient(135deg, #E87A50, #FAA885)' : 'transparent',
            color: mode === 'DVR' ? '#ffffff' : 'var(--text-secondary)',
            boxShadow: mode === 'DVR' ? '0 2px 10px rgba(232, 122, 80, 0.4)' : 'none',
            border: 'none',
          }}
          title="Switch to Distance Vector Routing (RIP / Bellman-Ford)"
        >
          <Activity size={13} color={mode === 'DVR' ? '#ffffff' : 'var(--accent-peach)'} />
          Distance Vector (RIP)
        </button>
      </div>

      <div style={{ width: 1, height: 18, background: 'var(--border-subtle)', margin: '0 2px' }} />

      {/* Convergence Status Pill with LED / Spinner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          borderRadius: 'var(--radius-full)',
          background: isConverged ? 'rgba(31, 163, 126, 0.12)' : 'rgba(217, 119, 6, 0.12)',
          border: `1px solid ${isConverged ? 'rgba(31, 163, 126, 0.35)' : 'rgba(217, 119, 6, 0.4)'}`,
          height: 28,
        }}
        title={`Convergence status of ${mode === 'LSR' ? 'Link State' : 'Distance Vector'} protocol`}
      >
        {isConverged ? (
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: 'var(--accent-emerald)',
              boxShadow: '0 0 8px var(--accent-emerald)',
            }}
          />
        ) : (
          <RotateCcw size={12} color="var(--accent-amber)" className="spin-slow" />
        )}

        <strong
          style={{
            color: isConverged ? 'var(--accent-emerald)' : 'var(--accent-amber)',
            fontSize: '11px',
            letterSpacing: '0.4px',
          }}
        >
          {isConverged ? 'STABLE' : 'CONVERGING'}
        </strong>

        <span
          style={{
            color: 'var(--text-muted)',
            fontSize: '10.5px',
            fontFamily: 'var(--font-mono)',
            marginLeft: '2px',
          }}
        >
          Tick #{currentTick}
        </span>
      </div>

      <div style={{ width: 1, height: 18, background: 'var(--border-subtle)', margin: '0 2px' }} />

      {/* Protocol Trigger Action Button */}
      <button
        className="btn"
        style={{
          fontSize: '11.5px',
          padding: '4px 12px',
          borderRadius: 'var(--radius-full)',
          height: 28,
          background:
            mode === 'LSR'
              ? 'rgba(59, 139, 235, 0.14)'
              : 'rgba(232, 122, 80, 0.14)',
          border: `1px solid ${
            mode === 'LSR'
              ? 'rgba(59, 139, 235, 0.35)'
              : 'rgba(232, 122, 80, 0.35)'
          }`,
          color: mode === 'LSR' ? '#1D64B5' : '#9E4D2B',
          fontWeight: 600,
          gap: '6px',
        }}
        onClick={() => {
          if (onBroadcast) {
            onBroadcast();
          } else {
            if (mode === 'LSR') {
              lsrEngine.originateAll(currentTick);
            } else {
              dvrEngine.advertiseAll(currentTick);
            }
            onStep();
          }
        }}
        title={
          mode === 'LSR'
            ? 'Broadcast Link State Packets (LSP) across the topology'
            : 'Broadcast Distance Vector advertisements to immediate neighbors'
        }
      >
        <Send size={12} color={mode === 'LSR' ? '#1D64B5' : '#9E4D2B'} />
        {mode === 'LSR' ? 'Trigger LSA Flood' : 'Broadcast Vectors'}
      </button>
    </div>
  );
};
