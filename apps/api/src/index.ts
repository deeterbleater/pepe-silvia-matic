import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify from 'fastify';
import { env } from './env.js';
import { closePool } from './db/pool.js';
import { healthRoutes } from './routes/health.js';
import { latticeRoutes } from './routes/lattice.js';
import { usersRoutes } from './routes/users.js';

const app = Fastify({
  logger: {
    level: env.NODE_ENV === 'production' ? 'info' : 'debug'
  }
});

await app.register(sensible);
await app.register(cors, {
  origin: env.WEB_ORIGIN.split(',').map((origin) => origin.trim()),
  credentials: true
});
await app.register(swagger, {
  openapi: {
    info: {
      title: 'Synaptic Lattice API',
      version: '0.1.0'
    }
  }
});
await app.register(swaggerUi, { routePrefix: '/docs' });
await app.register(healthRoutes);
await app.register(usersRoutes);
await app.register(latticeRoutes);

app.setErrorHandler((error: Error & { statusCode?: number }, request, reply) => {
  request.log.error(error);
  const statusCode = error.statusCode && error.statusCode >= 400 ? error.statusCode : 500;
  reply.status(statusCode).send({
    error: error.name,
    message: error.message,
    status_code: statusCode
  });
});

const shutdown = async () => {
  await app.close();
  await closePool();
};

process.on('SIGINT', () => {
  shutdown().finally(() => process.exit(0));
});
process.on('SIGTERM', () => {
  shutdown().finally(() => process.exit(0));
});

await app.listen({ port: env.PORT, host: '0.0.0.0' });
