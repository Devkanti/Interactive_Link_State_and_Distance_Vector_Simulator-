import React, { useState, useEffect } from 'react';
import { SimulationClock } from '../../core/SimulationClock';
import { StateSnapshot } from '../../core/types';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  History,
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
        width: 760,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '12px 20px',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--border-strong)',
      }}
    >
      {/* Top Row: Player Controls & Speed Selector */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Left: Player Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            className="btn btn-secondary btn-icon"
            onClick={onStepBackward}
            disabled={currentTick <= 0}
            title="Step Backward (-1 Tick)"
            style={{ opacity: currentTick <= 0 ? 0.4 : 1 }}
          >
            <SkipBack size={15} />
          </button>

          <button
            className={`btn ${isRunning ? 'btn-accent' : 'btn-primary'} btn-icon`}
            onClick={handleTogglePlay}
            title={isRunning ? 'Pause Simulation' : 'Run Simulation'}
          >
            {isRunning ? <Pause size={15} /> : <Play size={15} />}
          </button>

          <button
            className="btn btn-secondary btn-icon"
            onClick={onStepForward}
            title="Step Forward (+1 Tick)"
          >
            <SkipForward size={15} />
          </button>

          <button
            className="btn btn-secondary btn-icon"
            onClick={onReset}
            title="Reset to Tick 0"
          >
            <RotateCcw size={15} />
          </button>

          <div style={{ width: 1, height: 18, background: 'var(--border-subtle)', margin: '0 6px' }} />

          {/* Time Scrubber Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <History size={15} color="var(--accent-cyan)" />
            <span style={{ fontSize: '13px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
              Tick {currentTick} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>/ {maxTick}</span>
            </span>
            {currentTick < maxTick && (
              <span className="badge badge-flapping" style={{ fontSize: '9px', padding: '2px 6px' }}>
                Time-Travel Rewound
              </span>
            )}
          </div>
        </div>

        {/* Right: Speed Slider / Buttons (0.5x, 1x, 2x, 5x) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Gauge size={14} color="var(--text-muted)" />
          {[0.5, 1.0, 2.0, 5.0].map((s) => (
            <button
              key={s}
              className={`btn ${speed === s ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '3px 7px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}
              onClick={() => handleSpeed(s)}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Row: Interactive Scrubber Slider with Event Pins */}
      <div style={{ position: 'relative', width: '100%', padding: '4px 0' }}>
        <input
          type="range"
          min="0"
          max={Math.max(1, maxTick)}
          value={currentTick}
          onChange={(e) => onScrubToTick(parseInt(e.target.value, 10))}
          style={{
            width: '100%',
            accentColor: 'var(--accent-cyan)',
            cursor: 'pointer',
          }}
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
                    border: '1.5px solid #000',
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
