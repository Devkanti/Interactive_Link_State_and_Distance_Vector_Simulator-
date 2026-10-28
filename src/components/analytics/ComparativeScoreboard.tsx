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
        background: 'rgba(255, 255, 255, 0.96)',
        border: '1px solid var(--border-strong)',
        boxShadow: '0 20px 50px rgba(92, 50, 20, 0.16), 0 0 20px rgba(148, 200, 253, 0.25)',
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
              background: 'linear-gradient(135deg, #E87A50, #94C8FD)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 12px rgba(232, 122, 80, 0.35)',
            }}
          >
            <Trophy size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))',
          gap: '14px',
        }}
      >
        {/* Card 1: Convergence Speed */}
        <div
          className="glass-panel"
          style={{
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            background: 'rgba(254, 239, 229, 0.85)',
            border: '1px solid rgba(59, 139, 235, 0.3)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
              CONVERGENCE TIME
            </span>
            <Gauge size={15} color="var(--accent-cyan)" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="badge badge-lsr" style={{ fontSize: '9px', padding: '1px 5px', width: 'fit-content', marginBottom: '2px' }}>
                LSR
              </span>
              <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                {lsrRecoveryDuration} <span style={{ fontSize: '10px', fontWeight: 500 }}>ticks</span>
              </span>
            </div>

            <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600 }}>vs</span>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span className="badge badge-dvr" style={{ fontSize: '9px', padding: '1px 5px', width: 'fit-content', marginBottom: '2px' }}>
                DVR
              </span>
              <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-purple)', fontFamily: 'var(--font-mono)' }}>
                {dvrRecoveryDuration} <span style={{ fontSize: '10px', fontWeight: 500 }}>ticks</span>
              </span>
            </div>
          </div>

          <div
            style={{
              fontSize: '10px',
              padding: '3px 8px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(148, 200, 253, 0.25)',
              color: '#1D64B5',
              fontWeight: 700,
              border: '1px solid rgba(148, 200, 253, 0.6)',
              textAlign: 'center',
            }}
          >
            {speedWinnerBadge}
          </div>
        </div>

        {/* Card 2: Control Packet Overhead */}
        <div
          className="glass-panel"
          style={{
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            background: 'rgba(254, 239, 229, 0.85)',
            border: '1px solid rgba(232, 122, 80, 0.3)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
              PACKET OVERHEAD
            </span>
            <Zap size={15} color="var(--accent-purple)" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="badge badge-lsr" style={{ fontSize: '9px', padding: '1px 5px', width: 'fit-content', marginBottom: '2px' }}>
                LSR FLOOD
              </span>
              <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                {summary.lsrTotalMessages} <span style={{ fontSize: '10px', fontWeight: 500 }}>pkts</span>
              </span>
            </div>

            <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600 }}>vs</span>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span className="badge badge-dvr" style={{ fontSize: '9px', padding: '1px 5px', width: 'fit-content', marginBottom: '2px' }}>
                DVR VECTOR
              </span>
              <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-purple)', fontFamily: 'var(--font-mono)' }}>
                {summary.dvrTotalMessages} <span style={{ fontSize: '10px', fontWeight: 500 }}>pkts</span>
              </span>
            </div>
          </div>

          <div style={{ fontSize: '10px', color: 'var(--text-secondary)', lineHeight: 1.4, textAlign: 'center' }}>
            {summary.lsrTotalMessages < summary.dvrTotalMessages
              ? `⚡ LSR generated ${(summary.dvrTotalMessages - summary.lsrTotalMessages)} fewer packets`
              : summary.dvrTotalMessages < summary.lsrTotalMessages
              ? `⚡ DVR generated ${(summary.lsrTotalMessages - summary.dvrTotalMessages)} fewer packets`
              : 'Equal control traffic flooded across subnet'}
          </div>
        </div>

        {/* Card 3: Memory Footprint */}
        <div
          className="glass-panel"
          style={{
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            background: 'rgba(254, 239, 229, 0.85)',
            border: '1px solid rgba(31, 163, 126, 0.3)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
              MEMORY FOOTPRINT
            </span>
            <HardDrive size={15} color="var(--accent-emerald)" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="badge badge-lsr" style={{ fontSize: '9px', padding: '1px 5px', width: 'fit-content', marginBottom: '2px' }}>
                LSDB TOTAL
              </span>
              <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                {lsrMem} <span style={{ fontSize: '10px', fontWeight: 500 }}>B</span>
              </span>
            </div>

            <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600 }}>vs</span>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span className="badge badge-dvr" style={{ fontSize: '9px', padding: '1px 5px', width: 'fit-content', marginBottom: '2px' }}>
                DV STATE
              </span>
              <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-purple)', fontFamily: 'var(--font-mono)' }}>
                {dvrMem} <span style={{ fontSize: '10px', fontWeight: 500 }}>B</span>
              </span>
            </div>
          </div>

          <div style={{ fontSize: '10px', color: 'var(--text-secondary)', lineHeight: 1.4, textAlign: 'center' }}>
            {lsrMem < dvrMem
              ? `⚡ LSR is ${(100 - (lsrMem / dvrMem) * 100).toFixed(0)}% leaner in table memory`
              : dvrMem < lsrMem
              ? `⚡ DVR is ${(100 - (dvrMem / lsrMem) * 100).toFixed(0)}% leaner in table memory`
              : 'Equal memory consumption across nodes'}
          </div>
        </div>

        {/* Card 4: Loop Duration & Stability */}
        <div
          className="glass-panel"
          style={{
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            background: 'rgba(254, 239, 229, 0.85)',
            border: `1px solid ${
              summary.totalLoopTicks > 0 ? 'rgba(225, 71, 90, 0.45)' : 'rgba(31, 163, 126, 0.3)'
            }`,
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
              ROUTING STABILITY
            </span>
            <AlertTriangle
              size={15}
              color={summary.totalLoopTicks > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)'}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <div
              style={{
                fontSize: '22px',
                fontWeight: 800,
                fontFamily: 'var(--font-mono)',
                color: summary.totalLoopTicks > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)',
              }}
            >
              {summary.totalLoopTicks}{' '}
              <span style={{ fontSize: '11px', fontWeight: 500 }}>loop ticks</span>
            </div>
          </div>

          <div
            style={{
              fontSize: '10px',
              padding: '3px 8px',
              borderRadius: 'var(--radius-full)',
              background:
                summary.totalLoopTicks > 0 ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              color: summary.totalLoopTicks > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)',
              fontWeight: 700,
              border: `1px solid ${
                summary.totalLoopTicks > 0 ? 'rgba(244, 63, 94, 0.3)' : 'rgba(16, 185, 129, 0.3)'
              }`,
              textAlign: 'center',
            }}
          >
            {summary.currentActiveLoops > 0
              ? `⚠ ${summary.currentActiveLoops} active cycle(s) in DVR`
              : '✓ Zero routing loops detected'}
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
