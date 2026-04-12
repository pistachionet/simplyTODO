import React, { useRef } from 'react';
import { useStore } from '../hooks/useSessionStore.js';
import { parseMarkdown } from '../canvas/importMd.js';

export default function Settings({ onClose, onImport }) {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const darkMode = useStore((s) => s.darkMode);
  const setDarkMode = useStore((s) => s.setDarkMode);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result;
      if (typeof text !== 'string') return;
      const categories = parseMarkdown(text);
      if (categories.length === 0) {
        alert('No categories or tasks found in the file. Make sure it uses the MindTodo export format.');
        return;
      }
      if (onImport) onImport(categories);
      onClose();
    };
    reader.readAsText(file);
    // Reset so the same file can be re-selected
    e.target.value = '';
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Settings</h2>
          <button onClick={onClose} style={styles.closeBtn}>
            &times;
          </button>
        </div>

        <div style={styles.section}>
          <div style={styles.row}>
            <div style={styles.rowText}>
              <span style={styles.rowLabel}>Dark mode</span>
              <span style={styles.rowDesc}>
                Switch between light and dark canvas theme.
              </span>
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              style={{
                ...styles.toggle,
                background: darkMode ? '#4b8af5' : '#d1d5db',
              }}
            >
              <div
                style={{
                  ...styles.toggleKnob,
                  transform: darkMode ? 'translateX(20px)' : 'translateX(0)',
                }}
              />
            </button>
          </div>

          <div style={{ ...styles.row, marginTop: '20px' }}>
            <div style={styles.rowText}>
              <span style={styles.rowLabel}>Show priority labels</span>
              <span style={styles.rowDesc}>
                Display H/M/L badges on tasks. Set priority by right-clicking (desktop) or long-pressing (mobile) a task.
              </span>
            </div>
            <button
              onClick={() => updateSettings({ showPriority: !settings.showPriority })}
              style={{
                ...styles.toggle,
                background: settings.showPriority ? '#2563eb' : '#d1d5db',
              }}
            >
              <div
                style={{
                  ...styles.toggleKnob,
                  transform: settings.showPriority ? 'translateX(20px)' : 'translateX(0)',
                }}
              />
            </button>
          </div>

          <div style={{ ...styles.row, marginTop: '20px' }}>
            <div style={styles.rowText}>
              <span style={styles.rowLabel}>Auto-expand text</span>
              <span style={styles.rowDesc}>
                Grow task boxes to show full text instead of truncating with &hellip;
              </span>
            </div>
            <button
              onClick={() => updateSettings({ expandText: !settings.expandText })}
              style={{
                ...styles.toggle,
                background: settings.expandText ? '#2563eb' : '#d1d5db',
              }}
            >
              <div
                style={{
                  ...styles.toggleKnob,
                  transform: settings.expandText ? 'translateX(20px)' : 'translateX(0)',
                }}
              />
            </button>
          </div>
        </div>

        {/* Import section */}
        <div style={styles.importSection}>
          <span style={styles.importLabel}>Import</span>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={styles.importBtn}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Import Markdown (.md)
          </button>
          <span style={styles.importDesc}>
            Import a previously exported MindTodo file to add its categories and tasks to the canvas.
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.txt,.markdown"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            Settings are saved per session in your browser.
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.2)',
    backdropFilter: 'blur(4px)',
    zIndex: 150,
    display: 'flex',
    justifyContent: 'flex-end',
  },
  panel: {
    width: '340px',
    maxWidth: '90vw',
    height: '100%',
    background: 'var(--surface, #ffffff)',
    boxShadow: '-4px 0 20px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'Inter, sans-serif',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid var(--border)',
  },
  title: {
    fontSize: '20px',
    fontWeight: 700,
    color: 'var(--text)',
  },
  closeBtn: {
    fontSize: '24px',
    color: 'var(--text-secondary)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
  },
  section: {
    padding: '20px 24px',
    flex: 1,
    overflowY: 'auto',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
  },
  rowText: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  rowLabel: {
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--text)',
  },
  rowDesc: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: 1.4,
  },
  toggle: {
    width: '48px',
    height: '28px',
    borderRadius: '14px',
    border: 'none',
    cursor: 'pointer',
    position: 'relative',
    transition: 'background 0.2s',
    flexShrink: 0,
    padding: '2px',
  },
  toggleKnob: {
    width: '24px',
    height: '24px',
    borderRadius: '12px',
    background: '#ffffff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
    transition: 'transform 0.2s',
  },
  importSection: {
    padding: '16px 24px 20px',
    borderTop: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  importLabel: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  importBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--accent, #2563eb)',
    background: 'var(--btn-accent-bg, #eff6ff)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  importDesc: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    lineHeight: 1.4,
  },
  footer: {
    padding: '16px 24px',
    borderTop: '1px solid var(--border)',
  },
  footerText: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
};
