import { v4 as uuidv4 } from 'uuid';

// Map of sessionCode -> Set<WebSocket>. Module-scoped because rooms
// represent live network state, not persisted data. If you ever need
// isolation per app instance (e.g. tests running in parallel), move
// this into setupWebSocket's closure.
const rooms = new Map();

export function setupWebSocket(fastify, db) {
  fastify.get('/ws/:sessionCode', { websocket: true }, (socket, request) => {
    const { sessionCode } = request.params;

    if (!db.sessionExists(sessionCode)) {
      socket.close(4004, 'Session not found');
      return;
    }

    db.touchSession(sessionCode);

    // Join room
    if (!rooms.has(sessionCode)) {
      rooms.set(sessionCode, new Set());
    }
    rooms.get(sessionCode).add(socket);

    socket.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        socket.send(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }

      db.touchSession(sessionCode);
      let result;

      try {
        switch (msg.type) {
          case 'node:create': {
            const id = msg.id || uuidv4();
            const node = db.createNode({
              id,
              sessionCode,
              type: msg.nodeType || 'category',
              parentId: msg.parentId || null,
              title: msg.title || 'Untitled',
              x: msg.x ?? 0,
              y: msg.y ?? 0,
            });
            result = { type: 'node:created', node };
            break;
          }
          case 'node:move': {
            const node = db.updateNodePosition({
              id: msg.id,
              sessionCode,
              x: msg.x,
              y: msg.y,
            });
            result = { type: 'node:moved', node };
            break;
          }
          case 'node:rename': {
            const node = db.updateNodeTitle({
              id: msg.id,
              sessionCode,
              title: msg.title,
            });
            result = { type: 'node:renamed', node };
            break;
          }
          case 'node:toggle': {
            const node = db.toggleNodeCompleted({
              id: msg.id,
              sessionCode,
            });
            result = { type: 'node:toggled', node };
            break;
          }
          case 'node:delete': {
            const deleted = db.deleteNode({
              id: msg.id,
              sessionCode,
            });
            result = { type: 'node:deleted', ...deleted };
            break;
          }
          case 'node:priority': {
            const node = db.updateNodePriority({
              id: msg.id,
              sessionCode,
              priority: msg.priority || null,
            });
            result = { type: 'node:priorityChanged', node };
            break;
          }
          case 'node:color': {
            const node = db.updateNodeColor({
              id: msg.id,
              sessionCode,
              color: msg.color || null,
            });
            result = { type: 'node:colorChanged', node };
            break;
          }
          default:
            socket.send(JSON.stringify({ error: `Unknown message type: ${msg.type}` }));
            return;
        }
      } catch (err) {
        socket.send(JSON.stringify({ error: err.message }));
        return;
      }

      // Broadcast to all clients in the room (including sender for confirmation)
      const payload = JSON.stringify(result);
      const room = rooms.get(sessionCode);
      if (room) {
        for (const client of room) {
          if (client.readyState === 1) {
            client.send(payload);
          }
        }
      }
    });

    socket.on('close', () => {
      const room = rooms.get(sessionCode);
      if (room) {
        room.delete(socket);
        if (room.size === 0) {
          rooms.delete(sessionCode);
        }
      }
    });
  });
}

export function getRoomCount() {
  return rooms.size;
}

// Exposed for tests to reset shared room state between runs.
export function _resetRooms() {
  rooms.clear();
}
