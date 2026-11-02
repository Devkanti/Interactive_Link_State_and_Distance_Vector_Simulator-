import React, { useState, useEffect } from 'react';
import { NetworkGraph } from '../../core/NetworkGraph';
import { LinkStateEngine } from '../../core/lsr/LinkStateEngine';
import { DistanceVectorEngine } from '../../core/dvr/DistanceVectorEngine';
import { NodeId } from '../../core/types';
import { TracePacket } from '../../core/tracer/types';
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
  BarChart2,
  Send,
} from 'lucide-react';

export interface DualRaceViewProps {
  graph: NetworkGraph;
  lsrEngine: LinkStateEngine;
  dvrEngine: DistanceVectorEngine;
  currentTick: number;
  selectedNodeId: NodeId | null;
  onSelectNode: (nodeId: NodeId | null) => void;
  onStepTick: () => void;
  onOpenScoreboard?: () => void;
  onBroadcast?: () => void;
  isChaosActive?: boolean;
  activeTracePackets?: TracePacket[];
  pingTriggerSignal?: { sourceId: string; destId: string; timestamp: number } | null;
  onTriggerPing?: (sourceId: string, destId: string) => void;
}

export const DualRaceView: React.FC<DualRaceViewProps> = ({
  graph,
  lsrEngine,
  dvrEngine,
  currentTick,
  selectedNodeId,
  onSelectNode,
  onStepTick,
  onOpenScoreboard,
  onBroadcast,
  isChaosActive = false,
  activeTracePackets = [],
  pingTriggerSignal = null,
  onTriggerPing,
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

  // Race broadcast / flood: originates LSPs on LSR and advertises vectors on DVR
  const handleRaceBroadcast = () => {
    lsrEngine.originateAll(currentTick);
    dvrEngine.advertiseAll(currentTick);
    if (onBroadcast) {
      onBroadcast();
    } else {
      onStepTick();
    }
  };

  // Dispatches an ICMP Ping on both engines simultaneously
  const handleRacePing = () => {
    const nodes = graph.getNodes();
    if (nodes.length < 2) return;
    const src = nodes[0].id;
    const dst = nodes[nodes.length - 1].id;
    if (onTriggerPing) {
      onTriggerPing(src, dst);
    }
  };

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
        background: 'var(--bg-primary)',
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
          background: 'rgba(255, 255, 255, 0.92)',
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
              background: 'rgba(59, 139, 235, 0.15)',
              border: '1px solid rgba(59, 139, 235, 0.35)',
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

        {/* Center: Race Controls & Failure Triggers */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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

          {/* Race Flood & Exchange Button */}
          <button
            className="btn btn-primary"
            onClick={handleRaceBroadcast}
            style={{ fontSize: '11px', padding: '4px 10px', gap: '4px' }}
            title="Flood LSPs on Left (LSR) and Exchange Vectors on Right (DVR) simultaneously"
          >
            <Zap size={12} /> Flood & Race
          </button>

          {/* Race Ping Button */}
          <button
            className="btn btn-secondary"
            onClick={handleRacePing}
            style={{
              fontSize: '11px',
              padding: '4px 10px',
              gap: '4px',
              border: '1px solid rgba(0, 242, 254, 0.4)',
              background: 'rgba(0, 242, 254, 0.08)',
              color: 'var(--accent-cyan)',
            }}
            title="Dispatch ICMP Ping packet on both engines simultaneously to compare paths"
          >
            <Send size={12} color="var(--accent-cyan)" /> Race Ping (A ➔ D)
          </button>

          {/* Sever Link & Race Button */}
          <button
            className="btn btn-danger"
            onClick={handleSeverRandomLink}
            style={{ fontSize: '11px', padding: '4px 10px', gap: '4px' }}
            title="Randomly sever an operational link to observe convergence race"
          >
            <Flame size={12} color="#fff" /> Sever & Race
          </button>

          <button
            className="btn btn-secondary"
            onClick={handleRestoreAllLinks}
            style={{ fontSize: '11px', padding: '4px 10px' }}
            title="Restore all severed links and observe recovery"
          >
            <RotateCcw size={12} /> Restore All
          </button>

          {onOpenScoreboard && (
            <button
              className="btn btn-secondary"
              onClick={onOpenScoreboard}
              style={{ fontSize: '11px', padding: '4px 10px' }}
              title="Open Comparative Metrics Scoreboard"
            >
              <BarChart2 size={12} /> Scoreboard
            </button>
          )}
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
              background: 'rgba(232, 122, 80, 0.15)',
              border: '1px solid rgba(232, 122, 80, 0.35)',
            }}
          >
            <Radio size={13} color="var(--accent-peach)" />
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-peach)' }}>
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
              background: 'rgba(255, 255, 255, 0.92)',
              padding: '6px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(59, 139, 235, 0.35)',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 2px 8px rgba(92, 50, 20, 0.08)',
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
            key="dual-canvas-lsr"
            graph={graph}
            selectedNodeId={selectedNodeId}
            onSelectNode={onSelectNode}
            inFlightLSPs={inFlightLSPs}
            activeTracePackets={activeTracePackets}
            canvasTheme="lsr"
            isChaosActive={isChaosActive}
            pingTriggerSignal={pingTriggerSignal}
            onTriggerPing={onTriggerPing}
            showControls={false}
          />
        </div>

        {/* Center Divider Marker */}
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
            boxShadow: '0 0 16px rgba(92, 50, 20, 0.15)',
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
              background: 'rgba(255, 255, 255, 0.92)',
              padding: '6px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(232, 122, 80, 0.35)',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 2px 8px rgba(92, 50, 20, 0.08)',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-peach)' }}>
              Distance Vector Engine
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
              Bellman-Ford Relaxation · Neighbor Vector Exchange · Loop Detection
            </div>
          </div>

          <TopologyCanvas
            key="dual-canvas-dvr"
            graph={graph}
            selectedNodeId={selectedNodeId}
            onSelectNode={onSelectNode}
            inFlightDVMessages={inFlightDVs}
            activeTracePackets={activeTracePackets}
            canvasTheme="dvr"
            isChaosActive={isChaosActive}
            pingTriggerSignal={pingTriggerSignal}
            onTriggerPing={onTriggerPing}
            showControls={false}
          />
        </div>
      </div>
    </div>
  );
};
