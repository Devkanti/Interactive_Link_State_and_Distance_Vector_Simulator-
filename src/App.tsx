import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { NetworkGraph } from './core/NetworkGraph';
import { SimulationClock } from './core/SimulationClock';
import { LinkStateEngine } from './core/lsr/LinkStateEngine';
import { DistanceVectorEngine } from './core/dvr/DistanceVectorEngine';
import { TopologyCanvas } from './components/canvas/TopologyCanvas';
import { PresetModal } from './components/presets/PresetModal';
import { RouterInspector, ProtocolMode } from './components/inspector/RouterInspector';
import { SimulationBar } from './components/toolbar/SimulationBar';
import { createDiamondMultiPath } from './core/presets';
import { GraphSnapshot, NodeId } from './core/types';
import {
  Network,
  RotateCcw,
  Sparkles,
  HelpCircle,
  Layers,
} from 'lucide-react';

export const App: React.FC = () => {
  // 1. Core Graph
  const graph = useMemo(() => {
    return new NetworkGraph(createDiamondMultiPath());
  }, []);

  // 2. Engines & Simulation Clock
  const clock = useMemo(() => new SimulationClock(0, 1000), []);
  const lsrEngine = useMemo(() => new LinkStateEngine(graph), [graph]);
  const dvrEngine = useMemo(() => new DistanceVectorEngine(graph), [graph]);

  const [currentTick, setCurrentTick] = useState(0);
  const [protocolMode, setProtocolMode] = useState<ProtocolMode>('LSR');
  const [selectedNodeId, setSelectedNodeId] = useState<NodeId | null>('A');
  const [showHelp, setShowHelp] = useState(false);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [activePresetName, setActivePresetName] = useState('Diamond Multi-Path');

  // Single tick step logic
  const handleStepTick = useCallback(() => {
    const nextTick = clock.step();
    setCurrentTick(nextTick);
    graph.handleTickFlapping();
    lsrEngine.stepTick(nextTick);
    dvrEngine.stepTick(nextTick);
  }, [clock, graph, lsrEngine, dvrEngine]);

  // Hook clock onTick event
  useEffect(() => {
    return clock.onTick((tick) => {
      setCurrentTick(tick);
      graph.handleTickFlapping();
      lsrEngine.stepTick(tick);
      dvrEngine.stepTick(tick);
    });
  }, [clock, graph, lsrEngine, dvrEngine]);

  // Initialize protocol engines on mount
  useEffect(() => {
    lsrEngine.originateAll(0);
    dvrEngine.advertiseAll(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Preset loading handler
  const handleLoadSnapshot = (snapshot: GraphSnapshot, presetName: string) => {
    graph.importSnapshot(snapshot);
    setActivePresetName(presetName);
    clock.reset();
    setCurrentTick(0);

    lsrEngine.reset();
    dvrEngine.reset();
    lsrEngine.originateAll(0);
    dvrEngine.advertiseAll(0);

    if (snapshot.nodes.length > 0) {
      setSelectedNodeId(snapshot.nodes[0].id);
    } else {
      setSelectedNodeId(null);
    }
  };

  // Full reset simulation handler
  const handleResetSimulation = () => {
    clock.reset();
    setCurrentTick(0);
    lsrEngine.reset();
    dvrEngine.reset();
    lsrEngine.originateAll(0);
    dvrEngine.advertiseAll(0);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navbar */}
      <header
        className="glass-panel"
        style={{
          height: 56,
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: 0,
          borderLeft: 'none',
          borderRight: 'none',
          borderTop: 'none',
          zIndex: 50,
        }}
      >
        {/* Brand / Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, #0284c7, #6366f1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--glow-cyan)',
            }}
          >
            <Network size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '-0.3px' }}>
              Routing<span style={{ color: 'var(--accent-cyan)' }}>Simulator</span>
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '-2px' }}>
              Interactive LSR & DVR Convergence Platform
            </div>
          </div>
        </div>

        {/* Center Preset Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(0, 0, 0, 0.4)',
            padding: '5px 12px',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--accent-cyan)',
              boxShadow: 'var(--glow-cyan)',
            }}
          />
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Topology: {activePresetName}
          </span>
          <span className="badge badge-active" style={{ fontSize: '10px' }}>
            Phase 2
          </span>
        </div>

        {/* Right Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="btn btn-primary"
            onClick={() => setShowPresetModal(true)}
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            <Layers size={14} /> Presets & Mesh
          </button>

          <button
            className="btn btn-secondary btn-icon"
            onClick={() => setShowHelp(!showHelp)}
            title="Canvas Controls Help"
          >
            <HelpCircle size={16} />
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => handleLoadSnapshot(createDiamondMultiPath(), 'Diamond Multi-Path')}
            style={{ fontSize: '12px' }}
          >
            <RotateCcw size={14} /> Reset
          </button>
        </div>
      </header>

      {/* Main Canvas & Inspector Area */}
      <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* Simulation Bar */}
        <SimulationBar
          clock={clock}
          lsrEngine={lsrEngine}
          dvrEngine={dvrEngine}
          mode={protocolMode}
          onModeChange={setProtocolMode}
          onStep={handleStepTick}
          onReset={handleResetSimulation}
          currentTick={currentTick}
        />

        {/* Interactive Topology Canvas */}
        <TopologyCanvas
          graph={graph}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
        />

        {/* Live Router Inspector Drawer */}
        {selectedNodeId && (
          <RouterInspector
            nodeId={selectedNodeId}
            graph={graph}
            lsrEngine={lsrEngine}
            dvrEngine={dvrEngine}
            mode={protocolMode}
            onModeChange={setProtocolMode}
            onClose={() => setSelectedNodeId(null)}
            currentTick={currentTick}
          />
        )}

        {/* Quick Help Popover */}
        {showHelp && (
          <div
            className="glass-panel modal-card"
            style={{
              position: 'absolute',
              top: 16,
              left: 480,
              width: 320,
              padding: '16px',
              zIndex: 200,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <Sparkles size={16} color="var(--accent-cyan)" />
              <strong style={{ fontSize: '13px' }}>Canvas Interaction Guide</strong>
            </div>
            <ul
              style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                paddingLeft: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <li>
                <strong>Inspect Router</strong>: Click any router glyph to open its live Routing Table, LSDB database, and Distance Vector matrix.
              </li>
              <li>
                <strong>Move Nodes</strong>: Click and drag any router to reposition. Incident links re-anchor automatically.
              </li>
              <li>
                <strong>Connect Routers</strong>: Click the <em>Link Mode</em> button in the bottom toolbar, then click a source router and drag to target.
              </li>
              <li>
                <strong>Edit Metric (Cost)</strong>: Click on any link's center weight badge to change its value.
              </li>
              <li>
                <strong>Context Menu</strong>: Right-click any router or link to crash, sever, delete, or configure.
              </li>
            </ul>
          </div>
        )}

        {/* Preset Selector Modal */}
        {showPresetModal && (
          <PresetModal
            onSelectSnapshot={handleLoadSnapshot}
            onClose={() => setShowPresetModal(false)}
          />
        )}
      </main>
    </div>
  );
};

export default App;
