import React, { useState, useMemo } from 'react';
import { ScoreboardTickData } from '../../core/analytics/types';
import { Layers } from 'lucide-react';

interface ConvergenceChartProps {
  history: ScoreboardTickData[];
  height?: number;
}

type ChartMetric = 'cumulative' | 'delta' | 'memory';

export const ConvergenceChart: React.FC<ConvergenceChartProps> = ({
  history,
  height = 200,
}) => {
  const [metric, setMetric] = useState<ChartMetric>('cumulative');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const padding = { top: 20, right: 24, bottom: 28, left: 50 };
  const width = 640;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  // Compute max values for Y scaling
  const chartData = useMemo(() => {
    if (history.length === 0) return { points: [], maxY: 10, minTick: 0, maxTick: 1 };

    const minTick = history[0].tick;
    const maxTick = Math.max(minTick + 1, history[history.length - 1].tick);

    let maxY = 10;
    if (metric === 'cumulative') {
      maxY = Math.max(
        ...history.map((d) => Math.max(d.lsrMessagesCumulative, d.dvrMessagesCumulative)),
        5
      );
    } else if (metric === 'delta') {
      maxY = Math.max(
        ...history.map((d) => Math.max(d.lsrMessagesDelta, d.dvrMessagesDelta)),
        2
      );
    } else if (metric === 'memory') {
      maxY = Math.max(
        ...history.map((d) => Math.max(d.lsrMemoryBytes, d.dvrMemoryBytes)),
        100
      );
    }

    // Add 10% breathing room to max Y
    maxY = Math.ceil(maxY * 1.15);

    const points = history.map((d, index) => {
      const xProgress = maxTick === minTick ? 0.5 : (d.tick - minTick) / (maxTick - minTick);
      const x = padding.left + xProgress * innerWidth;

      let lsrVal = d.lsrMessagesCumulative;
      let dvrVal = d.dvrMessagesCumulative;
      if (metric === 'delta') {
        lsrVal = d.lsrMessagesDelta;
        dvrVal = d.dvrMessagesDelta;
      } else if (metric === 'memory') {
        lsrVal = d.lsrMemoryBytes;
        dvrVal = d.dvrMemoryBytes;
      }

      const yLsr = padding.top + innerHeight - (lsrVal / maxY) * innerHeight;
      const yDvr = padding.top + innerHeight - (dvrVal / maxY) * innerHeight;

      return {
        ...d,
        index,
        x,
        yLsr,
        yDvr,
        lsrVal,
        dvrVal,
      };
    });

    return { points, maxY, minTick, maxTick };
  }, [history, metric, innerWidth, innerHeight, padding.left, padding.top]);

  // Construct SVG paths
  const lsrPath = useMemo(() => {
    if (chartData.points.length === 0) return '';
    return chartData.points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.yLsr.toFixed(1)}`)
      .join(' ');
  }, [chartData.points]);

  const dvrPath = useMemo(() => {
    if (chartData.points.length === 0) return '';
    return chartData.points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.yDvr.toFixed(1)}`)
      .join(' ');
  }, [chartData.points]);

  const lsrAreaPath = useMemo(() => {
    if (chartData.points.length === 0) return '';
    const base = padding.top + innerHeight;
    const firstX = chartData.points[0].x;
    const lastX = chartData.points[chartData.points.length - 1].x;
    return `${lsrPath} L ${lastX.toFixed(1)} ${base} L ${firstX.toFixed(1)} ${base} Z`;
  }, [chartData.points, lsrPath, padding.top, innerHeight]);

  const dvrAreaPath = useMemo(() => {
    if (chartData.points.length === 0) return '';
    const base = padding.top + innerHeight;
    const firstX = chartData.points[0].x;
    const lastX = chartData.points[chartData.points.length - 1].x;
    return `${dvrPath} L ${lastX.toFixed(1)} ${base} L ${firstX.toFixed(1)} ${base} Z`;
  }, [chartData.points, dvrPath, padding.top, innerHeight]);

  const hoveredPoint =
    hoveredIndex !== null && hoveredIndex >= 0 && hoveredIndex < chartData.points.length
      ? chartData.points[hoveredIndex]
      : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
      {/* Metric Mode Toggle Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={14} color="var(--accent-cyan)" />
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Real-Time Convergence & Overhead Comparison
          </span>
        </div>

        {/* Metric Mode Switch */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(0, 0, 0, 0.5)',
            padding: '3px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            gap: '2px',
          }}
        >
          <button
            className={`btn ${metric === 'cumulative' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setMetric('cumulative')}
            style={{ fontSize: '10px', padding: '3px 10px', height: 24, borderRadius: 'var(--radius-sm)' }}
          >
            Cumulative Packets
          </button>
          <button
            className={`btn ${metric === 'delta' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setMetric('delta')}
            style={{ fontSize: '10px', padding: '3px 10px', height: 24, borderRadius: 'var(--radius-sm)' }}
          >
            Packets / Tick
          </button>
          <button
            className={`btn ${metric === 'memory' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setMetric('memory')}
            style={{ fontSize: '10px', padding: '3px 10px', height: 24, borderRadius: 'var(--radius-sm)' }}
          >
            Memory (Bytes)
          </button>
        </div>
      </div>

      {/* SVG Chart Container */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          background: 'rgba(254, 239, 229, 0.75)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-strong)',
          overflow: 'hidden',
          boxShadow: 'inset 0 0 16px rgba(92, 50, 20, 0.05)',
        }}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: 'auto', display: 'block' }}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <defs>
            <linearGradient id="lsrAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B8BEB" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#3B8BEB" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="dvrAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E87A50" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#E87A50" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const y = padding.top + innerHeight * (1 - pct);
            const val = Math.round(chartData.maxY * pct);
            return (
              <g key={pct}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="rgba(220, 165, 135, 0.3)"
                  strokeDasharray="4 4"
                />
                <text
                  x={padding.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  fill="var(--text-muted)"
                  fontSize="9"
                  fontFamily="var(--font-mono)"
                >
                  {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                </text>
              </g>
            );
          })}

          {/* Subtle Event markers (disruptions/link severs) - skip initial tick 0 clutter */}
          {chartData.points.map((p) => {
            if (!p.eventDescription || p.tick === 0) return null;
            return (
              <g key={`event-${p.tick}`}>
                <line
                  x1={p.x}
                  y1={padding.top}
                  x2={p.x}
                  y2={padding.top + innerHeight}
                  stroke="var(--accent-rose)"
                  strokeWidth="1.2"
                  strokeDasharray="3 3"
                  opacity="0.5"
                />
                <circle cx={p.x} cy={padding.top + 4} r="3" fill="var(--accent-rose)" />
              </g>
            );
          })}

          {/* Area Fills */}
          {lsrAreaPath && (
            <path d={lsrAreaPath} fill="url(#lsrAreaGrad)" />
          )}
          {dvrAreaPath && (
            <path d={dvrAreaPath} fill="url(#dvrAreaGrad)" />
          )}

          {/* LSR Series Line (Cyan) */}
          {lsrPath && (
            <path
              d={lsrPath}
              fill="none"
              stroke="var(--accent-cyan)"
              strokeWidth="2.5"
              style={{ filter: 'drop-shadow(0 0 6px rgba(56, 189, 248, 0.5))' }}
            />
          )}

          {/* DVR Series Line (Purple) */}
          {dvrPath && (
            <path
              d={dvrPath}
              fill="none"
              stroke="var(--accent-purple)"
              strokeWidth="2.5"
              style={{ filter: 'drop-shadow(0 0 6px rgba(192, 132, 252, 0.5))' }}
            />
          )}

          {/* Data Points Glowing Nodes */}
          {chartData.points.map((p) => (
            <g key={`dots-${p.tick}`}>
              <circle
                cx={p.x}
                cy={p.yLsr}
                r="3.5"
                fill="var(--accent-cyan)"
                stroke="#090e1c"
                strokeWidth="1.5"
                style={{ filter: 'drop-shadow(0 0 4px rgba(56, 189, 248, 0.8))' }}
              />
              <circle
                cx={p.x}
                cy={p.yDvr}
                r="3.5"
                fill="var(--accent-purple)"
                stroke="#090e1c"
                strokeWidth="1.5"
                style={{ filter: 'drop-shadow(0 0 4px rgba(192, 132, 252, 0.8))' }}
              />
            </g>
          ))}

          {/* Hover Crosshair & Data Tooltip */}
          {hoveredPoint && (
            <g>
              <line
                x1={hoveredPoint.x}
                y1={padding.top}
                x2={hoveredPoint.x}
                y2={padding.top + innerHeight}
                stroke="rgba(255, 255, 255, 0.3)"
                strokeDasharray="3 3"
              />
              <circle
                cx={hoveredPoint.x}
                cy={hoveredPoint.yLsr}
                r="4.5"
                fill="var(--accent-cyan)"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
              <circle
                cx={hoveredPoint.x}
                cy={hoveredPoint.yDvr}
                r="4.5"
                fill="var(--accent-purple)"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            </g>
          )}

          {/* Interactive Transparent Hover Catchers */}
          {chartData.points.map((p, i) => (
            <rect
              key={p.tick}
              x={p.x - 8}
              y={padding.top}
              width={16}
              height={innerHeight}
              fill="transparent"
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoveredIndex(i)}
            />
          ))}

          {/* X Axis Labels */}
          <text
            x={padding.left}
            y={height - 8}
            fill="var(--text-muted)"
            fontSize="10"
            fontFamily="var(--font-mono)"
          >
            Tick {chartData.minTick}
          </text>
          <text
            x={width - padding.right}
            y={height - 8}
            textAnchor="end"
            fill="var(--text-muted)"
            fontSize="10"
            fontFamily="var(--font-mono)"
          >
            Tick {chartData.maxTick}
          </text>
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredPoint && (
          <div
            style={{
              position: 'absolute',
              top: 8,
              right: 12,
              background: 'rgba(10, 15, 30, 0.95)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 10px',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              pointerEvents: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: '3px',
              zIndex: 10,
            }}
          >
            <div style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
              Tick {hoveredPoint.tick} {hoveredPoint.eventDescription ? `· ${hoveredPoint.eventDescription}` : ''}
            </div>
            <div style={{ color: 'var(--accent-cyan)' }}>
              LSR: {hoveredPoint.lsrVal} {metric === 'memory' ? 'bytes' : 'msgs'}{' '}
              ({hoveredPoint.lsrConverged ? 'Converged' : 'Flooding'})
            </div>
            <div style={{ color: 'var(--accent-purple)' }}>
              DVR: {hoveredPoint.dvrVal} {metric === 'memory' ? 'bytes' : 'msgs'}{' '}
              ({hoveredPoint.dvrConverged ? 'Stable' : 'Iterating'})
            </div>
            {hoveredPoint.dvrActiveLoopsCount > 0 && (
              <div style={{ color: 'var(--accent-rose)' }}>
                ⚠ Active Loops: {hoveredPoint.dvrActiveLoopsCount}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Series Legend */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
          <span
            style={{
              width: 12,
              height: 3,
              borderRadius: 2,
              background: 'var(--accent-cyan)',
              boxShadow: 'var(--glow-cyan)',
            }}
          />
          <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>Link State (LSR / OSPF)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
          <span
            style={{
              width: 12,
              height: 3,
              borderRadius: 2,
              background: 'var(--accent-purple)',
              boxShadow: '0 0 6px var(--accent-purple)',
            }}
          />
          <span style={{ color: 'var(--accent-purple)', fontWeight: 600 }}>Distance Vector (DVR / RIP)</span>
        </div>
      </div>
    </div>
  );
};
