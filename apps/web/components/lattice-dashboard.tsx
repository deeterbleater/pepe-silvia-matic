'use client';

import { Network, Orbit, Send } from 'lucide-react';
import mermaid from 'mermaid';
import { useEffect, useMemo, useRef, useState } from 'react';
import { generateLattice, getBoard, type BoardPayload, type LatticeNode } from '../lib/api';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  flowchart: {
    curve: 'basis',
    nodeSpacing: 42,
    rankSpacing: 58
  }
});

export function LatticeDashboard() {
  const [seedQuery, setSeedQuery] = useState('Pepe Silvia, Prim algorithm, copper mines, and lost mail');
  const [temperature, setTemperature] = useState(0.72);
  const [board, setBoard] = useState<BoardPayload | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const graphRef = useRef<HTMLDivElement>(null);

  const selectedNode = useMemo<LatticeNode | null>(() => {
    if (!board) return null;
    return board.nodes.find((node) => node.id === selectedNodeId) ?? board.nodes[0] ?? null;
  }, [board, selectedNodeId]);

  useEffect(() => {
    let cancelled = false;
    async function renderGraph() {
      if (!board?.mermaid || !graphRef.current) return;
      const { svg } = await mermaid.render(`lattice-${board.job.job_id}`, board.mermaid);
      if (!cancelled && graphRef.current) graphRef.current.innerHTML = svg;
    }
    renderGraph().catch((renderError: unknown) => setError(String(renderError)));
    return () => {
      cancelled = true;
    };
  }, [board]);

  async function runGeneration() {
    setBusy(true);
    setError(null);
    setBoard(null);
    setSelectedNodeId(null);

    try {
      const job = await generateLattice(seedQuery, temperature);
      let nextBoard: BoardPayload | null = null;

      for (let attempt = 0; attempt < 24; attempt += 1) {
        nextBoard = await getBoard(job.job_id);
        setBoard(nextBoard);
        if (nextBoard.job.status === 'complete' || nextBoard.job.status === 'failed') break;
        await new Promise((resolve) => setTimeout(resolve, 850));
      }

      if (nextBoard?.job.status === 'failed') {
        setError(nextBoard.job.error_message ?? 'Lattice job failed');
      }
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : 'Unable to generate lattice');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <h1>Synaptic Lattice</h1>
          <span>semantic-gravity inference terminal</span>
        </div>
        <div className="status-pill">{board?.job.status ?? 'idle'}</div>
      </header>

      <section className="workspace">
        <aside className="pane control-panel">
          <div className="field">
            <label className="label" htmlFor="seed-query">
              Ingestion seed
            </label>
            <input
              id="seed-query"
              type="text"
              value={seedQuery}
              onChange={(event) => setSeedQuery(event.target.value)}
            />
          </div>

          <div className="field">
            <div className="meter-row">
              <label className="label" htmlFor="schizo-meter">
                Schizo-Meter
              </label>
              <span className="meter-value">{temperature.toFixed(2)}</span>
            </div>
            <input
              id="schizo-meter"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={temperature}
              onChange={(event) => setTemperature(Number(event.target.value))}
            />
            <div className="meter-row label">
              <span>rigid map</span>
              <span>4D projection</span>
            </div>
          </div>

          <button className="submit" type="button" disabled={busy || seedQuery.trim().length < 2} onClick={runGeneration}>
            <Send size={17} />
            Generate lattice
          </button>

          {error ? <div className="error">{error}</div> : null}

          <div className="edge-list">
            <h2>MST Edges</h2>
            {(board?.edges.filter((edge) => edge.is_mst_edge) ?? []).map((edge) => (
              <article className="edge-card" key={edge.id}>
                <div className="edge-row">
                  <span>{edge.source_label}</span>
                  <span className="meter-value">{edge.semantic_distance.toFixed(3)}</span>
                </div>
                <p>{edge.target_label}</p>
              </article>
            ))}
          </div>
        </aside>

        <section className="canvas">
          <div className="graph-frame" ref={graphRef}>
            <Orbit size={42} color="#62e6c8" />
          </div>
          <article className="synthesis">
            <h2>4D Prose Engine</h2>
            <pre>{board?.job.raw_summary ?? 'Awaiting lattice collapse.'}</pre>
          </article>
        </section>

        <aside className="pane control-panel">
          <div className="node-list">
            <h2>Semantic Nodes</h2>
            {(board?.nodes ?? []).map((node) => (
              <button
                className="node-button"
                data-active={node.id === selectedNode?.id}
                key={node.id}
                type="button"
                onClick={() => setSelectedNodeId(node.id)}
              >
                <div className="node-title">
                  <span>{node.label}</span>
                  <span className="node-type">{node.node_type}</span>
                </div>
              </button>
            ))}
          </div>

          <article className="details">
            <h2>
              <Network size={16} /> Metadata
            </h2>
            <pre className="json-block">
              {selectedNode
                ? JSON.stringify(
                    {
                      label: selectedNode.label,
                      node_type: selectedNode.node_type,
                      etymology_payload: selectedNode.etymology_payload,
                      metadata: selectedNode.metadata
                    },
                    null,
                    2
                  )
                : 'No node selected.'}
            </pre>
          </article>
        </aside>
      </section>
    </main>
  );
}

