import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useStore } from '../hooks/useSessionStore.js';
import { useWebSocket } from '../hooks/useWebSocket.js';
import { render } from './renderer.js';
import { hitTest } from './hitTest.js';
import { createGestureHandlers } from './gestures.js';
import {
  CATEGORY_WIDTH,
  CATEGORY_HEIGHT,
  TASK_WIDTH,
  TASK_HEIGHT,
  TASK_OFFSET_X,
  TASK_SPACING_Y,
  PRIORITY_BADGE_WIDTH,
  THEME_LIGHT,
  THEME_DARK,
} from './constants.js';
import ContextMenu from './ContextMenu.jsx';
import Minimap from './Minimap.jsx';
import Settings from '../pages/Settings.jsx';
import { v4 as uuidv4 } from 'uuid';
import { exportPNG, exportMarkdown } from './export.js';
import { getTaskNodeHeight } from './measure.js';
import { parseMarkdown } from './importMd.js';

export default function Board() {
  const canvasRef = useRef(null);
  const cleanupRef = useRef(null);
  const rafRef = useRef(null);
  const dragRef = useRef({ node: null, offsetX: 0, offsetY: 0 });

  const sessionCode = useStore((s) => s.sessionCode);
  const nodes = useStore((s) => s.nodes);
  const camera = useStore((s) => s.camera);
  const setCamera = useStore((s) => s.setCamera);
  const editingNodeId = useStore((s) => s.editingNodeId);
  const setEditingNodeId = useStore((s) => s.setEditingNodeId);
  const selectedNodeId = useStore((s) => s.selectedNodeId);
  const setSelectedNodeId = useStore((s) => s.setSelectedNodeId);
  const connected = useStore((s) => s.connected);
  const moveNode = useStore((s) => s.moveNode);
  const setSessionCode = useStore((s) => s.setSessionCode);
  const contextMenu = useStore((s) => s.contextMenu);
  const setContextMenu = useStore((s) => s.setContextMenu);
  const showPriority = useStore((s) => s.settings.showPriority);
  const expandText = useStore((s) => s.settings.expandText);
  const darkMode = useStore((s) => s.darkMode);
  const canvasTheme = darkMode ? THEME_DARK : THEME_LIGHT;

  const [editValue, setEditValue] = useState('');
  const [editPos, setEditPos] = useState({ x: 0, y: 0, width: 0 });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const editInputRef = useRef(null);

  const { send } = useWebSocket();

  // ── Sync dark mode on root element ─────────────────────────────
  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light';
  }, [darkMode]);

  // ── Canvas sizing ──────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // ── Render loop ────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const frame = () => {
      render(ctx, canvas, nodes, camera, editingNodeId, selectedNodeId, showPriority, canvasTheme, expandText);
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [nodes, camera, editingNodeId, selectedNodeId, showPriority, canvasTheme, expandText]);

  // ── Gesture setup ─────────────────────────────────────────────
  const cameraRef = useRef(camera);
  cameraRef.current = camera;
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  const handleCreateCategory = useCallback(
    (x, y) => {
      setContextMenu(null);
      const id = uuidv4();
      send({
        type: 'node:create',
        id,
        nodeType: 'category',
        title: 'New Category',
        x,
        y,
      });
      useStore.getState().addNode({
        id,
        session_code: sessionCode,
        type: 'category',
        parent_id: null,
        title: 'New Category',
        x,
        y,
        completed: 0,
        priority: null,
        color: null,
      });
      setTimeout(() => {
        setEditingNodeId(id);
        setEditValue('New Category');
        updateEditPosition(id);
        setTimeout(() => {
          editInputRef.current?.focus();
          editInputRef.current?.select();
        }, 10);
      }, 50);
    },
    [send, sessionCode, setEditingNodeId, setContextMenu]
  );

  const handleAddTask = useCallback(
    (parentNode) => {
      setContextMenu(null);
      const id = uuidv4();
      const siblingCount = nodesRef.current.filter(
        (n) => n.parent_id === parentNode.id
      ).length;
      const taskX = parentNode.x + TASK_OFFSET_X;
      const taskY = parentNode.y - 30 + siblingCount * TASK_SPACING_Y;

      send({
        type: 'node:create',
        id,
        nodeType: 'task',
        parentId: parentNode.id,
        title: 'New Task',
        x: taskX,
        y: taskY,
      });
      useStore.getState().addNode({
        id,
        session_code: sessionCode,
        type: 'task',
        parent_id: parentNode.id,
        title: 'New Task',
        x: taskX,
        y: taskY,
        completed: 0,
        priority: null,
        color: null,
      });
      setTimeout(() => {
        setEditingNodeId(id);
        setEditValue('New Task');
        updateEditPosition(id);
        setTimeout(() => {
          editInputRef.current?.focus();
          editInputRef.current?.select();
        }, 10);
      }, 50);
    },
    [send, sessionCode, setEditingNodeId, setContextMenu]
  );

  const handleToggle = useCallback(
    (node) => {
      send({ type: 'node:toggle', id: node.id });
      useStore.getState().updateNode({ ...node, completed: node.completed ? 0 : 1 });
    },
    [send]
  );

  const handleDelete = useCallback(
    (node) => {
      send({ type: 'node:delete', id: node.id });
      const children = nodesRef.current.filter((n) => n.parent_id === node.id).map((n) => n.id);
      useStore.getState().removeNode(node.id, children);
    },
    [send]
  );

  const handleDragStart = useCallback(
    (node, wx, wy) => {
      setContextMenu(null);
      dragRef.current = {
        node,
        offsetX: wx - node.x,
        offsetY: wy - node.y,
      };
      setSelectedNodeId(node.id);
    },
    [setSelectedNodeId, setContextMenu]
  );

  const handleDragMove = useCallback(
    (wx, wy) => {
      const { node, offsetX, offsetY } = dragRef.current;
      if (!node) return;
      const newX = wx - offsetX;
      const newY = wy - offsetY;
      moveNode(node.id, newX, newY);

      if (node.type === 'category') {
        const dx = newX - node.x;
        const dy = newY - node.y;
        const children = nodesRef.current.filter((n) => n.parent_id === node.id);
        for (const child of children) {
          moveNode(child.id, child.x + dx, child.y + dy);
        }
      }

      dragRef.current.node = { ...node, x: newX, y: newY };
    },
    [moveNode]
  );

  const handleDragEnd = useCallback(() => {
    const { node } = dragRef.current;
    if (!node) return;
    const current = nodesRef.current.find((n) => n.id === node.id);
    if (current) {
      send({ type: 'node:move', id: current.id, x: current.x, y: current.y });

      if (node.type === 'category') {
        const children = nodesRef.current.filter((n) => n.parent_id === node.id);
        for (const child of children) {
          send({ type: 'node:move', id: child.id, x: child.x, y: child.y });
        }
      }
    }
    dragRef.current = { node: null, offsetX: 0, offsetY: 0 };
  }, [send]);

  const handleHitTest = useCallback(
    (wx, wy) => {
      const state = useStore.getState();
      return hitTest(nodesRef.current, wx, wy, state.settings.showPriority, state.settings.expandText);
    },
    []
  );

  const updateEditPosition = useCallback(
    (nodeId) => {
      const state = useStore.getState();
      const node = state.nodes.find((n) => n.id === nodeId);
      if (!node) return;
      const cam = cameraRef.current;
      if (node.type === 'category') {
        const hw = CATEGORY_WIDTH / 2 - 20;
        setEditPos({
          x: cam.x + (node.x - hw) * cam.zoom,
          y: cam.y + (node.y - 16) * cam.zoom,
          width: hw * 2 * cam.zoom,
          height: 32 * cam.zoom,
          fontSize: 20 * cam.zoom,
          textAlign: 'center',
        });
      } else {
        const showP = state.settings.showPriority;
        const et = state.settings.expandText;
        const textOffset = showP && node.priority ? 40 + PRIORITY_BADGE_WIDTH + 8 : 40;
        const h = getTaskNodeHeight(node.title, node.completed, showP, !!node.priority, et);
        const topY = node.y - TASK_HEIGHT / 2;
        setEditPos({
          x: cam.x + (node.x + textOffset) * cam.zoom,
          y: cam.y + (topY + 4) * cam.zoom,
          width: (TASK_WIDTH - textOffset - 20) * cam.zoom,
          height: (h - 8) * cam.zoom,
          fontSize: 17 * cam.zoom,
          textAlign: 'left',
        });
      }
    },
    []
  );

  const handleStartEdit = useCallback(
    (node) => {
      setContextMenu(null);
      setEditingNodeId(node.id);
      setEditValue(node.title);
      updateEditPosition(node.id);
      setTimeout(() => {
        editInputRef.current?.focus();
        editInputRef.current?.select();
      }, 10);
    },
    [setEditingNodeId, updateEditPosition, setContextMenu]
  );

  const handleFinishEdit = useCallback(() => {
    const nodeId = useStore.getState().editingNodeId;
    if (!nodeId) return;
    const trimmed = editValue.trim() || 'Untitled';
    send({ type: 'node:rename', id: nodeId, title: trimmed });
    useStore.getState().updateNode({ id: nodeId, title: trimmed });
    setEditingNodeId(null);
  }, [editValue, send, setEditingNodeId]);

  // Context menu handler (right-click / long-press)
  const handleContextMenu = useCallback(
    (screenX, screenY, worldX, worldY) => {
      const state = useStore.getState();
      const hit = hitTest(nodesRef.current, worldX, worldY, state.settings.showPriority, state.settings.expandText);
      if (hit && hit.node && (hit.node.type === 'task' || hit.node.type === 'category')) {
        setContextMenu({
          x: screenX,
          y: screenY,
          nodeId: hit.node.id,
          nodeType: hit.node.type,
        });
      } else {
        setContextMenu(null);
      }
    },
    [setContextMenu]
  );

  const handleSetPriority = useCallback(
    (nodeId, priority) => {
      send({ type: 'node:priority', id: nodeId, priority });
      useStore.getState().updateNode({ id: nodeId, priority });
      setContextMenu(null);
    },
    [send, setContextMenu]
  );

  const handleSetColor = useCallback(
    (nodeId, color) => {
      send({ type: 'node:color', id: nodeId, color });
      useStore.getState().updateNode({ id: nodeId, color });
      setContextMenu(null);
    },
    [send, setContextMenu]
  );

  // ── Fit-to-view ────────────────────────────────────────────────
  const fitToView = useCallback(() => {
    const allNodes = useStore.getState().nodes;
    if (allNodes.length === 0) return;

    const state = useStore.getState();
    const sp = state.settings.showPriority;
    const et = state.settings.expandText;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of allNodes) {
      if (n.type === 'category') {
        minX = Math.min(minX, n.x - CATEGORY_WIDTH / 2);
        maxX = Math.max(maxX, n.x + CATEGORY_WIDTH / 2);
        minY = Math.min(minY, n.y - CATEGORY_HEIGHT / 2);
        maxY = Math.max(maxY, n.y + CATEGORY_HEIGHT / 2);
      } else {
        const h = getTaskNodeHeight(n.title, n.completed, sp, !!n.priority, et);
        minX = Math.min(minX, n.x);
        maxX = Math.max(maxX, n.x + TASK_WIDTH);
        minY = Math.min(minY, n.y - TASK_HEIGHT / 2);
        maxY = Math.max(maxY, n.y - TASK_HEIGHT / 2 + h);
      }
    }

    const padding = 80;
    const bw = maxX - minX + padding * 2;
    const bh = maxY - minY + padding * 2;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const zoom = Math.min(vw / bw, vh / bh, 2);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    const newCam = { x: vw / 2 - cx * zoom, y: vh / 2 - cy * zoom, zoom };
    cameraRef.current = newCam;
    setCamera(newCam);
  }, [setCamera]);

  // ── Import Markdown ───────────────────────────────────────────
  const handleImport = useCallback(
    (categories) => {
      if (!categories || categories.length === 0) return;
      const state = useStore.getState();
      const currentNodes = state.nodes;

      // Find the rightmost edge of existing content, or use viewport center
      let startX, startY;
      if (currentNodes.length === 0) {
        const cam = cameraRef.current;
        startX = (window.innerWidth / 2 - cam.x) / cam.zoom;
        startY = (window.innerHeight / 2 - cam.y) / cam.zoom;
      } else {
        let maxX = -Infinity;
        let sumY = 0;
        for (const n of currentNodes) {
          if (n.type === 'category') {
            maxX = Math.max(maxX, n.x + CATEGORY_WIDTH / 2);
          } else {
            maxX = Math.max(maxX, n.x + TASK_WIDTH);
          }
          sumY += n.y;
        }
        startX = maxX + 300;
        startY = sumY / currentNodes.length;
      }

      const CATEGORY_GAP_Y = 200;

      for (let ci = 0; ci < categories.length; ci++) {
        const cat = categories[ci];
        const catId = uuidv4();
        const catX = startX;
        const catY = startY + ci * CATEGORY_GAP_Y;

        send({
          type: 'node:create',
          id: catId,
          nodeType: 'category',
          title: cat.title,
          x: catX,
          y: catY,
        });
        useStore.getState().addNode({
          id: catId,
          session_code: sessionCode,
          type: 'category',
          parent_id: null,
          title: cat.title,
          x: catX,
          y: catY,
          completed: 0,
          priority: null,
          color: null,
        });

        for (let ti = 0; ti < cat.tasks.length; ti++) {
          const task = cat.tasks[ti];
          const taskId = uuidv4();
          const taskX = catX + TASK_OFFSET_X;
          const taskY = catY - 30 + ti * TASK_SPACING_Y;

          send({
            type: 'node:create',
            id: taskId,
            nodeType: 'task',
            parentId: catId,
            title: task.title,
            x: taskX,
            y: taskY,
          });
          useStore.getState().addNode({
            id: taskId,
            session_code: sessionCode,
            type: 'task',
            parent_id: catId,
            title: task.title,
            x: taskX,
            y: taskY,
            completed: task.completed ? 1 : 0,
            priority: task.priority,
            color: null,
          });

          // Sync completed state if needed
          if (task.completed) {
            send({ type: 'node:toggle', id: taskId });
          }
          // Sync priority if present
          if (task.priority) {
            send({ type: 'node:priority', id: taskId, priority: task.priority });
          }
        }
      }

      // Fit to view after import to show all content
      setTimeout(() => fitToView(), 100);
    },
    [send, sessionCode, fitToView]
  );

  // ── Attach gestures ───────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (cleanupRef.current) cleanupRef.current();

    cleanupRef.current = createGestureHandlers(
      canvas,
      () => cameraRef.current,
      (newCam) => {
        cameraRef.current = newCam;
        setCamera(newCam);
      },
      {
        onHitTest: handleHitTest,
        onDragStart: handleDragStart,
        onDragMove: handleDragMove,
        onDragEnd: handleDragEnd,
        onCreateCategory: handleCreateCategory,
        onAddTask: handleAddTask,
        onToggle: handleToggle,
        onDelete: handleDelete,
        onStartEdit: handleStartEdit,
        onContextMenu: handleContextMenu,
      }
    );

    return () => {
      if (cleanupRef.current) cleanupRef.current();
    };
  }, [
    handleHitTest,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleCreateCategory,
    handleAddTask,
    handleToggle,
    handleDelete,
    handleStartEdit,
    handleContextMenu,
    setCamera,
  ]);

  // Center camera on first load
  useEffect(() => {
    setCamera({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      zoom: 1.3,
    });
  }, [setCamera]);

  // ── Keyboard shortcuts ────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e) {
      // Skip shortcuts when editing text
      if (useStore.getState().editingNodeId) return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const key = e.key.toLowerCase();

      if (key === 'escape') {
        e.preventDefault();
        const state = useStore.getState();
        if (state.contextMenu) {
          setContextMenu(null);
        } else if (settingsOpen) {
          setSettingsOpen(false);
        } else if (state.selectedNodeId) {
          setSelectedNodeId(null);
        }
        return;
      }

      if (key === 'f') {
        e.preventDefault();
        fitToView();
        return;
      }

      if (key === 'n') {
        e.preventDefault();
        const cam = cameraRef.current;
        const wx = (window.innerWidth / 2 - cam.x) / cam.zoom;
        const wy = (window.innerHeight / 2 - cam.y) / cam.zoom;
        handleCreateCategory(wx, wy);
        return;
      }

      if (key === 't') {
        e.preventDefault();
        const state = useStore.getState();
        if (state.selectedNodeId) {
          const selNode = state.nodes.find((n) => n.id === state.selectedNodeId);
          if (selNode && selNode.type === 'category') {
            handleAddTask(selNode);
          }
        }
        return;
      }

      if (key === 'delete' || key === 'backspace') {
        e.preventDefault();
        const state = useStore.getState();
        if (state.selectedNodeId) {
          const selNode = state.nodes.find((n) => n.id === state.selectedNodeId);
          if (selNode) {
            handleDelete(selNode);
            setSelectedNodeId(null);
          }
        }
        return;
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [fitToView, handleCreateCategory, handleAddTask, handleDelete, setContextMenu, setSelectedNodeId, settingsOpen]);

  const handleLeave = () => {
    setSessionCode(null);
    useStore.setState({ nodes: [], camera: { x: 0, y: 0, zoom: 1 } });
  };

  // Close context menu on click elsewhere
  const handleCanvasClick = useCallback(() => {
    if (contextMenu) setContextMenu(null);
    if (exportOpen) setExportOpen(false);
  }, [contextMenu, setContextMenu, exportOpen]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          touchAction: 'none',
        }}
      />

      {/* Floating edit input */}
      {editingNodeId && (
        <input
          ref={editInputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleFinishEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleFinishEdit();
            if (e.key === 'Escape') {
              setEditingNodeId(null);
            }
          }}
          style={{
            position: 'absolute',
            left: `${editPos.x}px`,
            top: `${editPos.y}px`,
            width: `${editPos.width}px`,
            height: `${editPos.height}px`,
            fontSize: `${editPos.fontSize}px`,
            textAlign: editPos.textAlign || 'left',
            fontFamily: 'Inter, sans-serif',
            fontWeight: 500,
            border: '2px solid var(--accent)',
            borderRadius: '6px',
            padding: '0 8px',
            background: 'var(--surface)',
            color: 'var(--text)',
            zIndex: 100,
            outline: 'none',
          }}
          autoFocus
        />
      )}

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeId={contextMenu.nodeId}
          nodeType={contextMenu.nodeType}
          node={nodes.find((n) => n.id === contextMenu.nodeId)}
          onSetPriority={handleSetPriority}
          onSetColor={handleSetColor}
          onRename={(nodeId) => {
            const node = nodes.find((n) => n.id === nodeId);
            if (node) handleStartEdit(node);
            setContextMenu(null);
          }}
          onAddTask={(nodeId) => {
            const node = nodes.find((n) => n.id === nodeId);
            if (node) handleAddTask(node);
            setContextMenu(null);
          }}
          onToggle={(nodeId) => {
            const node = nodes.find((n) => n.id === nodeId);
            if (node) handleToggle(node);
            setContextMenu(null);
          }}
          onDelete={(nodeId) => {
            const node = nodes.find((n) => n.id === nodeId);
            if (node) handleDelete(node);
            setContextMenu(null);
          }}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Settings panel */}
      {settingsOpen && <Settings onClose={() => setSettingsOpen(false)} onImport={handleImport} />}

      {/* Top bar */}
      <div style={styles.topBar}>
        <div style={styles.sessionBadge}>
          <span style={styles.sessionLabel}>Session</span>
          <span style={styles.sessionCodeDisplay}>{sessionCode}</span>
          <button
            onClick={() => {
              navigator.clipboard.writeText(sessionCode);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            style={copied ? { ...styles.copyBtn, ...styles.copyBtnCopied } : styles.copyBtn}
            title="Copy code"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <div style={styles.statusRow}>
          <div
            style={{
              ...styles.statusDot,
              background: connected ? '#22c55e' : '#ef4444',
            }}
          />
          <span style={styles.statusText}>
            {connected ? 'Connected' : 'Reconnecting...'}
          </span>
        </div>
        <div style={styles.rightActions}>
          <button
            onClick={fitToView}
            style={styles.settingsBtn}
            title="Fit to view (F)"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="5 9 5 5 9 5" />
              <polyline points="15 5 19 5 19 9" />
              <polyline points="19 15 19 19 15 19" />
              <polyline points="9 19 5 19 5 15" />
              <rect x="9" y="9" width="6" height="6" rx="1" />
            </svg>
          </button>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setExportOpen(!exportOpen)}
              style={styles.settingsBtn}
              title="Export"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </button>
            {exportOpen && (
              <div style={styles.exportDropdown}>
                <button
                  style={styles.exportItem}
                  onClick={() => {
                    exportPNG(nodes, showPriority, canvasTheme, expandText);
                    setExportOpen(false);
                  }}
                >
                  Export as PNG
                </button>
                <button
                  style={styles.exportItem}
                  onClick={() => {
                    exportMarkdown(nodes);
                    setExportOpen(false);
                  }}
                >
                  Export as Markdown
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            style={styles.settingsBtn}
            title="Settings"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </button>
          <button onClick={handleLeave} style={styles.leaveBtn}>
            Leave
          </button>
        </div>
      </div>

      {/* Help hint */}
      {nodes.length === 0 && (
        <div style={styles.hint}>
          Double-click anywhere to create a category
        </div>
      )}

      {/* Minimap */}
      <Minimap />
    </div>
  );
}

const styles = {
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 20px',
    background: 'var(--bar-bg)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid var(--border)',
    zIndex: 50,
    gap: '12px',
  },
  sessionBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  sessionLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  sessionCodeDisplay: {
    fontSize: '20px',
    fontWeight: 700,
    fontFamily: "'Inter', monospace",
    letterSpacing: '2px',
    color: 'var(--text)',
  },
  copyBtn: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--accent)',
    background: 'var(--btn-accent-bg)',
    padding: '5px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    border: 'none',
    transition: 'background 0.2s, color 0.2s, transform 0.2s',
  },
  copyBtnCopied: {
    background: '#22c55e',
    color: '#ffffff',
    transform: 'scale(1.05)',
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  statusText: {
    fontSize: '16px',
    color: 'var(--text-secondary)',
  },
  rightActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  settingsBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    background: 'var(--bg)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border)',
    cursor: 'pointer',
  },
  leaveBtn: {
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--danger)',
    background: 'var(--btn-danger-bg)',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    border: 'none',
  },
  hint: {
    position: 'absolute',
    bottom: '40px',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '16px',
    color: 'var(--text-secondary)',
    background: 'var(--bar-bg)',
    backdropFilter: 'blur(8px)',
    padding: '12px 24px',
    borderRadius: '8px',
    boxShadow: 'var(--shadow)',
    zIndex: 50,
    whiteSpace: 'nowrap',
  },
  exportDropdown: {
    position: 'absolute',
    top: '42px',
    right: 0,
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    boxShadow: 'var(--shadow-lg)',
    zIndex: 60,
    overflow: 'hidden',
    minWidth: '180px',
  },
  exportItem: {
    display: 'block',
    width: '100%',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--text)',
    background: 'none',
    border: 'none',
    textAlign: 'left',
    cursor: 'pointer',
    borderBottom: '1px solid var(--border)',
  },
};
