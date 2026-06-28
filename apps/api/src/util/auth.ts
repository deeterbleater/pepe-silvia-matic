import type { FastifyReply, FastifyRequest } from 'fastify';
import { verifyToken } from '@clerk/backend';
import { env } from '../env.js';
import { pool } from '../db/pool.js';
import { upsertUser, type AuthUser } from '../db/repositories.js';

declare module 'fastify' {
  interface FastifyRequest {
    authUser: AuthUser;
  }
}

type ClerkClaims = {
  sub?: string;
  email?: string;
  email_address?: string;
  primary_email_address?: string;
};

function bearerToken(request: FastifyRequest): string | null {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) return null;
  return authorization.slice('Bearer '.length).trim();
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (env.DEV_AUTH_BYPASS && env.NODE_ENV !== 'production') {
    request.authUser = await upsertUser(pool, 'dev_clerk_user', 'dev@synaptic.local');
    return;
  }

  const token = bearerToken(request);
  if (!token) {
    await reply.unauthorized('Missing Bearer token');
    return;
  }

  if (!env.CLERK_SECRET_KEY) {
    await reply.internalServerError('CLERK_SECRET_KEY is required when DEV_AUTH_BYPASS=false');
    return;
  }

  const claims = (await verifyToken(token, { secretKey: env.CLERK_SECRET_KEY })) as ClerkClaims;
  if (!claims.sub) {
    await reply.unauthorized('Invalid Clerk token');
    return;
  }

  const email =
    claims.email ?? claims.email_address ?? claims.primary_email_address ?? `${claims.sub}@clerk.synaptic.local`;
  request.authUser = await upsertUser(pool, claims.sub, email);
}

