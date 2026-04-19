// Gesture handling: pan, zoom, drag, touch support, right-click, long-press

export function createGestureHandlers(canvas, getCamera, setCamera, callbacks) {
  let isPanning = false;
  let isDragging = false;
  let lastPointer = { x: 0, y: 0 };
  let pinchStartDist = 0;
  let pinchStartZoom = 1;
  let longPressTimer = null;
  let longPressFired = false;

  // Convert screen coords to world coords
  function screenToWorld(sx, sy) {
    const cam = getCamera();
    return {
      x: (sx - cam.x) / cam.zoom,
      y: (sy - cam.y) / cam.zoom,
    };
  }

  function getCanvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    if (e.touches) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  // ── Mouse Events ─────────────────────────────────────────────────
  function onMouseDown(e) {
    // Ignore right-click for drag/pan (handled by contextmenu event)
    if (e.button === 2) return;

    const coords = getCanvasCoords(e);
    const world = screenToWorld(coords.x, coords.y);
    lastPointer = coords;

    const hit = callbacks.onHitTest(world.x, world.y);

    if (hit && (hit.type === 'category' || hit.type === 'task')) {
      isDragging = true;
      callbacks.onDragStart(hit.node, world.x, world.y);
    } else if (hit && hit.type === 'add_task') {
      callbacks.onAddTask(hit.node);
    } else if (hit && hit.type === 'toggle') {
      callbacks.onToggle(hit.node);
    } else if (hit && hit.type === 'delete') {
      callbacks.onDelete(hit.node);
    } else {
      isPanning = true;
      canvas.style.cursor = 'grabbing';
    }
  }

  function onMouseMove(e) {
    const coords = getCanvasCoords(e);
    const dx = coords.x - lastPointer.x;
    const dy = coords.y - lastPointer.y;
    lastPointer = coords;

    if (isPanning) {
      const cam = getCamera();
      setCamera({ x: cam.x + dx, y: cam.y + dy, zoom: cam.zoom });
    } else if (isDragging) {
      const world = screenToWorld(coords.x, coords.y);
      callbacks.onDragMove(world.x, world.y);
    }
  }

  function onMouseUp() {
    if (isDragging) {
      callbacks.onDragEnd();
    }
    isPanning = false;
    isDragging = false;
    canvas.style.cursor = 'default';
  }

  function onWheel(e) {
    e.preventDefault();
    const cam = getCamera();
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    const newZoom = Math.min(Math.max(cam.zoom * zoomFactor, 0.15), 5);

    const wx = (mx - cam.x) / cam.zoom;
    const wy = (my - cam.y) / cam.zoom;
    const newX = mx - wx * newZoom;
    const newY = my - wy * newZoom;

    setCamera({ x: newX, y: newY, zoom: newZoom });
  }

  function onDblClick(e) {
    const coords = getCanvasCoords(e);
    const world = screenToWorld(coords.x, coords.y);
    const hit = callbacks.onHitTest(world.x, world.y);

    if (hit && (hit.type === 'category' || hit.type === 'task')) {
      callbacks.onStartEdit(hit.node);
    } else if (!hit) {
      callbacks.onCreateCategory(world.x, world.y);
    }
  }

  // ── Right-click (context menu) ────────────────────────────────────
  function onContextMenu(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy);

    if (callbacks.onContextMenu) {
      callbacks.onContextMenu(e.clientX, e.clientY, world.x, world.y);
    }
  }

  // ── Touch Events ─────────────────────────────────────────────────
  function onTouchStart(e) {
    longPressFired = false;

    if (e.touches.length === 2) {
      clearLongPress();
      isPanning = false;
      isDragging = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStartDist = Math.hypot(dx, dy);
      pinchStartZoom = getCamera().zoom;
      return;
    }

    if (e.touches.length === 1) {
      const rect = canvas.getBoundingClientRect();
      const coords = { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
      const screenX = e.touches[0].clientX;
      const screenY = e.touches[0].clientY;
      const world = screenToWorld(coords.x, coords.y);
      lastPointer = coords;

      const hit = callbacks.onHitTest(world.x, world.y);

      // Start long-press timer for any node (category or task)
      if (hit && hit.node && (hit.node.type === 'task' || hit.node.type === 'category')) {
        longPressTimer = setTimeout(() => {
          longPressFired = true;
          isDragging = false;
          isPanning = false;
          if (callbacks.onContextMenu) {
            callbacks.onContextMenu(screenX, screenY, world.x, world.y);
          }
        }, 500);
      }

      if (hit && hit.type === 'add_task') {
        clearLongPress();
        callbacks.onAddTask(hit.node);
      } else if (hit && hit.type === 'toggle') {
        clearLongPress();
        callbacks.onToggle(hit.node);
      } else if (hit && hit.type === 'delete') {
        clearLongPress();
        callbacks.onDelete(hit.node);
      } else if (hit && (hit.type === 'category' || hit.type === 'task')) {
        isDragging = true;
        callbacks.onDragStart(hit.node, world.x, world.y);
      } else {
        clearLongPress();
        isPanning = true;
      }
    }
  }

  function clearLongPress() {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }

  function onTouchMove(e) {
    e.preventDefault();
    // Cancel long-press if finger moves
    clearLongPress();

    if (longPressFired) return;

    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const scale = dist / pinchStartDist;
      const newZoom = Math.min(Math.max(pinchStartZoom * scale, 0.15), 5);

      const cam = getCamera();
      const rect = canvas.getBoundingClientRect();
      const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
      const my = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;

      const wx = (mx - cam.x) / cam.zoom;
      const wy = (my - cam.y) / cam.zoom;
      const newX = mx - wx * newZoom;
      const newY = my - wy * newZoom;

      setCamera({ x: newX, y: newY, zoom: newZoom });
      return;
    }

    if (e.touches.length === 1) {
      const rect = canvas.getBoundingClientRect();
      const coords = { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
      const dx = coords.x - lastPointer.x;
      const dy = coords.y - lastPointer.y;
      lastPointer = coords;

      if (isPanning) {
        const cam = getCamera();
        setCamera({ x: cam.x + dx, y: cam.y + dy, zoom: cam.zoom });
      } else if (isDragging) {
        const world = screenToWorld(coords.x, coords.y);
        callbacks.onDragMove(world.x, world.y);
      }
    }
  }

  function onTouchEnd(e) {
    clearLongPress();
    if (e.touches.length === 0) {
      if (isDragging && !longPressFired) callbacks.onDragEnd();
      isPanning = false;
      isDragging = false;
      longPressFired = false;
    }
  }

  // ── Attach ───────────────────────────────────────────────────────
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('mouseleave', onMouseUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('dblclick', onDblClick);
  canvas.addEventListener('contextmenu', onContextMenu);
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd);

  return () => {
    clearLongPress();
    canvas.removeEventListener('mousedown', onMouseDown);
    canvas.removeEventListener('mousemove', onMouseMove);
    canvas.removeEventListener('mouseup', onMouseUp);
    canvas.removeEventListener('mouseleave', onMouseUp);
    canvas.removeEventListener('wheel', onWheel);
    canvas.removeEventListener('dblclick', onDblClick);
    canvas.removeEventListener('contextmenu', onContextMenu);
    canvas.removeEventListener('touchstart', onTouchStart);
    canvas.removeEventListener('touchmove', onTouchMove);
    canvas.removeEventListener('touchend', onTouchEnd);
  };
}
