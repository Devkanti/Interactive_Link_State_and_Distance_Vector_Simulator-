import React, { useState, useMemo } from 'react';
import { NetworkGraph } from '../../core/NetworkGraph';
import { LinkStateEngine } from '../../core/lsr/LinkStateEngine';
import { DistanceVectorEngine } from '../../core/dvr/DistanceVectorEngine';
import { Dijkstra } from '../../core/lsr/Dijkstra';
import { NodeId } from '../../core/types';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  CheckCircle2,
  Clock,
  Sparkles,
  X,
  Sigma,
  Zap,
} from 'lucide-react';

export interface AlgorithmEducationalInspectorProps {
  graph: NetworkGraph;
  lsrEngine: LinkStateEngine;
  dvrEngine: DistanceVectorEngine;
  selectedNodeId: NodeId;
  onSelectNode: (nodeId: NodeId) => void;
  onClose: () => void;
}

type InspectorMode = 'DIJKSTRA' | 'BELLMAN_FORD';

export const AlgorithmEducationalInspector: React.FC<AlgorithmEducationalInspectorProps> = ({
  graph,
  lsrEngine,
  dvrEngine,
  selectedNodeId,
  onSelectNode,
  onClose,
}) => {
  const [mode, setMode] = useState<InspectorMode>('DIJKSTRA');
  const [dijkstraStepIndex, setDijkstraStepIndex] = useState(0);

  const allNodes = useMemo(() => graph.getNodes().map((n) => n.id), [graph]);
  const activeRoot = allNodes.includes(selectedNodeId) ? selectedNodeId : allNodes[0] || 'A';

  // 1. Compute Dijkstra steps from current LSDB of activeRoot
  const dijkstraResult = useMemo(() => {
    const lsdb = lsrEngine.getLSDB(activeRoot);
    if (lsdb && lsdb.size > 0) {
      return Dijkstra.compute(activeRoot, lsdb, allNodes);
    }
    // Fallback: compute directly from operational graph adjacency
    const adj = new Map<NodeId, Map<NodeId, number>>();
    for (const n of allNodes) adj.set(n, new Map());
    for (const e of graph.getEdges()) {
      if (graph.isEdgeEffectivelyUp(e)) {
        adj.get(e.source)?.set(e.target, e.cost);
        adj.get(e.target)?.set(e.source, e.cost);
      }
    }
    return Dijkstra.compute(activeRoot, adj, allNodes);
  }, [lsrEngine, activeRoot, allNodes, graph]);

  const steps = dijkstraResult.steps;
  const safeStepIndex = Math.min(dijkstraStepIndex, Math.max(0, steps.length - 1));
  const currentStep = steps[safeStepIndex] || steps[0];

  // 2. Compute Bellman-Ford step explanation for activeRoot
  const bfExplanation = useMemo(() => {
    return dvrEngine.explainRelaxation(activeRoot);
  }, [dvrEngine, activeRoot]);

  return (
    <div
      className="glass-panel modal-card"
      style={{
        width: '900px',
        maxWidth: '95vw',
        maxHeight: '92vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        padding: '24px',
        background: 'rgba(9, 14, 28, 0.97)',
        border: '1px solid var(--border-strong)',
        boxShadow: '0 24px 60px rgba(0, 0, 0, 0.85), 0 0 25px rgba(56, 189, 248, 0.15)',
        zIndex: 250,
      }}
    >
      {/* Header */}
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
              background:
                mode === 'DIJKSTRA'
                  ? 'linear-gradient(135deg, #0284c7, #38bdf8)'
                  : 'linear-gradient(135deg, #9333ea, #c084fc)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow:
                mode === 'DIJKSTRA'
                  ? '0 0 12px rgba(56, 189, 248, 0.4)'
                  : '0 0 12px rgba(147, 51, 234, 0.4)',
            }}
          >
            <BookOpen size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800 }}>
              Step-by-Step Algorithm Educational Inspector
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Mathematical execution walkthrough of Dijkstra SPF and Bellman-Ford relaxation
            </div>
          </div>
        </div>

        <button
          className="btn btn-secondary btn-icon"
          onClick={onClose}
          title="Close Inspector"
        >
          <X size={16} />
        </button>
      </div>

      {/* Mode Switcher & Root Selector Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        {/* Algorithm Tabs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(0, 0, 0, 0.5)',
            padding: '3px',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <button
            className={`btn ${mode === 'DIJKSTRA' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setMode('DIJKSTRA')}
            style={{
              fontSize: '11px',
              padding: '5px 14px',
              borderRadius: 'var(--radius-full)',
              height: 28,
            }}
          >
            <Sparkles size={13} /> Dijkstra SPF (Link State)
          </button>
          <button
            className={`btn ${mode === 'BELLMAN_FORD' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setMode('BELLMAN_FORD')}
            style={{
              fontSize: '11px',
              padding: '5px 14px',
              borderRadius: 'var(--radius-full)',
              height: 28,
              background: mode === 'BELLMAN_FORD' ? 'var(--accent-purple)' : undefined,
            }}
          >
            <Sigma size={13} /> Bellman-Ford Matrix (Distance Vector)
          </button>
        </div>

        {/* Root Node Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
            Root Router ($u$):
          </span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {allNodes.map((nodeId) => (
              <button
                key={nodeId}
                className={`btn ${activeRoot === nodeId ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => {
                  onSelectNode(nodeId);
                  setDijkstraStepIndex(0);
                }}
                style={{
                  fontSize: '11px',
                  padding: '3px 8px',
                  minWidth: 30,
                  height: 26,
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                }}
              >
                {nodeId}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. DIJKSTRA STEP-BY-STEP INSPECTOR VIEW                    */}
      {/* ========================================================= */}
      {mode === 'DIJKSTRA' && currentStep && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Stepper Toolbar */}
          <div
            className="glass-panel"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 16px',
              background: 'rgba(15, 23, 42, 0.65)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                className="btn btn-secondary btn-icon"
                onClick={() => setDijkstraStepIndex(0)}
                disabled={safeStepIndex === 0}
                title="First Step"
              >
                <RotateCcw size={14} />
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setDijkstraStepIndex((i) => Math.max(0, i - 1))}
                disabled={safeStepIndex === 0}
                style={{ fontSize: '11px', padding: '4px 10px' }}
              >
                <ChevronLeft size={14} /> Prev Step
              </button>
              <button
                className="btn btn-primary"
                onClick={() => setDijkstraStepIndex((i) => Math.min(steps.length - 1, i + 1))}
                disabled={safeStepIndex >= steps.length - 1}
                style={{ fontSize: '11px', padding: '4px 10px' }}
              >
                Next Step <ChevronRight size={14} />
              </button>
            </div>

            {/* Step Counter Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-active" style={{ fontSize: '11px', padding: '4px 10px' }}>
                Step {safeStepIndex} of {steps.length - 1}
              </span>
              {safeStepIndex === steps.length - 1 && (
                <span className="badge badge-converged" style={{ fontSize: '11px' }}>
                  <CheckCircle2 size={12} /> SPT Finalized
                </span>
              )}
            </div>
          </div>

          {/* Action Description Banner */}
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(2, 132, 199, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              lineHeight: 1.5,
            }}
          >
            <strong>Action:</strong> {currentStep.description}
          </div>

          {/* S vs Q Sets Visualizer */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {/* Finalized Set S */}
            <div
              className="glass-panel"
              style={{
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                  Visited / Finalized Set $S$
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {currentStep.visitedNodes.length} nodes
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {currentStep.visitedNodes.length === 0 ? (
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Set is empty</span>
                ) : (
                  currentStep.visitedNodes.map((n) => (
                    <div
                      key={n}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(16, 185, 129, 0.2)',
                        border: '1px solid var(--accent-emerald)',
                        color: 'var(--accent-emerald)',
                        fontSize: '11px',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <CheckCircle2 size={11} /> {n} (dist: {currentStep.tentativeDistances[n]})
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Candidate Frontier Set Q */}
            <div
              className="glass-panel"
              style={{
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-amber)' }}>
                  Unvisited Frontier Set $Q$
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {currentStep.unvisitedNodes.length} candidate(s)
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {currentStep.unvisitedNodes.length === 0 ? (
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>All nodes finalized!</span>
                ) : (
                  currentStep.unvisitedNodes.map((n) => {
                    const distVal = currentStep.tentativeDistances[n];
                    return (
                      <div
                        key={n}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(245, 158, 11, 0.15)',
                          border: '1px solid rgba(245, 158, 11, 0.5)',
                          color: 'var(--accent-amber)',
                          fontSize: '11px',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Clock size={11} /> {n}: {distVal === Infinity ? '\u221E' : distVal}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Tentative Distances & Predecessors Table */}
          <div
            style={{
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              overflow: 'hidden',
            }}
          >
            <table className="data-table" style={{ fontSize: '11px' }}>
              <thead>
                <tr>
                  <th>Destination Router ($v$)</th>
                  <th>Status</th>
                  <th>Tentative Distance $dist[v]$</th>
                  <th>Predecessor $prev[v]$</th>
                  <th>Active Path from Root {activeRoot}</th>
                </tr>
              </thead>
              <tbody>
                {allNodes.map((nodeId) => {
                  const isVisited = currentStep.visitedNodes.includes(nodeId);
                  const isCurrent = currentStep.currentNode === nodeId;
                  const distVal = currentStep.tentativeDistances[nodeId];
                  const prevVal = currentStep.predecessors[nodeId];

                  return (
                    <tr
                      key={nodeId}
                      style={{
                        background: isCurrent
                          ? 'rgba(56, 189, 248, 0.15)'
                          : isVisited
                          ? 'rgba(16, 185, 129, 0.05)'
                          : undefined,
                      }}
                    >
                      <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                        {nodeId} {nodeId === activeRoot ? '(Root)' : ''}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            isCurrent
                              ? 'badge-active'
                              : isVisited
                              ? 'badge-converged'
                              : 'badge-unstable'
                          }`}
                          style={{ fontSize: '10px' }}
                        >
                          {isCurrent ? 'Examining' : isVisited ? 'Finalized (S)' : 'Unvisited (Q)'}
                        </span>
                      </td>
                      <td
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          color:
                            distVal === 0
                              ? 'var(--accent-emerald)'
                              : distVal === Infinity
                              ? 'var(--text-muted)'
                              : 'var(--accent-cyan)',
                        }}
                      >
                        {distVal === Infinity ? '\u221E' : distVal}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>
                        {prevVal ?? '\u2014'}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                        {dijkstraResult.forwardingTable[nodeId]?.path?.join(' \u2192 ') || '\u2014'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. BELLMAN-FORD RELAXATION MATRIX VIEW                     */}
      {/* ========================================================= */}
      {mode === 'BELLMAN_FORD' && bfExplanation && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Mathematical Formula Card */}
          <div
            className="glass-panel"
            style={{
              padding: '14px 18px',
              background: 'rgba(147, 51, 234, 0.1)',
              border: '1px solid rgba(192, 132, 252, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={16} color="var(--accent-purple)" />
              <strong style={{ fontSize: '13px', color: 'var(--accent-purple)' }}>
                Bellman-Ford Distributed Equation
              </strong>
            </div>

            <div
              style={{
                fontSize: '15px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 800,
                color: '#ffffff',
                padding: '4px 0',
              }}
            >
              {`D_${activeRoot}(y) = min_{v \u2208 N(${activeRoot})} { c(${activeRoot}, v) + D_v(y) }`}
            </div>

            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              For router <strong>{activeRoot}</strong>, the shortest distance to destination <strong>$y$</strong> is computed by taking the minimum sum of link cost to direct operational neighbor <strong>$v$</strong> plus neighbor <strong>$v$</strong>'s reported distance to <strong>$y$</strong>.
            </div>
          </div>

          {/* Relaxation Matrix Table */}
          <div
            style={{
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              overflowX: 'auto',
            }}
          >
            <table className="data-table" style={{ fontSize: '11px' }}>
              <thead>
                <tr>
                  <th>Destination ($y$)</th>
                  <th>Previous Cost</th>
                  <th>Evaluations $c({activeRoot}, v) + D_v(y)$</th>
                  <th>Winning Neighbor ($v^*$)</th>
                  <th>Updated $D_{activeRoot}(y)$</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {bfExplanation.rows.map((row) => {
                  const isSelf = row.destination === activeRoot;
                  const isUnreachable = row.winningCost >= bfExplanation.infinityThreshold;

                  return (
                    <tr
                      key={row.destination}
                      style={{
                        background: row.hasImprovedOrChanged
                          ? 'rgba(147, 51, 234, 0.12)'
                          : undefined,
                      }}
                    >
                      <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                        {row.destination} {isSelf ? '(Self)' : ''}
                      </td>

                      <td style={{ fontFamily: 'var(--font-mono)' }}>
                        {row.previousCost >= bfExplanation.infinityThreshold
                          ? '\u221E'
                          : row.previousCost}{' '}
                        {row.previousNextHop ? `(via ${row.previousNextHop})` : ''}
                      </td>

                      <td>
                        {row.evaluations.length === 0 ? (
                          <span style={{ color: 'var(--text-muted)' }}>Direct loopback (cost 0)</span>
                        ) : (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {row.evaluations.map((ev) => (
                              <span
                                key={ev.neighborId}
                                style={{
                                  padding: '2px 6px',
                                  borderRadius: 'var(--radius-sm)',
                                  background: ev.isWinningNeighbor
                                    ? 'rgba(16, 185, 129, 0.2)'
                                    : 'rgba(255, 255, 255, 0.05)',
                                  border: `1px solid ${
                                    ev.isWinningNeighbor
                                      ? 'var(--accent-emerald)'
                                      : 'rgba(255, 255, 255, 0.1)'
                                  }`,
                                  color: ev.isWinningNeighbor
                                    ? 'var(--accent-emerald)'
                                    : 'var(--text-secondary)',
                                  fontFamily: 'var(--font-mono)',
                                  fontSize: '10px',
                                }}
                              >
                                v={ev.neighborId}: {ev.linkCost} +{' '}
                                {ev.neighborReportedDist >= bfExplanation.infinityThreshold
                                  ? '\u221E'
                                  : ev.neighborReportedDist}{' '}
                                = {ev.totalCost >= bfExplanation.infinityThreshold ? '\u221E' : ev.totalCost}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      <td>
                        {row.winningNeighbor ? (
                          <span
                            className="badge badge-converged"
                            style={{ fontSize: '10px', fontFamily: 'var(--font-mono)' }}
                          >
                            ★ {row.winningNeighbor}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>None</span>
                        )}
                      </td>

                      <td
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          color: isUnreachable
                            ? 'var(--accent-rose)'
                            : 'var(--accent-purple)',
                        }}
                      >
                        {isUnreachable ? `\u221E (${bfExplanation.infinityThreshold})` : row.winningCost}
                      </td>

                      <td>
                        <span
                          className={`badge ${
                            isSelf
                              ? 'badge-converged'
                              : row.hasImprovedOrChanged
                              ? 'badge-active'
                              : 'badge-converged'
                          }`}
                          style={{ fontSize: '10px' }}
                        >
                          {isSelf
                            ? 'Root (0)'
                            : row.hasImprovedOrChanged
                            ? 'Updated'
                            : 'Stable'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
