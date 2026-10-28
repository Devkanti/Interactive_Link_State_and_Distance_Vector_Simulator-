import React, { useState, useEffect } from 'react';
import { SimulationClock } from '../../core/SimulationClock';
import { StateSnapshot } from '../../core/types';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Gauge,
  Flag,
} from 'lucide-react';

interface TimelineScrubberProps {
  clock: SimulationClock;
  currentTick: number;
  maxTick: number;
  history: StateSnapshot[];
  onScrubToTick: (tick: number) => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onReset: () => void;
}

export const TimelineScrubber: React.FC<TimelineScrubberProps> = ({
  clock,
  currentTick,
  maxTick,
  history,
  onScrubToTick,
  onStepForward,
  onStepBackward,
  onReset,
}) => {
  const [isRunning, setIsRunning] = useState(clock.getIsRunning());
  const [speed, setSpeed] = useState(clock.getSpeed());
  const [hoveredEvent, setHoveredEvent] = useState<string | null>(null);

  useEffect(() => {
    return clock.onRunningStateChange((running) => {
      setIsRunning(running);
    });
  }, [clock]);

  const handleTogglePlay = () => {
    clock.toggle();
    setIsRunning(clock.getIsRunning());
  };

  const handleSpeed = (s: number) => {
    clock.setSpeed(s);
    setSpeed(s);
  };

  const eventMarkers = history.filter((h) => h.isEventMarker || h.eventDescription);

  return (
    <div
      className="glass-panel"
      style={{
        position: 'absolute',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 120,
        width: 'min(580px, calc(100vw - 40px))',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '10px 18px',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      {/* Top Row: Player Controls & Speed Selector */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        {/* Left: Player Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            className="btn btn-secondary"
            onClick={onStepBackward}
            disabled={currentTick <= 0}
            title="Step Backward (-1 Tick)"
            style={{
              width: 32,
              height: 32,
              padding: 0,
              opacity: currentTick <= 0 ? 0.35 : 1,
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <SkipBack size={14} />
          </button>

          <button
            className="btn"
            onClick={handleTogglePlay}
            title={isRunning ? 'Pause Simulation' : 'Run Simulation'}
            style={{
              width: 32,
              height: 32,
              padding: 0,
              borderRadius: 'var(--radius-sm)',
              background: isRunning
                ? 'rgba(225, 71, 90, 0.15)'
                : 'linear-gradient(135deg, #3B8BEB, #6EAEFD)',
              border: isRunning
                ? '1px solid var(--accent-rose)'
                : '1px solid #3B8BEB',
              color: isRunning ? 'var(--accent-rose)' : '#ffffff',
              boxShadow: isRunning
                ? '0 0 10px rgba(225, 71, 90, 0.3)'
                : '0 2px 10px rgba(59, 139, 235, 0.4)',
            }}
          >
            {isRunning ? <Pause size={15} /> : <Play size={15} style={{ marginLeft: 2 }} color="#ffffff" />}
          </button>

          <button
            className="btn btn-secondary"
            onClick={onStepForward}
            title="Step Forward (+1 Tick)"
            style={{ width: 32, height: 32, padding: 0, borderRadius: 'var(--radius-sm)' }}
          >
            <SkipForward size={14} />
          </button>

          <button
            className="btn btn-secondary"
            onClick={onReset}
            title="Reset to Tick 0"
            style={{ width: 32, height: 32, padding: 0, borderRadius: 'var(--radius-sm)' }}
          >
            <RotateCcw size={14} />
          </button>

          <div style={{ width: 1, height: 20, background: 'var(--border-subtle)', margin: '0 4px' }} />

          {/* Time Scrubber Indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(254, 239, 229, 0.75)',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: isRunning ? 'var(--accent-emerald)' : 'var(--accent-cyan)',
                boxShadow: isRunning
                  ? '0 0 8px var(--accent-emerald)'
                  : '0 0 8px var(--accent-cyan)',
              }}
            />
            <span style={{ fontSize: '12px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
              Tick {currentTick} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>/ {maxTick}</span>
            </span>
            {currentTick < maxTick && (
              <span className="badge badge-flapping" style={{ fontSize: '9px', padding: '1px 6px' }}>
                Rewound
              </span>
            )}
          </div>
        </div>

        {/* Right: Speed Slider / Buttons (0.5x, 1x, 2x, 5x) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(254, 239, 229, 0.75)',
            padding: '2px',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border-subtle)',
            gap: '2px',
          }}
        >
          <div style={{ padding: '0 6px', display: 'flex', alignItems: 'center' }}>
            <Gauge size={13} color="var(--text-muted)" />
          </div>
          {[0.5, 1.0, 2.0, 5.0].map((s) => (
            <button
              key={s}
              className={`btn ${speed === s ? 'btn-primary' : 'btn-ghost'}`}
              style={{
                padding: '0 8px',
                height: 24,
                fontSize: '10px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                borderRadius: 'var(--radius-full)',
              }}
              onClick={() => handleSpeed(s)}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Row: Interactive Scrubber Slider with Event Pins */}
      <div style={{ position: 'relative', width: '100%', padding: '2px 0' }}>
        <input
          type="range"
          className="custom-slider"
          min="0"
          max={Math.max(1, maxTick)}
          value={currentTick}
          onChange={(e) => onScrubToTick(parseInt(e.target.value, 10))}
        />

        {/* Visual Event Markers along timeline */}
        <div
          style={{
            position: 'absolute',
            top: 2,
            left: 0,
            right: 0,
            height: 16,
            pointerEvents: 'none',
          }}
        >
          {eventMarkers.map((ev) => {
            if (maxTick <= 0) return null;
            const percent = (ev.tick / maxTick) * 100;
            return (
              <div
                key={ev.tick}
                style={{
                  position: 'absolute',
                  left: `${percent}%`,
                  top: 0,
                  transform: 'translateX(-50%)',
                  pointerEvents: 'auto',
                  cursor: 'pointer',
                }}
                onClick={() => onScrubToTick(ev.tick)}
                onMouseEnter={() => setHoveredEvent(ev.eventDescription || `Event at tick ${ev.tick}`)}
                onMouseLeave={() => setHoveredEvent(null)}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: 'var(--accent-amber)',
                    border: '1.5px solid #ffffff',
                    boxShadow: '0 0 6px var(--accent-amber)',
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Hovered Event Tooltip */}
        {hoveredEvent && (
          <div
            style={{
              position: 'absolute',
              bottom: 28,
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid var(--accent-amber)',
              borderRadius: 'var(--radius-sm)',
              padding: '4px 8px',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--accent-amber)',
              whiteSpace: 'nowrap',
              boxShadow: 'var(--shadow-md)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Flag size={11} /> {hoveredEvent}
          </div>
        )}
      </div>
    </div>
  );
};
