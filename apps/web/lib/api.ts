export type JobStatus = 'pending' | 'scraping' | 'processing' | 'synthesizing' | 'complete' | 'failed';

export type LatticeNode = {
  id: string;
  label: string;
  node_type: string;
  etymology_payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
};

export type LatticeEdge = {
  id: string;
  source_node_id: string;
  source_label?: string;
  target_node_id: string;
  target_label?: string;
  semantic_distance: number;
  connection_narrative: string;
  is_mst_edge: boolean;
};

export type BoardPayload = {
  job: {
    job_id: string;
    status: JobStatus;
    seed_query: string;
    schizo_temperature: number;
    raw_summary: string | null;
    error_message: string | null;
  };
  nodes: LatticeNode[];
  edges: LatticeEdge[];
  mermaid: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.ufotoken.app/synaptic-lattice';
const DEV_BEARER_TOKEN = process.env.NEXT_PUBLIC_DEV_BEARER_TOKEN ?? 'dev';

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${DEV_BEARER_TOKEN}`,
      ...init.headers
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

export function generateLattice(seedQuery: string, schizoTemperature: number) {
  return apiFetch<{ job_id: string; status: JobStatus }>('/api/v1/lattice/generate', {
    method: 'POST',
    body: JSON.stringify({
      seed_query: seedQuery,
      schizo_temperature: schizoTemperature
    })
  });
}

export function getBoard(jobId: string) {
  return apiFetch<BoardPayload>(`/api/v1/lattice/board/${jobId}`);
}
