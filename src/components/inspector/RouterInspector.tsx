import React, { useState } from 'react';
import { NetworkGraph } from '../../core/NetworkGraph';
import { LinkStateEngine } from '../../core/lsr/LinkStateEngine';
import { DistanceVectorEngine } from '../../core/dvr/DistanceVectorEngine';
import { NodeId } from '../../core/types';
import {
  X,
  Database,
  Route,
  Activity,
  Power,
  Table as TableIcon,
  ShieldCheck,
  Zap,
  BookOpen,
} from 'lucide-react';

export type ProtocolMode = 'LSR' | 'DVR';

interface RouterInspectorProps {
  nodeId: NodeId;
  graph: NetworkGraph;
  lsrEngine: LinkStateEngine;
  dvrEngine: DistanceVectorEngine;
  mode: ProtocolMode;
  onModeChange: (mode: ProtocolMode) => void;
  onClose: () => void;
  currentTick: number;
  onOpenEducationalInspector?: () => void;
}

export const RouterInspector: React.FC<RouterInspectorProps> = ({
  nodeId,
  graph,
  lsrEngine,
  dvrEngine,
  mode,
  onModeChange,
  onClose,
  currentTick,
  onOpenEducationalInspector,
}) => {
  const [activeTab, setActiveTab] = useState<'forwarding' | 'protocol'>('forwarding');

  const node = graph.getNode(nodeId);
  if (!node) return null;

  const isCrashed = node.status === 'CRASHED';

  // Get active forwarding table depending on current protocol mode
  const routingTable =
    mode === 'LSR'
      ? lsrEngine.getRoutingTable(nodeId) || {}
      : dvrEngine.getRoutingTable(nodeId) || {};

  const allDestinations = graph.getNodes().map((n) => n.id);

  // DVR Data
  const neighborVectors = dvrEngine.getNeighborVectors(nodeId);
  const activeNeighbors = graph.getNeighbors(nodeId, true);

  // LSR Data
  const lsdb = lsrEngine.getLSDB(nodeId);

  return (
    <div
      className="glass-panel"
      style={{
        position: 'absolute',
        top: 16,
        right: 16,
        bottom: 24,
        width: 440,
        zIndex: 150,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--border-strong)',
        overflow: 'hidden',
        animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Drawer Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(15, 23, 42, 0.5)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-sm)',
              background: isCrashed
                ? 'rgba(244, 63, 94, 0.2)'
                : 'linear-gradient(135deg, #0284c7, #38bdf8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${isCrashed ? 'var(--accent-rose)' : 'var(--accent-cyan)'}`,
            }}
          >
            <Route size={18} color={isCrashed ? 'var(--accent-rose)' : '#fff'} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                {node.label}
              </span>
              <span className={`badge badge-${node.status.toLowerCase()}`}>
                {node.status}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Selected Router Inspector
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {onOpenEducationalInspector && (
            <button
              className="btn btn-secondary btn-icon"
              title="Open Mathematical Algorithm Inspector"
              onClick={onOpenEducationalInspector}
            >
              <BookOpen size={14} color="var(--accent-cyan)" />
            </button>
          )}

          <button
            className={`btn ${isCrashed ? 'btn-accent' : 'btn-danger'} btn-icon`}
            title={isCrashed ? 'Recover Router' : 'Crash Router'}
            onClick={() =>
              graph.setNodeStatus(nodeId, isCrashed ? 'ACTIVE' : 'CRASHED')
            }
          >
            <Power size={14} />
          </button>

          <button
            className="btn btn-secondary btn-icon"
            onClick={onClose}
            title="Close Drawer"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Protocol Mode Toggle Switcher */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div
          style={{
            display: 'flex',
            gap: '4px',
            background: 'rgba(0, 0, 0, 0.4)',
            padding: '3px',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <button
            className={`btn ${mode === 'LSR' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, padding: '6px 10px', fontSize: '12px' }}
            onClick={() => onModeChange('LSR')}
          >
            <Zap size={14} /> Link State (LSR)
          </button>
          <button
            className={`btn ${mode === 'DVR' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, padding: '6px 10px', fontSize: '12px' }}
            onClick={() => onModeChange('DVR')}
          >
            <Activity size={14} /> Distance Vector (DVR)
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '0 20px',
          background: 'rgba(15, 23, 42, 0.2)',
        }}
      >
        <button
          onClick={() => setActiveTab('forwarding')}
          style={{
            padding: '10px 14px',
            fontSize: '12px',
            fontWeight: 700,
            background: 'transparent',
            border: 'none',
            color: activeTab === 'forwarding' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'forwarding' ? '2px solid var(--accent-cyan)' : '2px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <TableIcon size={14} /> Forwarding Table
        </button>
        <button
          onClick={() => setActiveTab('protocol')}
          style={{
            padding: '10px 14px',
            fontSize: '12px',
            fontWeight: 700,
            background: 'transparent',
            border: 'none',
            color: activeTab === 'protocol' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'protocol' ? '2px solid var(--accent-cyan)' : '2px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Database size={14} /> {mode === 'LSR' ? 'LSDB Database' : 'DV Matrix'}
        </button>
      </div>

      {/* Tab Panels Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {activeTab === 'forwarding' ? (
          /* Forwarding / Routing Table View */
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px',
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                FIB / Routing Table ({allDestinations.length} Destinations)
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Tick #{currentTick}
              </span>
            </div>

            <div
              style={{
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                overflow: 'hidden',
              }}
            >
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.04)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                    <th style={{ padding: '8px 10px', fontWeight: 600 }}>Dest</th>
                    <th style={{ padding: '8px 10px', fontWeight: 600 }}>Next Hop</th>
                    <th style={{ padding: '8px 10px', fontWeight: 600 }}>Metric</th>
                    <th style={{ padding: '8px 10px', fontWeight: 600 }}>Path</th>
                  </tr>
                </thead>
                <tbody>
                  {allDestinations.map((dest) => {
                    const entry = routingTable[dest];
                    const isSelf = dest === nodeId;
                    const isUnreachable = !entry || entry.cost >= 16 || entry.cost === Infinity;
                    const isRecentlyUpdated = entry?.updatedAtTick === currentTick;

                    let rowBg = 'transparent';
                    if (isRecentlyUpdated) rowBg = 'rgba(16, 185, 129, 0.12)';
                    else if (isUnreachable && !isSelf) rowBg = 'rgba(244, 63, 94, 0.06)';

                    return (
                      <tr
                        key={dest}
                        style={{
                          borderTop: '1px solid var(--border-subtle)',
                          background: rowBg,
                          transition: 'background 0.3s',
                        }}
                      >
                        <td style={{ padding: '8px 10px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {dest} {isSelf && <span style={{ color: 'var(--accent-cyan)' }}>(local)</span>}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          {isSelf ? (
                            <span style={{ color: 'var(--text-muted)' }}>-</span>
                          ) : entry?.nextHop ? (
                            <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>
                              {entry.nextHop}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--accent-rose)' }}>None</span>
                          )}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          {isUnreachable ? (
                            <span style={{ color: 'var(--accent-rose)', fontWeight: 700 }}>
                              &infin; (16)
                            </span>
                          ) : (
                            <span style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>
                              {entry?.cost}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '8px 10px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {entry?.path && entry.path.length > 0
                            ? entry.path.join(' \u2192 ')
                            : isUnreachable
                            ? '\u2717 Drop'
                            : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div
              style={{
                marginTop: '14px',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-subtle)',
                fontSize: '11px',
                color: 'var(--text-muted)',
                lineHeight: 1.5,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                <ShieldCheck size={14} color="var(--accent-cyan)" />
                <strong>Forwarding Logic</strong>
              </div>
              Packets destined for any target host query this table. If Next Hop is &ldquo;None&rdquo;, the packet will trigger an ICMP destination unreachable drop.
            </div>
          </div>
        ) : mode === 'LSR' ? (
          /* Link State Database (LSDB) View */
          <div>
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                Synchronized Link State Database (LSDB)
              </span>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Full topology map as flooded by all routers via Link State Packets (LSPs).
              </p>
            </div>

            {lsdb && lsdb.size > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {Array.from(lsdb.entries()).map(([originator, entry]) => (
                  <div
                    key={originator}
                    className="glass-panel"
                    style={{
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <strong style={{ color: 'var(--accent-cyan)', fontSize: '13px' }}>
                        Originator: {originator}
                      </strong>
                      <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                        <span>Seq #{entry.sequenceNumber}</span>
                        <span>Age {entry.age}s</span>
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Advertised Neighbors:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                      {entry.neighbors.map((n) => (
                        <span
                          key={n.neighborId}
                          style={{
                            background: 'rgba(255, 255, 255, 0.06)',
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-sm)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '11px',
                          }}
                        >
                          &rarr; {n.neighborId} (cost: <strong>{n.cost}</strong>)
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                LSDB is empty. Step the simulation clock to flood LSPs.
              </div>
            )}
          </div>
        ) : (
          /* Distance Vector Matrix View */
          <div>
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                Distance Vector Matrix: D_{nodeId}(y) = min_v {'{'} c({nodeId}, v) + D_v(y) {'}'}
              </span>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Shows advertised distances received from each adjacent neighbor.
              </p>
            </div>

            {activeNeighbors.length > 0 ? (
              <div
                style={{
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  overflowX: 'auto',
                }}
              >
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.04)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '6px 8px', textAlign: 'left' }}>Dest (y)</th>
                      {activeNeighbors.map((n) => (
                        <th key={n.neighborId} style={{ padding: '6px 8px', textAlign: 'center' }}>
                          via {n.neighborId} (c={n.cost})
                        </th>
                      ))}
                      <th style={{ padding: '6px 8px', textAlign: 'center', color: 'var(--accent-cyan)' }}>
                        Min D_{nodeId}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {allDestinations.map((dest) => {
                      const localEntry = routingTable[dest];
                      return (
                        <tr key={dest} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '6px 8px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {dest}
                          </td>
                          {activeNeighbors.map((n) => {
                            const neighborVec = neighborVectors?.get(n.neighborId);
                            const reportedCost = neighborVec?.get(dest);
                            const isOptimal = localEntry?.nextHop === n.neighborId;

                            return (
                              <td
                                key={n.neighborId}
                                style={{
                                  padding: '6px 8px',
                                  textAlign: 'center',
                                  background: isOptimal ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                                  color: isOptimal ? 'var(--accent-emerald)' : 'var(--text-secondary)',
                                  fontWeight: isOptimal ? 700 : 400,
                                }}
                              >
                                {reportedCost !== undefined
                                  ? reportedCost >= 16
                                    ? '\u221E'
                                    : reportedCost
                                  : '-'}
                              </td>
                            );
                          })}
                          <td
                            style={{
                              padding: '6px 8px',
                              textAlign: 'center',
                              fontWeight: 700,
                              color: localEntry?.cost && localEntry.cost < 16 ? 'var(--accent-cyan)' : 'var(--accent-rose)',
                            }}
                          >
                            {localEntry?.cost && localEntry.cost < 16 ? localEntry.cost : '\u221E'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                No active immediate neighbors connected to {nodeId}.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
