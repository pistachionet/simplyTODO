import { v4 as uuidv4 } from 'uuid';
import {
  createNode,
  getNodesBySession,
  updateNodePosition,
  updateNodeTitle,
  toggleNodeCompleted,
  deleteNode,
  updateNodePriority,
  touchSession,
  sessionExists,
} from '../db.js';

export default async function nodeRoutes(fastify) {
  // Middleware: validate session exists and touch it
  fastify.addHook('preHandler', async (request, reply) => {
    const sessionCode = request.params.sessionCode || request.body?.sessionCode;
    if (sessionCode && !sessionExists(sessionCode)) {
      return reply.status(404).send({ error: 'Session not found' });
    }
    if (sessionCode) {
      touchSession(sessionCode);
    }
  });

  // Get all nodes for a session
  fastify.get('/api/nodes/:sessionCode', async (request) => {
    const { sessionCode } = request.params;
    const nodes = getNodesBySession(sessionCode);
    return { nodes };
  });

  // Create a new node
  fastify.post('/api/nodes/:sessionCode', async (request) => {
    const { sessionCode } = request.params;
    const { type, parentId, title, x, y } = request.body;
    const id = uuidv4();
    const node = createNode({
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
    const node = updateNodePosition({ id: nodeId, sessionCode, x, y });
    if (!node) return { error: 'Node not found' };
    return { node };
  });

  // Update node title
  fastify.patch('/api/nodes/:sessionCode/:nodeId/title', async (request) => {
    const { sessionCode, nodeId } = request.params;
    const { title } = request.body;
    const node = updateNodeTitle({ id: nodeId, sessionCode, title });
    if (!node) return { error: 'Node not found' };
    return { node };
  });

  // Toggle node completed
  fastify.patch('/api/nodes/:sessionCode/:nodeId/toggle', async (request) => {
    const { sessionCode, nodeId } = request.params;
    const node = toggleNodeCompleted({ id: nodeId, sessionCode });
    if (!node) return { error: 'Node not found' };
    return { node };
  });

  // Delete a node
  fastify.delete('/api/nodes/:sessionCode/:nodeId', async (request) => {
    const { sessionCode, nodeId } = request.params;
    const result = deleteNode({ id: nodeId, sessionCode });
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
    const node = updateNodePriority({ id: nodeId, sessionCode, priority });
    if (!node) return { error: 'Node not found' };
    return { node };
  });
}
