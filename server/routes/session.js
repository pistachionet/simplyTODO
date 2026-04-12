import { createSession, sessionExists, touchSession, getNodesBySession } from '../db.js';

// Generate a random 6-char alphanumeric code (A-Z, 0-9)
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous: 0/O, 1/I
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default async function sessionRoutes(fastify) {
  // Create a new session
  fastify.post('/api/session/create', async (request, reply) => {
    let code;
    let attempts = 0;
    // Generate unique code (retry on collision)
    do {
      code = generateCode();
      attempts++;
      if (attempts > 100) {
        return reply.status(500).send({ error: 'Could not generate unique session code' });
      }
    } while (sessionExists(code));

    createSession(code);
    return { code };
  });

  // Join an existing session
  fastify.post('/api/session/join', async (request, reply) => {
    const { code } = request.body || {};
    if (!code || typeof code !== 'string' || code.length !== 6) {
      return reply.status(400).send({ error: 'Invalid session code. Must be 6 characters.' });
    }

    const upperCode = code.toUpperCase();
    if (!sessionExists(upperCode)) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    touchSession(upperCode);
    const nodes = getNodesBySession(upperCode);
    return { code: upperCode, nodes };
  });
}
