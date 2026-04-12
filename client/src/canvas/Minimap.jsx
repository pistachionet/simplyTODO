import React, { useRef, useEffect, useCallback } from 'react';
import { useStore } from '../hooks/useSessionStore.js';
import {
  CATEGORY_WIDTH,
  CATEGORY_HEIGHT,
  TASK_WIDTH,
  TASK_HEIGHT,
  THEME_LIGHT,
  THEME_DARK,
} from './constants.js';
import { getTaskNodeHeight } from './measure.js';

const MINIMAP_W = 160;
const MINIMAP_H = 110;
const PADDING = 12;

export default function Minimap() {
  const canvasRef = useRef(null);
  const nodes = useStore((s) => s.nodes);
  const camera = useStore((s) => s.camera);
  const setCamera = useStore((s) => s.setCamera);
  const darkMode = useStore((s) => s.darkMode);
  const showPriority = useStore((s) => s.settings.showPriority);
  const expandText = useStore((s) => s.settings.expandText);

  const cameraRef = useRef(camera);
  cameraRef.current = camera;

  // Compute bounding box + scale for the minimap
  const getLayout = useCallback(() => {
    if (nodes.length === 0) return null;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes) {
      if (n.type === 'category') {
        minX = Math.min(minX, n.x - CATEGORY_WIDTH / 2);
        maxX = Math.max(maxX, n.x + CATEGORY_WIDTH / 2);
        minY = Math.min(minY, n.y - CATEGORY_HEIGHT / 2);
        maxY = Math.max(maxY, n.y + CATEGORY_HEIGHT / 2);
      } else {
        const h = getTaskNodeHeight(n.title, n.completed, showPriority, !!n.priority, expandText);
        minX = Math.min(minX, n.x);
        maxX = Math.max(maxX, n.x + TASK_WIDTH);
        minY = Math.min(minY, n.y - TASK_HEIGHT / 2);
        maxY = Math.max(maxY, n.y - TASK_HEIGHT / 2 + h);
      }
    }

    const worldW = maxX - minX || 1;
    const worldH = maxY - minY || 1;
    const drawW = MINIMAP_W - PADDING * 2;
    const drawH = MINIMAP_H - PADDING * 2;
    const scale = Math.min(drawW / worldW, drawH / worldH);

    return { minX, minY, worldW, worldH, scale, drawW, drawH };
  }, [nodes, showPriority, expandText]);

  // Render minimap
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = MINIMAP_W * dpr;
    canvas.height = MINIMAP_H * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    const t = darkMode ? THEME_DARK : THEME_LIGHT;

    // Background
    ctx.fillStyle = t.bg;
    ctx.globalAlpha = 0.92;
    ctx.beginPath();
    ctx.roundRect(0, 0, MINIMAP_W, MINIMAP_H, 8);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Border
    ctx.strokeStyle = t.categoryBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(0, 0, MINIMAP_W, MINIMAP_H, 8);
    ctx.stroke();

    const layout = getLayout();
    if (!layout) return;
    const { minX, minY, worldW, worldH, scale, drawW, drawH } = layout;

    // Center the content
    const offX = PADDING + (drawW - worldW * scale) / 2;
    const offY = PADDING + (drawH - worldH * scale) / 2;

    // Draw viewport rectangle
    const cam = cameraRef.current;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const vpLeft = (-cam.x / cam.zoom);
    const vpTop = (-cam.y / cam.zoom);
    const vpW = vw / cam.zoom;
    const vpH = vh / cam.zoom;

    ctx.fillStyle = darkMode ? 'rgba(75, 138, 245, 0.1)' : 'rgba(37, 99, 235, 0.08)';
    ctx.strokeStyle = darkMode ? '#4b8af5' : '#2563eb';
    ctx.lineWidth = 1.5;
    const rx = offX + (vpLeft - minX) * scale;
    const ry = offY + (vpTop - minY) * scale;
    const rw = vpW * scale;
    const rh = vpH * scale;
    ctx.fillRect(rx, ry, rw, rh);
    ctx.strokeRect(rx, ry, rw, rh);

    // Draw nodes
    for (const n of nodes) {
      let nx, ny, nw, nh;
      if (n.type === 'category') {
        nx = offX + (n.x - CATEGORY_WIDTH / 2 - minX) * scale;
        ny = offY + (n.y - CATEGORY_HEIGHT / 2 - minY) * scale;
        nw = CATEGORY_WIDTH * scale;
        nh = CATEGORY_HEIGHT * scale;
        ctx.fillStyle = darkMode ? '#4b8af5' : '#2563eb';
        ctx.globalAlpha = 0.7;
      } else {
        const h = getTaskNodeHeight(n.title, n.completed, showPriority, !!n.priority, expandText);
        nx = offX + (n.x - minX) * scale;
        ny = offY + (n.y - TASK_HEIGHT / 2 - minY) * scale;
        nw = TASK_WIDTH * scale;
        nh = h * scale;
        ctx.fillStyle = n.completed ? t.taskTextDone : t.taskText;
        ctx.globalAlpha = n.completed ? 0.3 : 0.5;
      }
      ctx.beginPath();
      ctx.roundRect(nx, ny, Math.max(nw, 2), Math.max(nh, 1.5), 1.5);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }, [nodes, camera, darkMode, getLayout, showPriority, expandText]);

  // Drag-to-scroll helpers
  const draggingRef = useRef(false);

  const jumpToMinimapPos = useCallback(
    (clientX, clientY) => {
      const layout = getLayout();
      if (!layout) return;
      const { minX, minY, worldW, worldH, scale, drawW, drawH } = layout;

      const rect = canvasRef.current.getBoundingClientRect();
      const mx = clientX - rect.left;
      const my = clientY - rect.top;

      const offX = PADDING + (drawW - worldW * scale) / 2;
      const offY = PADDING + (drawH - worldH * scale) / 2;

      // Convert minimap coords back to world coords
      const worldX = (mx - offX) / scale + minX;
      const worldY = (my - offY) / scale + minY;

      // Center camera on that world point
      const cam = cameraRef.current;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const newCam = {
        x: vw / 2 - worldX * cam.zoom,
        y: vh / 2 - worldY * cam.zoom,
        zoom: cam.zoom,
      };
      useStore.getState().setCamera(newCam);
    },
    [getLayout]
  );

  const handlePointerDown = useCallback(
    (e) => {
      draggingRef.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      e.currentTarget.style.cursor = 'grabbing';
      jumpToMinimapPos(e.clientX, e.clientY);
    },
    [jumpToMinimapPos]
  );

  const handlePointerMove = useCallback(
    (e) => {
      if (!draggingRef.current) return;
      jumpToMinimapPos(e.clientX, e.clientY);
    },
    [jumpToMinimapPos]
  );

  const handlePointerUp = useCallback(
    (e) => {
      draggingRef.current = false;
      e.currentTarget.style.cursor = 'grab';
    },
    []
  );

  if (nodes.length === 0) return null;

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        position: 'absolute',
        bottom: '16px',
        right: '16px',
        width: `${MINIMAP_W}px`,
        height: `${MINIMAP_H}px`,
        borderRadius: '8px',
        cursor: 'grab',
        zIndex: 40,
        pointerEvents: 'auto',
        touchAction: 'none',
      }}
    />
  );
}
