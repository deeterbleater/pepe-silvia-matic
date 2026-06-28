import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { createJob, getJobForUser, listEdges, listNodes } from '../db/repositories.js';
import { requireAuth } from '../util/auth.js';
import { enqueueLatticeJob } from '../worker/queue.js';

const GenerateSchema = z.object({
  seed_query: z.string().trim().min(2).max(255),
  schizo_temperature: z.number().min(0).max(1).default(0.7)
});

function mermaidEscape(value: string): string {
  return value.replace(/"/g, "'");
}

export async function latticeRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/v1/lattice/generate', { preHandler: requireAuth }, async (request, reply) => {
    const body = GenerateSchema.parse(request.body);
    const job = await createJob(pool, request.authUser.id, body.seed_query, body.schizo_temperature);
    enqueueLatticeJob(job);

    return reply.code(202).send({
      job_id: job.id,
      status: job.status
    });
  });

  app.get('/api/v1/lattice/status/:job_id', { preHandler: requireAuth }, async (request, reply) => {
    const params = z.object({ job_id: z.string().uuid() }).parse(request.params);
    const job = await getJobForUser(pool, params.job_id, request.authUser.id);
    if (!job) return reply.notFound('Job not found');

    return {
      job_id: job.id,
      status: job.status,
      seed_query: job.seedQuery,
      schizo_temperature: job.schizoTemperature,
      raw_summary: job.rawSummary,
      error_message: job.errorMessage,
      created_at: job.createdAt,
      updated_at: job.updatedAt
    };
  });

  app.get('/api/v1/lattice/board/:job_id', { preHandler: requireAuth }, async (request, reply) => {
    const params = z.object({ job_id: z.string().uuid() }).parse(request.params);
    const job = await getJobForUser(pool, params.job_id, request.authUser.id);
    if (!job) return reply.notFound('Job not found');

    const nodes = await listNodes(pool, job.id);
    const edges = await listEdges(pool, job.id);
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const mstEdges = edges.filter((edge) => edge.isMstEdge);
    const mermaidLines = [
      'graph TD',
      ...nodes.map((node) => `  ${node.id.replaceAll('-', '_')}["${mermaidEscape(node.label)}"]`),
      ...mstEdges.map((edge) => {
        const source = edge.sourceNodeId.replaceAll('-', '_');
        const target = edge.targetNodeId.replaceAll('-', '_');
        return `  ${source} -->|"${edge.semanticDistance.toFixed(3)}"| ${target}`;
      })
    ];

    return {
      job: {
        job_id: job.id,
        status: job.status,
        seed_query: job.seedQuery,
        schizo_temperature: job.schizoTemperature,
        raw_summary: job.rawSummary,
        error_message: job.errorMessage
      },
      nodes: nodes.map((node) => ({
        id: node.id,
        label: node.label,
        node_type: node.nodeType,
        etymology_payload: node.etymologyPayload,
        metadata: node.metadata
      })),
      edges: edges.map((edge) => ({
        id: edge.id,
        source_node_id: edge.sourceNodeId,
        source_label: nodeById.get(edge.sourceNodeId)?.label,
        target_node_id: edge.targetNodeId,
        target_label: nodeById.get(edge.targetNodeId)?.label,
        semantic_distance: edge.semanticDistance,
        connection_narrative: edge.connectionNarrative,
        is_mst_edge: edge.isMstEdge
      })),
      mermaid: mermaidLines.join('\n')
    };
  });
}

