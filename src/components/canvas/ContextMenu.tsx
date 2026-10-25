import React, { useEffect, useRef } from 'react';

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  danger?: boolean;
  action: () => void;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="glass-panel"
      style={{
        position: 'fixed',
        left: x,
        top: y,
        minWidth: 180,
        zIndex: 2000,
        padding: '6px',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--border-strong)',
      }}
    >
      {items.map((item, idx) => (
        <button
          key={idx}
          className="btn"
          onClick={() => {
            item.action();
            onClose();
          }}
          style={{
            justifyContent: 'flex-start',
            padding: '8px 10px',
            fontSize: '12px',
            borderRadius: 'var(--radius-sm)',
            background: 'transparent',
            color: item.danger ? 'var(--accent-rose)' : 'var(--text-primary)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = item.danger
              ? 'rgba(244, 63, 94, 0.15)'
              : 'rgba(255, 255, 255, 0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
};
