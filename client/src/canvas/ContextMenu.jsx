import React, { useEffect, useRef } from 'react';

const PRIORITIES = [
  { value: 'high', label: 'High', color: '#dc2626' },
  { value: 'medium', label: 'Medium', color: '#d97706' },
  { value: 'low', label: 'Low', color: '#2563eb' },
  { value: null, label: 'None', color: '#9ca3af' },
];

/**
 * Canvas node context menu.
 *
 * Renders a different set of actions based on `nodeType`:
 *   - category: Rename, Add Task, Delete
 *   - task:     Rename, Toggle Complete, Priority, Delete
 *
 * Props:
 *   x, y         - screen coordinates (pixels)
 *   nodeId       - id of the targeted node
 *   nodeType     - 'category' | 'task'
 *   node         - optional full node object (used to show current priority / completed state)
 *   onRename     - (nodeId) => void
 *   onAddTask    - (nodeId) => void   (category only)
 *   onToggle     - (nodeId) => void   (task only)
 *   onSetPriority- (nodeId, priority|null) => void   (task only)
 *   onDelete     - (nodeId) => void
 *   onClose      - () => void
 */
export default function ContextMenu({
  x,
  y,
  nodeId,
  nodeType,
  node,
  onRename,
  onAddTask,
  onToggle,
  onSetPriority,
  onDelete,
  onClose,
}) {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  // Adjust position so menu doesn't overflow viewport
  const menuWidth = 200;
  const menuHeight = nodeType === 'task' ? 320 : 180;
  const adjustedX = Math.min(x, window.innerWidth - menuWidth - 8);
  const adjustedY = Math.min(y, window.innerHeight - menuHeight - 8);

  const currentPriority = node?.priority ?? null;
  const isCompleted = !!node?.completed;

  return (
    <div
      ref={menuRef}
      style={{
        position: 'absolute',
        left: `${adjustedX}px`,
        top: `${adjustedY}px`,
        zIndex: 200,
        background: 'var(--surface, #ffffff)',
        color: 'var(--text, #374151)',
        borderRadius: '10px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)',
        border: '1px solid var(--border, #e5e7eb)',
        padding: '6px 0',
        minWidth: `${menuWidth}px`,
        fontFamily: 'Inter, sans-serif',
        userSelect: 'none',
      }}
    >
      <div style={styles.header}>
        {nodeType === 'category' ? 'Category' : 'Task'}
      </div>

      {/* ── Common: Rename ──────────────────────────────── */}
      <MenuItem
        label="Rename"
        icon={<IconEdit />}
        onClick={() => onRename?.(nodeId)}
      />

      {/* ── Category-only: Add Task ──────────────────────── */}
      {nodeType === 'category' && (
        <MenuItem
          label="Add Task"
          icon={<IconPlus />}
          onClick={() => onAddTask?.(nodeId)}
        />
      )}

      {/* ── Task-only: Toggle Complete ───────────────────── */}
      {nodeType === 'task' && (
        <MenuItem
          label={isCompleted ? 'Mark Incomplete' : 'Mark Complete'}
          icon={<IconCheck />}
          onClick={() => onToggle?.(nodeId)}
        />
      )}

      {/* ── Task-only: Priority ──────────────────────────── */}
      {nodeType === 'task' && (
        <>
          <div style={styles.separator} />
          <div style={styles.sectionLabel}>Priority</div>
          {PRIORITIES.map((p) => {
            const selected = p.value === currentPriority;
            return (
              <button
                key={p.value || 'none'}
                onClick={() => onSetPriority?.(nodeId, p.value)}
                style={{
                  ...styles.menuItem,
                  background: selected ? 'var(--hover, #f3f4f6)' : 'transparent',
                  fontWeight: selected ? 600 : 500,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover, #f3f4f6)')}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = selected ? 'var(--hover, #f3f4f6)' : 'transparent')
                }
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
                <span style={{ fontSize: '14px' }}>{p.label}</span>
                {selected && <span style={styles.checkMark}>✓</span>}
              </button>
            );
          })}
        </>
      )}

      {/* ── Common: Delete ───────────────────────────────── */}
      <div style={styles.separator} />
      <MenuItem
        label="Delete"
        icon={<IconTrash />}
        danger
        onClick={() => onDelete?.(nodeId)}
      />
    </div>
  );
}

function MenuItem({ label, icon, danger, onClick }) {
  const color = danger ? '#dc2626' : 'var(--text, #374151)';
  const hoverBg = danger ? '#fef2f2' : 'var(--hover, #f3f4f6)';
  return (
    <button
      onClick={onClick}
      style={{ ...styles.menuItem, color }}
      onMouseEnter={(e) => (e.currentTarget.style.background = hoverBg)}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <span style={styles.itemIcon}>{icon}</span>
      <span style={{ fontSize: '14px', fontWeight: 500 }}>{label}</span>
    </button>
  );
}

// ── Inline SVG icons ────────────────────────────────────────────
function IconEdit() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}
function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

const styles = {
  header: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    padding: '4px 14px 6px',
  },
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
    color: 'inherit',
    transition: 'background 0.1s',
  },
  itemIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '18px',
    marginRight: '10px',
    flexShrink: 0,
  },
  separator: {
    height: '1px',
    background: 'var(--border, #e5e7eb)',
    margin: '4px 0',
  },
  checkMark: {
    marginLeft: 'auto',
    fontSize: '13px',
    color: '#6b7280',
  },
};
