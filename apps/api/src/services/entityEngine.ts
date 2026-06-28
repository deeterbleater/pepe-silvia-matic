export type ExtractedEntity = {
  label: string;
  nodeType: string;
  etymologyPayload: Record<string, unknown>;
  metadata: Record<string, unknown>;
};

const KNOWN_TYPES: Array<[RegExp, string]> = [
  [/\b(city|river|mount|island|valley|station|street|county|paris|london|rome|york)\b/i, 'Location'],
  [/\b(algorithm|protocol|engine|matrix|graph|model|transformer|database|postgres)\b/i, 'Concept'],
  [/\b(iron|gold|copper|salt|carbon|silicon|mercury|lead)\b/i, 'Material'],
  [/\b[A-Z][a-z]+ [A-Z][a-z]+\b/, 'Person']
];

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function inferType(label: string): string {
  return KNOWN_TYPES.find(([pattern]) => pattern.test(label))?.[1] ?? 'Concept';
}

function syntheticRoot(label: string): string {
  const normalized = label.toLowerCase().replace(/[^a-z]/g, '');
  if (!normalized) return 'null-root';
  const head = normalized.slice(0, Math.min(4, normalized.length));
  const tail = normalized.slice(Math.max(0, normalized.length - 3));
  return `${head}-${tail}`;
}

function seedTerms(seedQuery: string): string[] {
  const properNouns = seedQuery.match(/\b[A-Z][a-zA-Z0-9-]*(?:\s+[A-Z][a-zA-Z0-9-]*)*\b/g) ?? [];
  const keywords = seedQuery
    .replace(/[^a-zA-Z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((term) => term.length > 4)
    .map(titleCase);

  return Array.from(new Set([...properNouns.map(titleCase), ...keywords])).slice(0, 9);
}

export async function extractEntities(seedQuery: string): Promise<ExtractedEntity[]> {
  const terms = seedTerms(seedQuery);
  const baseTerms = terms.length > 0 ? terms : [titleCase(seedQuery)];
  const augmented = Array.from(
    new Set([...baseTerms, 'Prim Algorithm', 'Semantic Gravity', 'Historical Alias', 'Coordinate Lattice'])
  ).slice(0, 10);

  return augmented.map((label, index) => ({
    label,
    nodeType: inferType(label),
    etymologyPayload: {
      root: syntheticRoot(label),
      decomposition: label.split(/\s+/),
      historicalShadow: `Archive stratum ${index + 1}: ${label} resolves into a reusable symbolic root.`,
      confidence: Number((0.62 + Math.min(index, 5) * 0.04).toFixed(2))
    },
    metadata: {
      sourceUrls: [`https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(label)}`],
      extractionMode: 'deterministic-frontier',
      ordinal: index
    }
  }));
}

export function edgeNarrative(source: string, target: string, distance: number): string {
  return `${source} and ${target} occupy adjacent semantic mass wells; the lattice closes at distance ${distance.toFixed(
    3
  )}, converting lexical residue into a deterministic bridge.`;
}

export function synthesizeSummary(seedQuery: string, mstNarratives: string[]): string {
  return [
    `Seed "${seedQuery}" collapses into a minimum spanning lattice whose edges minimize semantic drag across the board.`,
    `The graph behaves as a fixed four-dimensional manifold: every extracted noun contributes mass, every etymological root bends the route, and Prim's traversal exposes the lowest-energy conspiracy path.`,
    ...mstNarratives.slice(0, 6)
  ].join('\n\n');
}

