import React, { useEffect, useRef } from 'react';

const PRIORITIES = [
  { value: 'high', label: 'High', color: '#dc2626', bg: '#fef2f2' },
  { value: 'medium', label: 'Medium', color: '#d97706', bg: '#fffbeb' },
  { value: 'low', label: 'Low', color: '#2563eb', bg: '#eff6ff' },
  { value: null, label: 'None', color: '#6b7280', bg: '#f9fafb' },
];

export default function ContextMenu({ x, y, nodeId, onSetPriority, onDelete, onClose }) {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [onClose]);

  // Adjust position so menu doesn't overflow viewport
  const menuWidth = 180;
  const menuHeight = 250;
  const adjustedX = Math.min(x, window.innerWidth - menuWidth - 8);
  const adjustedY = Math.min(y, window.innerHeight - menuHeight - 8);

  return (
    <div
      ref={menuRef}
      style={{
        position: 'absolute',
        left: `${adjustedX}px`,
        top: `${adjustedY}px`,
        zIndex: 200,
        background: '#ffffff',
        borderRadius: '10px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
        border: '1px solid var(--border)',
        padding: '6px 0',
        minWidth: `${menuWidth}px`,
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <div style={styles.sectionLabel}>Priority</div>
      {PRIORITIES.map((p) => (
        <button
          key={p.value || 'none'}
          onClick={() => onSetPriority(nodeId, p.value)}
          style={styles.menuItem}
          onMouseEnter={(e) => (e.target.style.background = '#f3f4f6')}
          onMouseLeave={(e) => (e.target.style.background = 'transparent')}
        >
          <span
            style={{
              display: 'inline-block',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: p.color,
              marginRight: '10px',
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>
            {p.label}
          </span>
        </button>
      ))}
      <div style={styles.separator} />
      <button
        onClick={() => onDelete(nodeId)}
        style={{ ...styles.menuItem, color: '#dc2626' }}
        onMouseEnter={(e) => (e.target.style.background = '#fef2f2')}
        onMouseLeave={(e) => (e.target.style.background = 'transparent')}
      >
        <span style={{ fontSize: '14px', fontWeight: 500 }}>Delete</span>
      </button>
    </div>
  );
}

const styles = {
  sectionLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    padding: '6px 14px 4px',
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    padding: '8px 14px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: 'Inter, sans-serif',
    transition: 'background 0.1s',
  },
  separator: {
    height: '1px',
    background: '#e5e7eb',
    margin: '4px 0',
  },
};
