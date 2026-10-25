import React, { useState, useEffect } from 'react';
import { NetworkGraph } from '../../core/NetworkGraph';
import { LinkStateEngine } from '../../core/lsr/LinkStateEngine';
import { DistanceVectorEngine } from '../../core/dvr/DistanceVectorEngine';
import { NodeId } from '../../core/types';
import { TopologyCanvas } from '../canvas/TopologyCanvas';
import {
  Activity,
  Zap,
  CheckCircle2,
  Clock,
  Radio,
  Flame,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

export interface DualRaceViewProps {
  graph: NetworkGraph;
  lsrEngine: LinkStateEngine;
  dvrEngine: DistanceVectorEngine;
  currentTick: number;
  selectedNodeId: NodeId | null;
  onSelectNode: (nodeId: NodeId | null) => void;
  onStepTick: () => void;
}

export const DualRaceView: React.FC<DualRaceViewProps> = ({
  graph,
  lsrEngine,
  dvrEngine,
  currentTick,
  selectedNodeId,
  onSelectNode,
  onStepTick,
}) => {
  // Subscribe to graph updates so both views re-render when nodes/edges mutate
  const [, setVersion] = useState(0);
  useEffect(() => {
    return graph.subscribe(() => {
      setVersion((v) => v + 1);
    });
  }, [graph]);

  const lsrMetrics = lsrEngine.getMetrics();
  const dvrMetrics = dvrEngine.getMetrics();
  const inFlightLSPs = lsrEngine.getInFlightPackets();
  const inFlightDVs = dvrEngine.getInFlightMessages();

  const isLsrConverged = lsrMetrics.isConverged;
  const isDvrConverged = dvrMetrics.isStable;

  // Quick failure injection for race testing
  const handleSeverRandomLink = () => {
    const upEdges = graph.getEdges().filter((e) => e.status === 'UP');
    if (upEdges.length === 0) return;
    const randomEdge = upEdges[Math.floor(Math.random() * upEdges.length)];
    graph.setEdgeStatus(randomEdge.id, 'DOWN');
    onStepTick();
  };

  const handleRestoreAllLinks = () => {
    for (const edge of graph.getEdges()) {
      if (edge.status !== 'UP') {
        graph.setEdgeStatus(edge.id, 'UP');
      }
    }
    for (const node of graph.getNodes()) {
      if (node.status !== 'ACTIVE') {
        graph.setNodeStatus(node.id, 'ACTIVE');
      }
    }
    onStepTick();
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        background: '#040711',
        overflow: 'hidden',
      }}
    >
      {/* Top Dual-Engine Race Status Bar */}
      <div
        className="glass-panel"
        style={{
          height: 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          borderRadius: 0,
          borderLeft: 'none',
          borderRight: 'none',
          borderTop: 'none',
          zIndex: 40,
          background: 'rgba(9, 14, 26, 0.95)',
        }}
      >
        {/* Left Side: LSR Live Summary */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 10px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(2, 132, 199, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
            }}
          >
            <Radio size={13} color="var(--accent-cyan)" />
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
              Link State (OSPF)
            </span>
          </div>

          <span
            className={`badge ${isLsrConverged ? 'badge-converged' : 'badge-active'}`}
            style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            {isLsrConverged ? <CheckCircle2 size={12} /> : <Activity size={12} />}
            {isLsrConverged ? 'STABLE' : `FLOODING (${inFlightLSPs.length})`}
          </span>

          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            Msgs: <strong>{lsrMetrics.totalLSPsTransmitted}</strong>
          </span>
        </div>

        {/* Center: Race Banner & Chaos Triggers */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              fontSize: '12px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: isLsrConverged && isDvrConverged ? 'var(--accent-emerald)' : 'var(--accent-amber)',
            }}
          >
            <Zap size={14} />
            {isLsrConverged && isDvrConverged
              ? 'Both Engines Converged'
              : isLsrConverged
              ? 'LSR Converged · DVR Computing'
              : isDvrConverged
              ? 'DVR Converged · LSR Flooding'
              : 'Both Engines Converging...'}
            <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
              (Tick {currentTick})
            </span>
          </div>

          <div style={{ width: 1, height: 18, background: 'var(--border-subtle)' }} />

          <button
            className="btn btn-secondary"
            onClick={handleSeverRandomLink}
            style={{ fontSize: '11px', padding: '4px 10px' }}
            title="Randomly sever an operational link to observe convergence race"
          >
            <Flame size={12} color="var(--accent-rose)" /> Sever Link & Race
          </button>

          <button
            className="btn btn-secondary"
            onClick={handleRestoreAllLinks}
            style={{ fontSize: '11px', padding: '4px 10px' }}
            title="Restore all severed links and observe recovery"
          >
            <RotateCcw size={12} /> Restore All
          </button>
        </div>

        {/* Right Side: DVR Live Summary */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            Msgs: <strong>{dvrMetrics.totalVectorsTransmitted}</strong>
          </span>

          {dvrMetrics.activeLoops.length > 0 && (
            <span className="badge badge-unstable" style={{ fontSize: '11px' }}>
              <AlertTriangle size={12} /> {dvrMetrics.activeLoops.length} Loops
            </span>
          )}

          <span
            className={`badge ${isDvrConverged ? 'badge-converged' : 'badge-active'}`}
            style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            {isDvrConverged ? <CheckCircle2 size={12} /> : <Clock size={12} />}
            {isDvrConverged ? 'STABLE' : `EXCHANGING (${inFlightDVs.length})`}
          </span>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 10px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(147, 51, 234, 0.15)',
              border: '1px solid rgba(192, 132, 252, 0.3)',
            }}
          >
            <Radio size={13} color="var(--accent-purple)" />
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-purple)' }}>
              Distance Vector (RIP)
            </span>
          </div>
        </div>
      </div>

      {/* Split Dual-Panel Main Body */}
      <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
        {/* Left Panel: Link State (OSPF) Canvas */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            height: '100%',
            borderRight: '1px solid var(--border-subtle)',
          }}
        >
          {/* Top Title Overlay */}
          <div
            style={{
              position: 'absolute',
              top: 12,
              left: 16,
              zIndex: 30,
              pointerEvents: 'none',
              background: 'rgba(10, 24, 44, 0.85)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
              Link State Routing Engine
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
              OSPF Flooding · Sequence Numbers · Dijkstra SPF Tree
            </div>
          </div>

          <TopologyCanvas
            graph={graph}
            selectedNodeId={selectedNodeId}
            onSelectNode={onSelectNode}
            inFlightLSPs={inFlightLSPs}
            canvasTheme="lsr"
            showControls={false}
          />
        </div>

        {/* High-Tech Glowing Center Divider Marker */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 35,
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'var(--bg-card)',
            border: '2px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 16px rgba(0,0,0,0.8)',
            pointerEvents: 'none',
          }}
        >
          <Zap size={14} color="var(--accent-cyan)" />
        </div>

        {/* Right Panel: Distance Vector (RIP) Canvas */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            height: '100%',
          }}
        >
          {/* Top Title Overlay */}
          <div
            style={{
              position: 'absolute',
              top: 12,
              left: 16,
              zIndex: 30,
              pointerEvents: 'none',
              background: 'rgba(23, 13, 40, 0.85)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(192, 132, 252, 0.3)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-purple)' }}>
              Distance Vector Engine
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
              Bellman-Ford Relaxation · Neighbor Vector Exchange · Loop Detection
            </div>
          </div>

          <TopologyCanvas
            graph={graph}
            selectedNodeId={selectedNodeId}
            onSelectNode={onSelectNode}
            inFlightDVMessages={inFlightDVs}
            canvasTheme="dvr"
            showControls={false}
          />
        </div>
      </div>
    </div>
  );
};
