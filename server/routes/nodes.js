import { v4 as uuidv4 } from 'uuid';

export default async function nodeRoutes(fastify, { db }) {
  // Middleware: validate session exists and touch it
  fastify.addHook('preHandler', async (request, reply) => {
    const sessionCode = request.params.sessionCode || request.body?.sessionCode;
    if (sessionCode && !db.sessionExists(sessionCode)) {
      return reply.status(404).send({ error: 'Session not found' });
    }
    if (sessionCode) {
      db.touchSession(sessionCode);
    }
  });

  // Get all nodes for a session
  fastify.get('/api/nodes/:sessionCode', async (request) => {
    const { sessionCode } = request.params;
    const nodes = db.getNodesBySession(sessionCode);
    return { nodes };
  });

  // Create a new node
  fastify.post('/api/nodes/:sessionCode', async (request) => {
    const { sessionCode } = request.params;
    const { type, parentId, title, x, y } = request.body;
    const id = uuidv4();
    const node = db.createNode({
      id,
      sessionCode,
      type: type || 'category',
      parentId: parentId || null,
      title: title || 'Untitled',
      x: x ?? 0,
      y: y ?? 0,
    });
    return { node };
  });

  // Update node position
  fastify.patch('/api/nodes/:sessionCode/:nodeId/position', async (request) => {
    const { sessionCode, nodeId } = request.params;
    const { x, y } = request.body;
    const node = db.updateNodePosition({ id: nodeId, sessionCode, x, y });
    if (!node) return { error: 'Node not found' };
    return { node };
  });

  // Update node title
  fastify.patch('/api/nodes/:sessionCode/:nodeId/title', async (request) => {
    const { sessionCode, nodeId } = request.params;
    const { title } = request.body;
    const node = db.updateNodeTitle({ id: nodeId, sessionCode, title });
    if (!node) return { error: 'Node not found' };
    return { node };
  });

  // Toggle node completed
  fastify.patch('/api/nodes/:sessionCode/:nodeId/toggle', async (request) => {
    const { sessionCode, nodeId } = request.params;
    const node = db.toggleNodeCompleted({ id: nodeId, sessionCode });
    if (!node) return { error: 'Node not found' };
    return { node };
  });

  // Delete a node
  fastify.delete('/api/nodes/:sessionCode/:nodeId', async (request) => {
    const { sessionCode, nodeId } = request.params;
    const result = db.deleteNode({ id: nodeId, sessionCode });
    return result;
  });

  // Update node priority
  fastify.patch('/api/nodes/:sessionCode/:nodeId/priority', async (request) => {
    const { sessionCode, nodeId } = request.params;
    const { priority } = request.body;
    const validPriorities = ['high', 'medium', 'low', null];
    if (!validPriorities.includes(priority)) {
      return { error: 'Invalid priority. Use high, medium, low, or null.' };
    }
    const node = db.updateNodePriority({ id: nodeId, sessionCode, priority });
    if (!node) return { error: 'Node not found' };
    return { node };
  });

  // Update node color
  fastify.patch('/api/nodes/:sessionCode/:nodeId/color', async (request) => {
    const { sessionCode, nodeId } = request.params;
    const { color } = request.body;
    // Allow null (clear) or a 3/6-char hex string
    const hexRe = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
    if (color !== null && color !== undefined && !hexRe.test(color)) {
      return { error: 'Invalid color. Use #rgb, #rrggbb, or null.' };
    }
    const node = db.updateNodeColor({ id: nodeId, sessionCode, color: color ?? null });
    if (!node) return { error: 'Node not found' };
    return { node };
  });
}
