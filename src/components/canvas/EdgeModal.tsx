import React, { useState } from 'react';
import { NetworkEdge } from '../../core/types';
import { Activity, Trash2, X, Check } from 'lucide-react';

interface EdgeModalProps {
  edge: NetworkEdge;
  onClose: () => void;
  onUpdateCost: (edgeId: string, cost: number) => void;
  onToggleStatus: (edgeId: string) => void;
  onDelete: (edgeId: string) => void;
}

export const EdgeModal: React.FC<EdgeModalProps> = ({
  edge,
  onClose,
  onUpdateCost,
  onToggleStatus,
  onDelete,
}) => {
  const [costInput, setCostInput] = useState(edge.cost.toString());

  const handleSaveCost = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(costInput, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      onUpdateCost(edge.id, parsed);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="glass-panel modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 320,
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '14px',
                fontWeight: 700,
                color: 'var(--text-primary)',
              }}
            >
              Link Properties
            </span>
            <span className={`badge badge-${edge.status.toLowerCase()}`}>
              {edge.status}
            </span>
          </div>
          <button
            onClick={onClose}
            className="btn btn-secondary btn-icon"
            style={{ padding: '4px' }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          Endpoints: <strong style={{ color: 'var(--accent-cyan)' }}>{edge.source}</strong> &harr;{' '}
          <strong style={{ color: 'var(--accent-cyan)' }}>{edge.target}</strong>
        </div>

        {/* Cost input form */}
        <form onSubmit={handleSaveCost} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Link Metric (Cost / Weight):
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="number"
              min="0"
              max="999"
              value={costInput}
              onChange={(e) => setCostInput(e.target.value)}
              autoFocus
              style={{
                flex: 1,
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 12px',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '14px',
                outline: 'none',
              }}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '8px 12px' }}>
              <Check size={16} /> Save
            </button>
          </div>
        </form>

        <div style={{ height: 1, background: 'var(--border-subtle)' }} />

        {/* Action buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            type="button"
            className={`btn ${edge.status === 'UP' ? 'btn-secondary' : 'btn-accent'}`}
            onClick={() => onToggleStatus(edge.id)}
            style={{ justifyContent: 'flex-start' }}
          >
            <Activity size={16} />
            {edge.status === 'UP' ? 'Sever Link (Set DOWN)' : 'Restore Link (Set UP)'}
          </button>

          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              onDelete(edge.id);
              onClose();
            }}
            style={{ justifyContent: 'flex-start' }}
          >
            <Trash2 size={16} />
            Delete Link
          </button>
        </div>
      </div>
    </div>
  );
};
