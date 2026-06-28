import type { SemanticNode } from '../db/repositories.js';

export type CandidateEdge = {
  sourceIndex: number;
  targetIndex: number;
  distance: number;
};

export type MstEdge = CandidateEdge & {
  isMstEdge: true;
};

function lexicalVector(text: string): Map<string, number> {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const vector = new Map<string, number>();
  for (const token of tokens) {
    for (let i = 0; i < token.length - 1; i += 1) {
      const gram = token.slice(i, i + 2);
      vector.set(gram, (vector.get(gram) ?? 0) + 1);
    }
  }
  return vector;
}

function cosineDistance(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (const value of a.values()) magA += value * value;
  for (const value of b.values()) magB += value * value;
  for (const [key, value] of a) dot += value * (b.get(key) ?? 0);

  if (magA === 0 || magB === 0) return 1;
  return 1 - dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function proximityBias(sourceIndex: number, targetIndex: number, nodeCount: number, temperature: number): number {
  const ordinalDistance = Math.abs(sourceIndex - targetIndex) / Math.max(1, nodeCount - 1);
  const gravity = 1 - temperature;
  return ordinalDistance * gravity + (1 - ordinalDistance) * temperature * 0.18;
}

export function buildCandidateEdges(nodes: SemanticNode[], temperature: number): CandidateEdge[] {
  const vectors = nodes.map((node) =>
    lexicalVector(
      `${node.label} ${node.nodeType} ${JSON.stringify(node.etymologyPayload)} ${JSON.stringify(node.metadata)}`
    )
  );
  const edges: CandidateEdge[] = [];

  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const lexicalDistance = cosineDistance(vectors[i], vectors[j]);
      const distance = lexicalDistance * 0.78 + proximityBias(i, j, nodes.length, temperature) * 0.22;
      edges.push({
        sourceIndex: i,
        targetIndex: j,
        distance: Number(distance.toFixed(6))
      });
    }
  }

  return edges.sort((a, b) => a.distance - b.distance);
}

export function primMinimumSpanningTree(nodeCount: number, candidates: CandidateEdge[]): MstEdge[] {
  if (nodeCount <= 1) return [];

  const visited = new Set<number>([0]);
  const mst: MstEdge[] = [];

  while (visited.size < nodeCount) {
    const next = candidates.find(
      (edge) =>
        (visited.has(edge.sourceIndex) && !visited.has(edge.targetIndex)) ||
        (visited.has(edge.targetIndex) && !visited.has(edge.sourceIndex))
    );

    if (!next) break;

    visited.add(next.sourceIndex);
    visited.add(next.targetIndex);
    mst.push({ ...next, isMstEdge: true });
  }

  return mst;
}

