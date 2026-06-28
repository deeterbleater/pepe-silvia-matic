import type { Pool, PoolClient } from 'pg';

export type JobStatus = 'pending' | 'scraping' | 'processing' | 'synthesizing' | 'complete' | 'failed';

export type AuthUser = {
  id: string;
  clerkId: string;
  email: string;
};

export type LatticeJob = {
  id: string;
  userId: string;
  seedQuery: string;
  schizoTemperature: number;
  status: JobStatus;
  rawSummary: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SemanticNode = {
  id: string;
  jobId: string;
  label: string;
  nodeType: string;
  etymologyPayload: Record<string, unknown>;
  metadata: Record<string, unknown>;
};

export type LatticeEdge = {
  id: string;
  jobId: string;
  sourceNodeId: string;
  targetNodeId: string;
  semanticDistance: number;
  connectionNarrative: string;
  isMstEdge: boolean;
};

type Queryable = Pool | PoolClient;

function mapJob(row: Record<string, unknown>): LatticeJob {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    seedQuery: String(row.seed_query),
    schizoTemperature: Number(row.schizo_temperature),
    status: row.status as JobStatus,
    rawSummary: row.raw_summary ? String(row.raw_summary) : null,
    errorMessage: row.error_message ? String(row.error_message) : null,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString()
  };
}

function mapNode(row: Record<string, unknown>): SemanticNode {
  return {
    id: String(row.id),
    jobId: String(row.job_id),
    label: String(row.label),
    nodeType: String(row.node_type),
    etymologyPayload: row.etymology_payload as Record<string, unknown>,
    metadata: row.metadata as Record<string, unknown>
  };
}

function mapEdge(row: Record<string, unknown>): LatticeEdge {
  return {
    id: String(row.id),
    jobId: String(row.job_id),
    sourceNodeId: String(row.source_node_id),
    targetNodeId: String(row.target_node_id),
    semanticDistance: Number(row.semantic_distance),
    connectionNarrative: String(row.connection_narrative),
    isMstEdge: Boolean(row.is_mst_edge)
  };
}

export async function upsertUser(db: Queryable, clerkId: string, email: string): Promise<AuthUser> {
  const result = await db.query(
    `INSERT INTO users (clerk_id, email)
     VALUES ($1, $2)
     ON CONFLICT (clerk_id) DO UPDATE SET email = EXCLUDED.email
     RETURNING id, clerk_id, email`,
    [clerkId, email]
  );
  const row = result.rows[0];
  return { id: row.id, clerkId: row.clerk_id, email: row.email };
}

export async function createJob(
  db: Queryable,
  userId: string,
  seedQuery: string,
  schizoTemperature: number
): Promise<LatticeJob> {
  const result = await db.query(
    `INSERT INTO jobs (user_id, seed_query, schizo_temperature, status)
     VALUES ($1, $2, $3, 'pending')
     RETURNING *`,
    [userId, seedQuery, schizoTemperature]
  );
  return mapJob(result.rows[0]);
}

export async function getJobForUser(db: Queryable, jobId: string, userId: string): Promise<LatticeJob | null> {
  const result = await db.query('SELECT * FROM jobs WHERE id = $1 AND user_id = $2', [jobId, userId]);
  return result.rows[0] ? mapJob(result.rows[0]) : null;
}

export async function updateJobStatus(
  db: Queryable,
  jobId: string,
  status: JobStatus,
  patch: { rawSummary?: string; errorMessage?: string | null } = {}
): Promise<void> {
  await db.query(
    `UPDATE jobs
     SET status = $2,
         raw_summary = COALESCE($3, raw_summary),
         error_message = $4,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [jobId, status, patch.rawSummary ?? null, patch.errorMessage ?? null]
  );
}

export async function insertNode(
  db: Queryable,
  jobId: string,
  label: string,
  nodeType: string,
  etymologyPayload: Record<string, unknown>,
  metadata: Record<string, unknown>
): Promise<SemanticNode> {
  const result = await db.query(
    `INSERT INTO nodes (job_id, label, node_type, etymology_payload, metadata)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [jobId, label, nodeType, etymologyPayload, metadata]
  );
  return mapNode(result.rows[0]);
}

export async function insertEdge(
  db: Queryable,
  jobId: string,
  sourceNodeId: string,
  targetNodeId: string,
  semanticDistance: number,
  connectionNarrative: string,
  isMstEdge: boolean
): Promise<LatticeEdge> {
  const result = await db.query(
    `INSERT INTO edges (
       job_id, source_node_id, target_node_id, semantic_distance, connection_narrative, is_mst_edge
     )
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [jobId, sourceNodeId, targetNodeId, semanticDistance, connectionNarrative, isMstEdge]
  );
  return mapEdge(result.rows[0]);
}

export async function listNodes(db: Queryable, jobId: string): Promise<SemanticNode[]> {
  const result = await db.query('SELECT * FROM nodes WHERE job_id = $1 ORDER BY created_at ASC', [jobId]);
  return result.rows.map(mapNode);
}

export async function listEdges(db: Queryable, jobId: string): Promise<LatticeEdge[]> {
  const result = await db.query(
    'SELECT * FROM edges WHERE job_id = $1 ORDER BY is_mst_edge DESC, semantic_distance ASC',
    [jobId]
  );
  return result.rows.map(mapEdge);
}

