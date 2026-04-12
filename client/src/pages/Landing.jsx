import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../hooks/useSessionStore.js';

const API_BASE = '/api';

export default function Landing() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef([]);
  const setSessionCode = useStore((s) => s.setSessionCode);
  const setNodes = useStore((s) => s.setNodes);
  const darkMode = useStore((s) => s.darkMode);

  // Sync dark mode on landing page
  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light';
  }, [darkMode]);

  const handleCreate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/session/create`, { method: 'POST' });
      const data = await res.json();
      if (data.code) {
        setSessionCode(data.code);
        setNodes([]);
      }
    } catch {
      setError('Failed to create session. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (code.length !== 6) {
      setError('Enter a 6-character session code');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/session/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.toUpperCase() }),
      });
      const data = await res.json();
      if (res.ok && data.code) {
        setSessionCode(data.code);
        setNodes(data.nodes || []);
      } else {
        setError(data.error || 'Session not found');
      }
    } catch {
      setError('Failed to join session. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (index, value) => {
    // Only allow alphanumeric
    const char = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(-1);
    const newCode = code.split('');
    newCode[index] = char;
    const joined = newCode.join('').slice(0, 6);
    setCode(joined);
    setError('');

    // Auto-advance to next input
    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newCode = code.split('');
      newCode[index - 1] = '';
      setCode(newCode.join(''));
    }
    if (e.key === 'Enter' && code.length === 6) {
      handleJoin();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6);
    setCode(pasted);
    if (pasted.length === 6) {
      inputRefs.current[5]?.focus();
    } else {
      inputRefs.current[pasted.length]?.focus();
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>MindTodo</h1>
        <p style={styles.subtitle}>
          A canvas-based todo board you can access from any device
        </p>

        <div style={styles.divider} />

        <div style={styles.section}>
          <p style={styles.label}>Enter session code</p>
          <div style={styles.codeInputRow} onPaste={handlePaste}>
            {Array.from({ length: 6 }).map((_, i) => (
              <input
                key={i}
                ref={(el) => (inputRefs.current[i] = el)}
                type="text"
                inputMode="text"
                autoCapitalize="characters"
                maxLength={1}
                value={code[i] || ''}
                onChange={(e) => handleInputChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                style={styles.codeInput}
                autoFocus={i === 0}
              />
            ))}
          </div>

          <button
            onClick={handleJoin}
            disabled={loading || code.length !== 6}
            style={{
              ...styles.button,
              ...styles.buttonPrimary,
              opacity: loading || code.length !== 6 ? 0.5 : 1,
            }}
          >
            {loading ? 'Joining...' : 'Join Session'}
          </button>
        </div>

        <div style={styles.orRow}>
          <div style={styles.orLine} />
          <span style={styles.orText}>or</span>
          <div style={styles.orLine} />
        </div>

        <button
          onClick={handleCreate}
          disabled={loading}
          style={{ ...styles.button, ...styles.buttonSecondary }}
        >
          {loading ? 'Creating...' : 'Create New Session'}
        </button>

        {error && <p style={styles.error}>{error}</p>}
      </div>
    </div>
  );
}

const styles = {
  container: {
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg)',
    padding: '20px',
  },
  card: {
    background: 'var(--surface)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow-lg)',
    padding: '48px 40px',
    width: '100%',
    maxWidth: '460px',
    textAlign: 'center',
  },
  title: {
    fontSize: '36px',
    fontWeight: 700,
    letterSpacing: '-0.5px',
    marginBottom: '10px',
  },
  subtitle: {
    fontSize: '16px',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
  },
  divider: {
    height: '1px',
    background: 'var(--border)',
    margin: '28px 0',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  codeInputRow: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'center',
  },
  codeInput: {
    width: '52px',
    height: '64px',
    textAlign: 'center',
    fontSize: '26px',
    fontWeight: 600,
    fontFamily: "'Inter', monospace",
    borderRadius: '8px',
    border: '2px solid var(--border)',
    background: 'var(--bg)',
    color: 'var(--text)',
    transition: 'border-color 0.15s',
    outline: 'none',
    caretColor: 'var(--accent)',
  },
  button: {
    width: '100%',
    padding: '16px 0',
    borderRadius: '8px',
    fontSize: '17px',
    fontWeight: 600,
    transition: 'all 0.15s',
    letterSpacing: '-0.2px',
  },
  buttonPrimary: {
    background: 'var(--accent)',
    color: '#fff',
  },
  buttonSecondary: {
    background: 'var(--bg)',
    color: 'var(--text)',
    border: '1.5px solid var(--border)',
  },
  orRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    margin: '20px 0',
  },
  orLine: {
    flex: 1,
    height: '1px',
    background: 'var(--border)',
  },
  orText: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  error: {
    marginTop: '16px',
    fontSize: '14px',
    color: 'var(--danger)',
    fontWeight: 500,
  },
};
