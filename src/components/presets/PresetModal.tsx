import React, { useState } from 'react';
import { BENCHMARK_PRESETS, generateRandomMesh } from '../../core/presets';
import { GraphSnapshot } from '../../core/types';
import { X, Sparkles, Shuffle, Check, ArrowRight } from 'lucide-react';

interface PresetModalProps {
  onSelectSnapshot: (snapshot: GraphSnapshot, presetName: string) => void;
  onClose: () => void;
}

export const PresetModal: React.FC<PresetModalProps> = ({
  onSelectSnapshot,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'benchmarks' | 'generator'>('benchmarks');
  const [nodeCount, setNodeCount] = useState(6);
  const [linkProbability, setLinkProbability] = useState(0.4);

  const handleGenerateMesh = () => {
    const snapshot = generateRandomMesh(nodeCount, linkProbability);
    onSelectSnapshot(snapshot, `Random Mesh (${nodeCount} Nodes, ${Math.round(linkProbability * 100)}% Connectivity)`);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="glass-panel modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 640,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px',
          gap: '20px',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Benchmark Topology Library
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Load standard academic topologies or generate custom connected mesh graphs.
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn btn-secondary btn-icon"
            style={{ padding: '6px' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            background: 'rgba(254, 239, 229, 0.75)',
            padding: '4px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <button
            className={`btn ${activeTab === 'benchmarks' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('benchmarks')}
            style={{ flex: 1, padding: '8px' }}
          >
            <Sparkles size={15} /> Standard Benchmarks
          </button>
          <button
            className={`btn ${activeTab === 'generator' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('generator')}
            style={{ flex: 1, padding: '8px' }}
          >
            <Shuffle size={15} /> Random Mesh Generator
          </button>
        </div>

        {/* Content Body */}
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {activeTab === 'benchmarks' ? (
            BENCHMARK_PRESETS.map((preset) => (
              <div
                key={preset.id}
                className="glass-panel"
                style={{
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  transition: 'border-color 0.2s',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  onSelectSnapshot(preset.generateSnapshot(), preset.name);
                  onClose();
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent-cyan)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                      {preset.name}
                    </strong>
                    {preset.badge && (
                      <span className="badge badge-up" style={{ fontSize: '10px' }}>
                        {preset.badge}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {preset.description}
                  </p>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                    {preset.tags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          fontSize: '10px',
                          color: 'var(--text-secondary)',
                          background: 'rgba(254, 226, 207, 0.65)',
                          padding: '2px 6px',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  className="btn btn-primary"
                  style={{ whiteSpace: 'nowrap', padding: '8px 14px' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectSnapshot(preset.generateSnapshot(), preset.name);
                    onClose();
                  }}
                >
                  Load <ArrowRight size={14} />
                </button>
              </div>
            ))
          ) : (
            /* Random Mesh Generator Tab */
            <div
              className="glass-panel"
              style={{
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Node Count ($N$):
                  </label>
                  <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', fontWeight: 700 }}>
                    {nodeCount} Routers
                  </span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="14"
                  value={nodeCount}
                  onChange={(e) => setNodeCount(parseInt(e.target.value, 10))}
                  style={{ width: '100%', accentColor: 'var(--accent-cyan)' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                  <span>3</span>
                  <span>8</span>
                  <span>14</span>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Link Density / Probability ($P$):
                  </label>
                  <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: 'var(--accent-emerald)', fontWeight: 700 }}>
                    {Math.round(linkProbability * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.9"
                  step="0.05"
                  value={linkProbability}
                  onChange={(e) => setLinkProbability(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent-emerald)' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                  <span>Sparse (10%)</span>
                  <span>Balanced (50%)</span>
                  <span>Dense Mesh (90%)</span>
                </div>
              </div>

              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '12px',
                  color: 'var(--accent-emerald)',
                }}
              >
                <Check size={16} />
                <span>
                  <strong>Guaranteed Connectivity</strong>: An underlying spanning tree is always enforced, preventing isolated partitions.
                </span>
              </div>

              <button
                className="btn btn-primary"
                onClick={handleGenerateMesh}
                style={{ width: '100%', padding: '12px' }}
              >
                <Shuffle size={16} /> Generate & Load Connected Mesh
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
