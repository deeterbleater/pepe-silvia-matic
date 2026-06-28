import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { upsertUser } from '../db/repositories.js';
import { requireAuth } from '../util/auth.js';

const SyncUserSchema = z.object({
  clerk_id: z.string().min(1).optional(),
  email: z.string().email().optional()
});

export async function usersRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/v1/users/sync', { preHandler: requireAuth }, async (request) => {
    const body = SyncUserSchema.parse(request.body ?? {});
    const clerkId = body.clerk_id ?? request.authUser.clerkId;
    const email = body.email ?? request.authUser.email;
    const user = await upsertUser(pool, clerkId, email);

    return {
      user_id: user.id,
      clerk_id: user.clerkId,
      email: user.email
    };
  });
}

