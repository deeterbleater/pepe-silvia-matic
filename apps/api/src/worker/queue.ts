import { pool } from '../db/pool.js';
import {
  insertEdge,
  insertNode,
  listNodes,
  updateJobStatus,
  type LatticeJob
} from '../db/repositories.js';
import { edgeNarrative, extractEntities, synthesizeSummary } from '../services/entityEngine.js';
import { buildCandidateEdges, primMinimumSpanningTree } from '../services/graph.js';

const activeJobs = new Set<string>();

export function enqueueLatticeJob(job: LatticeJob): void {
  if (activeJobs.has(job.id)) return;
  activeJobs.add(job.id);
  setImmediate(() => {
    processLatticeJob(job).finally(() => activeJobs.delete(job.id));
  });
}

async function processLatticeJob(job: LatticeJob): Promise<void> {
  try {
    await updateJobStatus(pool, job.id, 'scraping');
    const entities = await extractEntities(job.seedQuery);

    await updateJobStatus(pool, job.id, 'processing');
    for (const entity of entities) {
      await insertNode(pool, job.id, entity.label, entity.nodeType, entity.etymologyPayload, entity.metadata);
    }

    const nodes = await listNodes(pool, job.id);
    const candidates = buildCandidateEdges(nodes, job.schizoTemperature);
    const mst = primMinimumSpanningTree(nodes.length, candidates);
    const mstKeys = new Set(mst.map((edge) => `${edge.sourceIndex}:${edge.targetIndex}`));
    const persistedCandidates = Array.from(
      new Map(
        [...mst, ...candidates.slice(0, Math.max(nodes.length * 2, mst.length))].map((edge) => [
          `${edge.sourceIndex}:${edge.targetIndex}`,
          edge
        ])
      ).values()
    );
    const narratives: string[] = [];

    for (const candidate of persistedCandidates) {
      const source = nodes[candidate.sourceIndex];
      const target = nodes[candidate.targetIndex];
      const isMstEdge = mstKeys.has(`${candidate.sourceIndex}:${candidate.targetIndex}`);
      const narrative = edgeNarrative(source.label, target.label, candidate.distance);
      if (isMstEdge) narratives.push(narrative);
      await insertEdge(pool, job.id, source.id, target.id, candidate.distance, narrative, isMstEdge);
    }

    await updateJobStatus(pool, job.id, 'synthesizing');
    const rawSummary = synthesizeSummary(job.seedQuery, narratives);
    await updateJobStatus(pool, job.id, 'complete', { rawSummary });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown lattice worker failure';
    await updateJobStatus(pool, job.id, 'failed', { errorMessage: message });
  }
}
