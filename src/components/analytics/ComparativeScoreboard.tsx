import React from 'react';
import { MetricsCollector } from '../../core/analytics/MetricsCollector';
import { DisruptionRecoveryRecord } from '../../core/analytics/types';
import { ConvergenceChart } from './ConvergenceChart';
import {
  Trophy,
  Zap,
  HardDrive,
  AlertTriangle,
  X,
  Gauge,
  History,
  CheckCircle2,
  Clock,
} from 'lucide-react';

export interface ComparativeScoreboardProps {
  metricsCollector: MetricsCollector;
  currentTick: number;
  onClose?: () => void;
}

export const ComparativeScoreboard: React.FC<ComparativeScoreboardProps> = ({
  metricsCollector,
  currentTick,
  onClose,
}) => {
  const summary = metricsCollector.getSummary();
  const history = metricsCollector.getHistory();

  const lsrMem = summary.lsrMemoryBytes;
  const dvrMem = summary.dvrMemoryBytes;

  const latestRecovery = summary.latestRecovery;
  const lsrRecoveryDuration = latestRecovery?.lsrDurationTicks ?? 0;
  const dvrRecoveryDuration = latestRecovery?.dvrDurationTicks ?? 0;

  let speedWinnerBadge = 'Equal Convergence Speed';
  if (lsrRecoveryDuration < dvrRecoveryDuration) {
    const ratio = dvrRecoveryDuration > 0 ? (dvrRecoveryDuration / Math.max(1, lsrRecoveryDuration)).toFixed(1) : '2';
    speedWinnerBadge = `⚡ LSR Converged ${ratio}x Faster`;
  } else if (dvrRecoveryDuration < lsrRecoveryDuration) {
    const ratio = lsrRecoveryDuration > 0 ? (lsrRecoveryDuration / Math.max(1, dvrRecoveryDuration)).toFixed(1) : '2';
    speedWinnerBadge = `⚡ DVR Converged ${ratio}x Faster`;
  }

  return (
    <div
      className="glass-panel modal-card"
      style={{
        width: '840px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        padding: '24px',
        background: 'rgba(9, 14, 28, 0.96)',
        border: '1px solid var(--border-strong)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 20px rgba(56, 189, 248, 0.15)',
      }}
    >
      {/* Modal Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, #0284c7, #9333ea)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 12px rgba(147, 51, 234, 0.4)',
            }}
          >
            <Trophy size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800 }}>
              Real-Time Comparative Analytics Scoreboard
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Head-to-head empirical metrics: Link State (OSPF) vs Distance Vector (RIP)
            </div>
          </div>
        </div>

        {onClose && (
          <button
            className="btn btn-secondary btn-icon"
            onClick={onClose}
            title="Close Scoreboard"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* 4 Core Comparison Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '14px',
        }}
      >
        {/* Card 1: Convergence Speed */}
        <div
          className="glass-panel"
          style={{
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>
              CONVERGENCE TIME
            </span>
            <Gauge size={14} color="var(--accent-cyan)" />
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent-cyan)' }}>
              {lsrRecoveryDuration} <span style={{ fontSize: '11px', fontWeight: 500 }}>ticks</span>
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>vs</span>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent-purple)' }}>
              {dvrRecoveryDuration} <span style={{ fontSize: '11px', fontWeight: 500 }}>ticks</span>
            </div>
          </div>

          <div
            style={{
              fontSize: '10px',
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(2, 132, 199, 0.15)',
              color: 'var(--accent-cyan)',
              fontWeight: 600,
              width: 'fit-content',
            }}
          >
            {speedWinnerBadge}
          </div>
        </div>

        {/* Card 2: Control Packet Overhead */}
        <div
          className="glass-panel"
          style={{
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(192, 132, 252, 0.25)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>
              PACKET OVERHEAD
            </span>
            <Zap size={14} color="var(--accent-purple)" />
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent-cyan)' }}>
              {summary.lsrTotalMessages}
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>vs</span>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent-purple)' }}>
              {summary.dvrTotalMessages}
            </div>
          </div>

          <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
            Cumulative protocol messages flooded vs vectors exchanged
          </div>
        </div>

        {/* Card 3: Memory Footprint */}
        <div
          className="glass-panel"
          style={{
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>
              MEMORY FOOTPRINT
            </span>
            <HardDrive size={14} color="var(--accent-emerald)" />
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent-cyan)' }}>
              {lsrMem} <span style={{ fontSize: '11px', fontWeight: 500 }}>B</span>
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>vs</span>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent-purple)' }}>
              {dvrMem} <span style={{ fontSize: '11px', fontWeight: 500 }}>B</span>
            </div>
          </div>

          <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
            LSDB total size vs Distance Vector state across subnet
          </div>
        </div>

        {/* Card 4: Loop Duration & Stability */}
        <div
          className="glass-panel"
          style={{
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            background: 'rgba(15, 23, 42, 0.65)',
            border: `1px solid ${
              summary.totalLoopTicks > 0 ? 'rgba(244, 63, 94, 0.4)' : 'rgba(255, 255, 255, 0.1)'
            }`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>
              ROUTING INCONSISTENCIES
            </span>
            <AlertTriangle
              size={14}
              color={summary.totalLoopTicks > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)'}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <div
              style={{
                fontSize: '20px',
                fontWeight: 800,
                color: summary.totalLoopTicks > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)',
              }}
            >
              {summary.totalLoopTicks}{' '}
              <span style={{ fontSize: '11px', fontWeight: 500 }}>loop ticks</span>
            </div>
          </div>

          <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
            {summary.currentActiveLoops > 0
              ? `⚠ ${summary.currentActiveLoops} active cycle(s) in DVR`
              : 'Zero active loops detected'}
          </div>
        </div>
      </div>

      {/* Real-Time SVG Line Chart */}
      <ConvergenceChart history={history} height={210} />

      {/* Historical Disruption Recovery Race Table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <History size={14} color="var(--accent-amber)" />
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Historical Fault Recovery Log
          </span>
        </div>

        {summary.recoveryRecords.length === 0 ? (
          <div
            style={{
              padding: '16px',
              textAlign: 'center',
              fontSize: '11px',
              color: 'var(--text-muted)',
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            No failure disruptions recorded yet. Inject a failure or sever a link to observe the race!
          </div>
        ) : (
          <div
            style={{
              maxHeight: 160,
              overflowY: 'auto',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <table className="data-table" style={{ fontSize: '11px' }}>
              <thead>
                <tr>
                  <th>Tick</th>
                  <th>Event Description</th>
                  <th>LSR Duration</th>
                  <th>DVR Duration</th>
                  <th>Winner</th>
                  <th>LSR Packets</th>
                  <th>DVR Packets</th>
                </tr>
              </thead>
              <tbody>
                {summary.recoveryRecords.slice(0, 10).map((rec: DisruptionRecoveryRecord) => (
                  <tr key={rec.id}>
                    <td>
                      <span className="badge badge-active" style={{ fontSize: '10px' }}>
                        T{rec.disruptionTick}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{rec.description}</td>
                    <td>
                      <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>
                        {rec.lsrDurationTicks !== null ? `${rec.lsrDurationTicks} ticks` : 'Pending'}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--accent-purple)', fontWeight: 600 }}>
                        {rec.dvrDurationTicks !== null ? `${rec.dvrDurationTicks} ticks` : 'Pending'}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          rec.winner === 'LSR'
                            ? 'badge-converged'
                            : rec.winner === 'DVR'
                            ? 'badge-active'
                            : 'badge-unstable'
                        }`}
                        style={{ fontSize: '10px' }}
                      >
                        {rec.winner}
                      </span>
                    </td>
                    <td>{rec.lsrMessagesDuringRecovery}</td>
                    <td>{rec.dvrMessagesDuringRecovery}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer Status */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '12px',
          fontSize: '11px',
          color: 'var(--text-secondary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={13} />
          <span>Current Simulation Tick: <strong>{currentTick}</strong></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CheckCircle2 size={13} color="var(--accent-emerald)" />
          <span>Real-time analytical telemetry streaming active</span>
        </div>
      </div>
    </div>
  );
};
