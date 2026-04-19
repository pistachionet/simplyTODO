import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyCors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

import sessionRoutes from './routes/session.js';
import nodeRoutes from './routes/nodes.js';
import { setupWebSocket } from './ws.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Build a Fastify application wired to the given db instance.
 * Does NOT start the cleanup cron or call listen() — callers control lifecycle.
 *
 * @param {object} options
 * @param {object} options.db              - DB instance from createDb()
 * @param {boolean} [options.logger=false] - Enable Fastify logger
 * @param {boolean} [options.serveStatic=true] - Serve client dist in prod
 */
export async function buildApp({ db, logger = false, serveStatic = true } = {}) {
  if (!db) throw new Error('buildApp requires a db instance');

  const fastify = Fastify({ logger });

  await fastify.register(fastifyCors, { origin: true });
  await fastify.register(fastifyWebsocket);

  // API routes — pass db via Fastify plugin options
  await fastify.register(sessionRoutes, { db });
  await fastify.register(nodeRoutes, { db });

  // WebSocket
  setupWebSocket(fastify, db);

  // Health check
  fastify.get('/api/health', async () => ({ status: 'ok' }));

  // Serve static files in production
  if (serveStatic) {
    const distPath = resolve(__dirname, '../dist');
    if (existsSync(distPath)) {
      await fastify.register(fastifyStatic, {
        root: distPath,
        prefix: '/',
      });

      fastify.setNotFoundHandler((request, reply) => {
        if (request.url.startsWith('/api') || request.url.startsWith('/ws')) {
          reply.status(404).send({ error: 'Not found' });
        } else {
          reply.sendFile('index.html');
        }
      });
    }
  }

  return fastify;
}
