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
import { startCleanupCron } from './cleanup.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const fastify = Fastify({
  logger: true,
});

async function start() {
  // Plugins
  await fastify.register(fastifyCors, { origin: true });
  await fastify.register(fastifyWebsocket);

  // API routes
  await fastify.register(sessionRoutes);
  await fastify.register(nodeRoutes);

  // WebSocket
  setupWebSocket(fastify);

  // Serve static files in production
  const distPath = resolve(__dirname, '../dist');
  if (existsSync(distPath)) {
    await fastify.register(fastifyStatic, {
      root: distPath,
      prefix: '/',
    });

    // SPA fallback
    fastify.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api') || request.url.startsWith('/ws')) {
        reply.status(404).send({ error: 'Not found' });
      } else {
        reply.sendFile('index.html');
      }
    });
  }

  // Health check
  fastify.get('/api/health', async () => ({ status: 'ok' }));

  // Start cleanup cron
  startCleanupCron();

  // Listen
  const port = process.env.PORT || 3001;
  await fastify.listen({ port, host: '0.0.0.0' });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
