import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { NetworkGraph } from './core/NetworkGraph';
import { SimulationClock } from './core/SimulationClock';
import { StateLedger } from './core/StateLedger';
import { LinkStateEngine } from './core/lsr/LinkStateEngine';
import { DistanceVectorEngine } from './core/dvr/DistanceVectorEngine';
import { ChaosEngine } from './core/chaos/ChaosEngine';
import { PacketTracer } from './core/tracer/PacketTracer';
import { TopologyCanvas } from './components/canvas/TopologyCanvas';
import { PresetModal } from './components/presets/PresetModal';
import { RouterInspector, ProtocolMode } from './components/inspector/RouterInspector';
import { SimulationBar } from './components/toolbar/SimulationBar';
import { ChaosPanel } from './components/chaos/ChaosPanel';
import { PacketTracerBar } from './components/tracer/PacketTracerBar';
import { TimelineScrubber } from './components/timetravel/TimelineScrubber';
import { DualRaceView } from './components/race/DualRaceView';
import { createDiamondMultiPath } from './core/presets';
import { GraphSnapshot, NodeId, StateSnapshot } from './core/types';
import {
  Network,
  RotateCcw,
  Sparkles,
  HelpCircle,
  Layers,
  Flame,
  Columns,
  Monitor,
} from 'lucide-react';

export const App: React.FC = () => {
  // 1. Core Graph
  const graph = useMemo(() => {
    return new NetworkGraph(createDiamondMultiPath());
  }, []);

  // 2. Engines & Simulation Clock & State Ledger
  const clock = useMemo(() => new SimulationClock(0, 1000), []);
  const ledger = useMemo(() => new StateLedger(), []);
  const lsrEngine = useMemo(() => new LinkStateEngine(graph), [graph]);
  const dvrEngine = useMemo(() => new DistanceVectorEngine(graph), [graph]);
  const chaosEngine = useMemo(() => new ChaosEngine(graph), [graph]);

  const [currentTick, setCurrentTick] = useState(0);
  const [maxTick, setMaxTick] = useState(0);
  const [protocolMode, setProtocolMode] = useState<ProtocolMode>('LSR');
  const [selectedNodeId, setSelectedNodeId] = useState<NodeId | null>('A');
  const [viewLayout, setViewLayout] = useState<'single' | 'race'>('single');
  const [showHelp, setShowHelp] = useState(false);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [showChaosPanel, setShowChaosPanel] = useState(false);
  const [activePresetName, setActivePresetName] = useState('Diamond Multi-Path');

  const packetTracer = useMemo(() => {
    return new PacketTracer(graph, (nodeId) => {
      return protocolMode === 'LSR'
        ? lsrEngine.getRoutingTable(nodeId)
        : dvrEngine.getRoutingTable(nodeId);
    });
  }, [graph, protocolMode, lsrEngine, dvrEngine]);

  // Keep routing provider synchronized
  useEffect(() => {
    packetTracer.setRoutingTableProvider((nodeId) => {
      return protocolMode === 'LSR'
        ? lsrEngine.getRoutingTable(nodeId)
        : dvrEngine.getRoutingTable(nodeId);
    });
  }, [packetTracer, protocolMode, lsrEngine, dvrEngine]);

  // Capture current state snapshot into StateLedger
  const captureSnapshot = useCallback(
    (tick: number, eventDesc?: string, isMarker = false) => {
      const activeTables =
        protocolMode === 'LSR'
          ? lsrEngine.getAllRoutingTables()
          : dvrEngine.getAllRoutingTables();

      const snapshot: StateSnapshot = {
        tick,
        timestamp: Date.now(),
        graph: graph.exportSnapshot(),
        routingTables: activeTables,
        eventDescription: eventDesc,
        isEventMarker: isMarker,
        activePacketsCount: packetTracer.getActivePackets().length,
        metadata: {
          lsrState: lsrEngine.exportState(),
          dvrState: dvrEngine.exportState(),
          tracerState: packetTracer.exportState(),
        },
      };

      ledger.recordSnapshot(snapshot);
      setMaxTick(ledger.getMaxTick());
    },
    [protocolMode, lsrEngine, dvrEngine, graph, packetTracer, ledger]
  );

  // Restore state from a historical snapshot
  const restoreSnapshotAtTick = useCallback(
    (tick: number) => {
      const snap = ledger.getSnapshot(tick);
      if (!snap) return;

      clock.pause();
      graph.importSnapshot(snap.graph);

      if (snap.metadata?.lsrState) {
        lsrEngine.restoreState(snap.metadata.lsrState as any);
      }
      if (snap.metadata?.dvrState) {
        dvrEngine.restoreState(snap.metadata.dvrState as any);
      }
      if (snap.metadata?.tracerState) {
        packetTracer.restoreState(snap.metadata.tracerState as any);
      }

      clock.setTick(tick);
      setCurrentTick(tick);
    },
    [ledger, clock, graph, lsrEngine, dvrEngine, packetTracer]
  );

  // Single tick step logic
  const handleStepTick = useCallback(() => {
    const nextTick = clock.step();
    setCurrentTick(nextTick);

    graph.handleTickFlapping();
    const chaosEvents = chaosEngine.stepTick(nextTick);
    lsrEngine.stepTick(nextTick);
    dvrEngine.stepTick(nextTick);
    packetTracer.stepTick(nextTick);

    const eventDesc = chaosEvents[0]?.description;
    captureSnapshot(nextTick, eventDesc, chaosEvents.length > 0);
  }, [clock, graph, chaosEngine, lsrEngine, dvrEngine, packetTracer, captureSnapshot]);

  // Step backward (-1 tick)
  const handleStepBackward = useCallback(() => {
    if (currentTick <= 0) return;
    const targetTick = currentTick - 1;
    restoreSnapshotAtTick(targetTick);
  }, [currentTick, restoreSnapshotAtTick]);

  // Step forward (+1 tick)
  const handleStepForward = useCallback(() => {
    if (currentTick < maxTick) {
      restoreSnapshotAtTick(currentTick + 1);
    } else {
      handleStepTick();
    }
  }, [currentTick, maxTick, restoreSnapshotAtTick, handleStepTick]);

  // Hook clock onTick event
  useEffect(() => {
    return clock.onTick((tick) => {
      setCurrentTick(tick);
      graph.handleTickFlapping();
      const chaosEvents = chaosEngine.stepTick(tick);
      lsrEngine.stepTick(tick);
      dvrEngine.stepTick(tick);
      packetTracer.stepTick(tick);

      const eventDesc = chaosEvents[0]?.description;
      captureSnapshot(tick, eventDesc, chaosEvents.length > 0);
    });
  }, [clock, graph, chaosEngine, lsrEngine, dvrEngine, packetTracer, captureSnapshot]);

  // Initialize protocol engines & record initial snapshot at tick 0 on mount
  useEffect(() => {
    lsrEngine.originateAll(0);
    dvrEngine.advertiseAll(0);
    captureSnapshot(0, 'Simulation Initialized', true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Preset loading handler
  const handleLoadSnapshot = (snapshot: GraphSnapshot, presetName: string) => {
    graph.importSnapshot(snapshot);
    setActivePresetName(presetName);
    clock.reset();
    ledger.reset();
    setCurrentTick(0);
    setMaxTick(0);

    lsrEngine.reset();
    dvrEngine.reset();
    chaosEngine.reset();
    packetTracer.clearHistory();

    lsrEngine.originateAll(0);
    dvrEngine.advertiseAll(0);

    captureSnapshot(0, `Preset Loaded: ${presetName}`, true);

    if (snapshot.nodes.length > 0) {
      setSelectedNodeId(snapshot.nodes[0].id);
    } else {
      setSelectedNodeId(null);
    }
  };

  // Full reset simulation handler
  const handleResetSimulation = () => {
    clock.reset();
    ledger.reset();
    setCurrentTick(0);
    setMaxTick(0);

    lsrEngine.reset();
    dvrEngine.reset();
    chaosEngine.reset();
    packetTracer.clearHistory();

    lsrEngine.originateAll(0);
    dvrEngine.advertiseAll(0);

    captureSnapshot(0, 'Simulation Reset', true);
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

        {/* Center: View Mode Segment Switch & Preset Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Segmented Layout Toggle: Single vs Dual Race */}
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
              className={`btn ${viewLayout === 'single' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewLayout('single')}
              style={{
                fontSize: '11px',
                padding: '4px 12px',
                borderRadius: 'var(--radius-full)',
                height: 28,
              }}
            >
              <Monitor size={13} /> Single View
            </button>
            <button
              className={`btn ${viewLayout === 'race' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewLayout('race')}
              style={{
                fontSize: '11px',
                padding: '4px 12px',
                borderRadius: 'var(--radius-full)',
                height: 28,
                background: viewLayout === 'race' ? 'linear-gradient(135deg, #0284c7, #9333ea)' : undefined,
                boxShadow: viewLayout === 'race' ? '0 0 10px rgba(147, 51, 234, 0.4)' : undefined,
              }}
            >
              <Columns size={13} /> Dual Race Mode
            </button>
          </div>

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
              Phase 4
            </span>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className={`btn ${showChaosPanel ? 'btn-danger' : 'btn-secondary'}`}
            onClick={() => setShowChaosPanel(!showChaosPanel)}
            style={{ fontSize: '12px', padding: '6px 12px' }}
            title="Toggle Chaos Monkey & Fault Injector"
          >
            <Flame size={14} color={showChaosPanel ? '#fff' : 'var(--accent-rose)'} /> Chaos Monkey
          </button>

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
        {viewLayout === 'single' ? (
          <>
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
              activeTracePackets={packetTracer.getActivePackets()}
              inFlightLSPs={protocolMode === 'LSR' ? lsrEngine.getInFlightPackets() : []}
              inFlightDVMessages={protocolMode === 'DVR' ? dvrEngine.getInFlightMessages() : []}
              canvasTheme={protocolMode === 'LSR' ? 'lsr' : 'dvr'}
            />

            {/* Live Packet Tracer Control Bar */}
            <PacketTracerBar
              packetTracer={packetTracer}
              graph={graph}
              currentTick={currentTick}
              onSendPing={handleStepTick}
            />
          </>
        ) : (
          <DualRaceView
            graph={graph}
            lsrEngine={lsrEngine}
            dvrEngine={dvrEngine}
            currentTick={currentTick}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
            onStepTick={handleStepTick}
          />
        )}

        {/* Deterministic Time-Travel Scrubber */}
        <TimelineScrubber
          clock={clock}
          currentTick={currentTick}
          maxTick={maxTick}
          history={ledger.getHistory()}
          onScrubToTick={restoreSnapshotAtTick}
          onStepForward={handleStepForward}
          onStepBackward={handleStepBackward}
          onReset={handleResetSimulation}
        />

        {/* Chaos Panel */}
        {showChaosPanel && (
          <ChaosPanel
            chaosEngine={chaosEngine}
            graph={graph}
            currentTick={currentTick}
            onClose={() => setShowChaosPanel(false)}
            onMutation={handleStepTick}
          />
        )}

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
              <strong style={{ fontSize: '13px' }}>Simulation Guide</strong>
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
                <strong>Time-Travel Scrubber</strong>: Scrub backward to any historical tick to pinpoint sub-optimal routes or loops.
              </li>
              <li>
                <strong>Packet Tracer</strong>: Send a ping from S to D and watch the glowing packet traverse hop-by-hop.
              </li>
              <li>
                <strong>Chaos Monkey</strong>: Inject link severances, router crashes, or oscillating link flapping.
              </li>
              <li>
                <strong>Inspect Router</strong>: Click any router glyph to open its active FIB, LSDB, or Distance Vector matrix.
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
