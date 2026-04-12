import { useEffect, useRef, useCallback } from 'react';
import { useStore } from './useSessionStore.js';

export function useWebSocket() {
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const sessionCode = useStore((s) => s.sessionCode);
  const setConnected = useStore((s) => s.setConnected);
  const addNode = useStore((s) => s.addNode);
  const updateNode = useStore((s) => s.updateNode);
  const removeNode = useStore((s) => s.removeNode);

  const connect = useCallback(() => {
    if (!sessionCode) return;

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = window.location.host;
    const url = `${protocol}://${host}/ws/${sessionCode}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      switch (msg.type) {
        case 'node:created':
          // Only add if we don't already have it (avoid duplicates from our own sends)
          if (msg.node) {
            useStore.setState((state) => {
              if (state.nodes.some((n) => n.id === msg.node.id)) {
                // Update existing (in case of optimistic add)
                return { nodes: state.nodes.map((n) => n.id === msg.node.id ? { ...n, ...msg.node } : n) };
              }
              return { nodes: [...state.nodes, msg.node] };
            });
          }
          break;
        case 'node:moved':
          if (msg.node) updateNode(msg.node);
          break;
        case 'node:renamed':
          if (msg.node) updateNode(msg.node);
          break;
        case 'node:toggled':
          if (msg.node) updateNode(msg.node);
          break;
        case 'node:deleted':
          removeNode(msg.id, msg.childrenDeleted || []);
          break;
        case 'node:priorityChanged':
          if (msg.node) updateNode(msg.node);
          break;
      }
    };

    ws.onclose = () => {
      setConnected(false);
      // Reconnect after 2 seconds
      reconnectTimer.current = setTimeout(connect, 2000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [sessionCode, setConnected, addNode, updateNode, removeNode]);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
    };
  }, [connect]);

  const send = useCallback((msg) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  return { send };
}
