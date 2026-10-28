import React, { useState } from 'react';
import { ChaosEngine } from '../../core/chaos/ChaosEngine';
import { NetworkGraph } from '../../core/NetworkGraph';
import {
  Flame,
  Zap,
  Power,
  Activity,
  Repeat,
  X,
} from 'lucide-react';

interface ChaosPanelProps {
  chaosEngine: ChaosEngine;
  graph: NetworkGraph;
  currentTick: number;
  onClose: () => void;
  onMutation: () => void;
}

export const ChaosPanel: React.FC<ChaosPanelProps> = ({
  chaosEngine,
  graph,
  currentTick,
  onClose,
  onMutation,
}) => {
  const [config, setConfig] = useState(chaosEngine.getConfig());
  const [selectedEdgeId, setSelectedEdgeId] = useState<string>(
    graph.getEdges()[0]?.id || ''
  );
  const [flapInterval, setFlapInterval] = useState(2);

  const edges = graph.getEdges();
  const flappingLinks = chaosEngine.getFlappingLinks();
  const eventHistory = chaosEngine.getEventHistory();

  const handleSeverRandom = () => {
    chaosEngine.severRandomLink(currentTick);
    onMutation();
  };

  const handleCrashRandom = () => {
    chaosEngine.crashRandomRouter(currentTick);
    onMutation();
  };

  const handleJitter = () => {
    chaosEngine.applyMetricJitter(currentTick);
    onMutation();
  };

  const handleToggleFlap = () => {
    if (!selectedEdgeId) return;
    chaosEngine.toggleLinkFlap(selectedEdgeId, flapInterval, currentTick);
    onMutation();
  };

  const handleToggleAutomated = () => {
    const nextEnabled = !config.enabled;
    const nextConfig = { ...config, enabled: nextEnabled };
    chaosEngine.setConfig(nextConfig);
    setConfig(nextConfig);
  };

  return (
    <div
      className="glass-panel modal-card"
      style={{
        position: 'absolute',
        top: 68,
        left: 20,
        width: 380,
        maxHeight: 'calc(100vh - 120px)',
        zIndex: 140,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid rgba(244, 63, 94, 0.3)',
        overflow: 'hidden',
        animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 18px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(244, 63, 94, 0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, #f43f5e, #f97316)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--glow-rose)',
            }}
          >
            <Flame size={16} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Chaos Monkey & Faults
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
              Adverse Network Condition Injector
            </div>
          </div>
        </div>
        <button
          className="btn btn-secondary btn-icon"
          onClick={onClose}
          style={{ padding: '4px' }}
        >
          <X size={15} />
        </button>
      </div>

      {/* Body */}
      <div
        style={{
          padding: '16px 18px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* Instant 1-Click Fault Injections */}
        <div>
          <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px' }}>
            Instant Fault Triggers
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              className="btn btn-danger"
              style={{
                padding: '9px 12px',
                fontSize: '11px',
                fontWeight: 700,
                justifyContent: 'flex-start',
                borderRadius: 'var(--radius-sm)',
                boxShadow: '0 2px 8px rgba(244, 63, 94, 0.15)',
              }}
              onClick={handleSeverRandom}
            >
              <Zap size={14} color="var(--accent-rose)" /> Sever Link
            </button>
            <button
              className="btn btn-danger"
              style={{
                padding: '9px 12px',
                fontSize: '11px',
                fontWeight: 700,
                justifyContent: 'flex-start',
                borderRadius: 'var(--radius-sm)',
                boxShadow: '0 2px 8px rgba(244, 63, 94, 0.15)',
              }}
              onClick={handleCrashRandom}
            >
              <Power size={14} color="var(--accent-rose)" /> Crash Router
            </button>
            <button
              className="btn btn-secondary"
              style={{
                padding: '9px 12px',
                fontSize: '11px',
                fontWeight: 700,
                justifyContent: 'flex-start',
                gridColumn: 'span 2',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                background: 'rgba(56, 189, 248, 0.08)',
                color: 'var(--accent-cyan)',
              }}
              onClick={handleJitter}
            >
              <Activity size={14} color="var(--accent-cyan)" /> Jitter Link Metrics (&plusmn;3 Cost Perturbation)
            </button>
          </div>
        </div>

        <div style={{ height: 1, background: 'var(--border-subtle)' }} />

        {/* Link Flapping Generator */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Link Flap Generator
            </span>
            <span className="badge badge-flapping" style={{ fontSize: '10px' }}>
              Oscillator
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <select
              value={selectedEdgeId}
              onChange={(e) => setSelectedEdgeId(e.target.value)}
              style={{
                background: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-sm)',
                padding: '7px 10px',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                outline: 'none',
              }}
            >
              {edges.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.source} &harr; {e.target} (cost: {e.cost})
                </option>
              ))}
            </select>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Flap Interval: <strong style={{ color: 'var(--accent-amber)' }}>Every {flapInterval} Ticks</strong>
              </span>
              <input
                type="range"
                className="custom-slider custom-slider-amber"
                min="1"
                max="5"
                value={flapInterval}
                onChange={(e) => setFlapInterval(parseInt(e.target.value, 10))}
                style={{ width: 110 }}
              />
            </div>

            <button
              className={`btn ${
                selectedEdgeId && chaosEngine.isEdgeFlapping(selectedEdgeId)
                  ? 'btn-danger'
                  : 'btn-amber'
              }`}
              style={{
                width: '100%',
                padding: '9px',
                fontSize: '12px',
                fontWeight: 700,
                borderRadius: 'var(--radius-sm)',
              }}
              onClick={handleToggleFlap}
            >
              <Repeat size={14} />
              {selectedEdgeId && chaosEngine.isEdgeFlapping(selectedEdgeId)
                ? 'Stop Flapping Link'
                : 'Start Flapping Link'}
            </button>
          </div>

          {/* Active Flapping Links List */}
          {flappingLinks.length > 0 && (
            <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {flappingLinks.map((f) => (
                <span
                  key={f.edgeId}
                  className="badge badge-flapping"
                  style={{ cursor: 'pointer', boxShadow: '0 0 8px rgba(245, 158, 11, 0.3)' }}
                  onClick={() => {
                    chaosEngine.stopLinkFlap(f.edgeId, 'UP', currentTick);
                    onMutation();
                  }}
                  title="Click to Stop Flapping"
                >
                  {f.edgeId} (T={f.interval}) &times;
                </span>
              ))}
            </div>
          )}
        </div>

        <div style={{ height: 1, background: 'var(--border-subtle)' }} />

        {/* Automated Chaos Monkey Mode */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Automated Chaos Monkey
            </span>
            <button
              className={`btn ${config.enabled ? 'btn-danger' : 'btn-secondary'}`}
              style={{
                padding: '4px 10px',
                fontSize: '10px',
                fontWeight: 800,
                borderRadius: 'var(--radius-full)',
                boxShadow: config.enabled ? '0 0 10px rgba(244, 63, 94, 0.4)' : undefined,
              }}
              onClick={handleToggleAutomated}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: config.enabled ? 'var(--accent-rose)' : 'var(--text-muted)',
                  display: 'inline-block',
                }}
              />
              {config.enabled ? 'Active (ON)' : 'Disabled (OFF)'}
            </button>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            When enabled, randomly severs links and perturbs weights at each simulation tick.
          </p>
        </div>

        <div style={{ height: 1, background: 'var(--border-subtle)' }} />

        {/* Live Chaos Event Log */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Incident Feed ({eventHistory.length})
            </span>
            {eventHistory.length > 0 && (
              <button
                className="btn btn-secondary"
                style={{ padding: '2px 6px', fontSize: '10px' }}
                onClick={() => {
                  chaosEngine.clearEventHistory();
                  onMutation();
                }}
              >
                Clear
              </button>
            )}
          </div>

          <div
            style={{
              maxHeight: 140,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
            }}
          >
            {eventHistory.length === 0 ? (
              <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '6px 0' }}>
                No chaos incidents recorded yet.
              </span>
            ) : (
              eventHistory.slice(0, 10).map((ev) => (
                <div
                  key={ev.id}
                  style={{
                    padding: '4px 6px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(254, 239, 229, 0.65)',
                    borderLeft: `2px solid ${
                      ev.type.includes('SEVER') || ev.type.includes('CRASH')
                        ? 'var(--accent-rose)'
                        : 'var(--accent-amber)'
                    }`,
                    color: 'var(--text-primary)',
                  }}
                >
                  <span style={{ color: 'var(--accent-cyan)' }}>[T#{ev.tick}]</span>{' '}
                  {ev.description}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
