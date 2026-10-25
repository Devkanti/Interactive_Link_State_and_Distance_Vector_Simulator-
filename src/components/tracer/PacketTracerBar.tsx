import React, { useState } from 'react';
import { PacketTracer } from '../../core/tracer/PacketTracer';
import { NetworkGraph } from '../../core/NetworkGraph';
import { NodeId } from '../../core/types';
import {
  Send,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Radio,
  ArrowRight,
} from 'lucide-react';

interface PacketTracerBarProps {
  packetTracer: PacketTracer;
  graph: NetworkGraph;
  currentTick: number;
  onSendPing: () => void;
}

export const PacketTracerBar: React.FC<PacketTracerBarProps> = ({
  packetTracer,
  graph,
  currentTick,
  onSendPing,
}) => {
  const nodes = graph.getNodes();
  const [sourceId, setSourceId] = useState<NodeId>(nodes[0]?.id || 'A');
  const [destId, setDestId] = useState<NodeId>(nodes[nodes.length - 1]?.id || 'D');
  const [ttl, setTtl] = useState(15);

  const activePackets = packetTracer.getActivePackets();
  const completedPackets = packetTracer.getCompletedPackets();
  const latestFinished = completedPackets[0];

  const handleSend = () => {
    if (!sourceId || !destId) return;
    packetTracer.sendPing(sourceId, destId, ttl, 'ICMP Echo Request', currentTick);
    onSendPing();
  };

  return (
    <div
      className="glass-panel"
      style={{
        position: 'absolute',
        bottom: 84,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 110,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '10px 16px',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--border-accent)',
        maxWidth: 680,
      }}
    >
      {/* Top Controls Row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Radio size={16} color="var(--accent-cyan)" />
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Packet Tracer:
          </span>
        </div>

        {/* Source selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Src:</span>
          <select
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-sm)',
              padding: '4px 8px',
              color: 'var(--accent-cyan)',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              fontWeight: 700,
              outline: 'none',
            }}
          >
            {nodes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.label}
              </option>
            ))}
          </select>
        </div>

        <ArrowRight size={14} color="var(--text-muted)" />

        {/* Dest selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Dest:</span>
          <select
            value={destId}
            onChange={(e) => setDestId(e.target.value)}
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-sm)',
              padding: '4px 8px',
              color: 'var(--accent-emerald)',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              fontWeight: 700,
              outline: 'none',
            }}
          >
            {nodes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.label}
              </option>
            ))}
          </select>
        </div>

        {/* TTL input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>TTL:</span>
          <input
            type="number"
            min="1"
            max="64"
            value={ttl}
            onChange={(e) => setTtl(parseInt(e.target.value, 10) || 15)}
            style={{
              width: 48,
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-sm)',
              padding: '4px 6px',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              textAlign: 'center',
              outline: 'none',
            }}
          />
        </div>

        {/* Dispatch button */}
        <button
          className="btn btn-primary"
          style={{ padding: '6px 14px', fontSize: '12px' }}
          onClick={handleSend}
        >
          <Send size={14} /> Send Ping
        </button>
      </div>

      {/* Live Status / Alerts Row */}
      {activePackets.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 10px',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--accent-cyan)',
              boxShadow: 'var(--glow-cyan)',
              animation: 'pulse 1s infinite alternate',
            }}
          />
          <span>
            In-Flight Ping to <strong>{activePackets[0].destId}</strong> | At Hop:{' '}
            <strong>{activePackets[0].currentHop}</strong> | TTL:{' '}
            <strong style={{ color: 'var(--accent-cyan)' }}>{activePackets[0].ttl}</strong> (Hops:{' '}
            {activePackets[0].totalHops})
          </span>

          {activePackets[0].cycleDetected && (
            <span
              style={{
                marginLeft: 'auto',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                color: 'var(--accent-amber)',
                fontWeight: 700,
              }}
            >
              <AlertTriangle size={13} /> Loop: {activePackets[0].cycleNodes?.join(' \u2192 ')}
            </span>
          )}
        </div>
      )}

      {/* Finished Result Badge (if no active packet) */}
      {activePackets.length === 0 && latestFinished && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background:
              latestFinished.status === 'DELIVERED'
                ? 'rgba(16, 185, 129, 0.1)'
                : 'rgba(244, 63, 94, 0.12)',
            border: `1px solid ${
              latestFinished.status === 'DELIVERED'
                ? 'rgba(16, 185, 129, 0.3)'
                : 'rgba(244, 63, 94, 0.3)'
            }`,
            borderRadius: 'var(--radius-sm)',
            padding: '5px 10px',
            fontSize: '11px',
          }}
        >
          {latestFinished.status === 'DELIVERED' ? (
            <>
              <CheckCircle2 size={14} color="var(--accent-emerald)" />
              <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>
                Ping Delivered! Reached {latestFinished.destId} in {latestFinished.totalHops} hops
                (TTL left: {latestFinished.ttl})
              </span>
            </>
          ) : (
            <>
              <Flame size={14} color="var(--accent-rose)" />
              <span style={{ color: 'var(--accent-rose)', fontWeight: 600 }}>
                {latestFinished.dropReason || 'Packet Dropped'}
              </span>
              {latestFinished.cycleDetected && (
                <span style={{ color: 'var(--accent-amber)', fontSize: '10px' }}>
                  (Cycled: {latestFinished.cycleNodes?.join(' \u2192 ')})
                </span>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
