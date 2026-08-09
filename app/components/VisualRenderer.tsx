"use client";

import { Maximize2, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import type { BlockVisual } from "@/app/lib/types";

type RecordValue = Record<string, unknown>;

function records(value: unknown): RecordValue[] {
  return Array.isArray(value)
    ? value.filter((item): item is RecordValue => Boolean(item) && typeof item === "object")
    : [];
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function numberValue(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function MermaidDiagram({
  definition,
  resolvedTheme,
}: {
  definition: string;
  resolvedTheme: "light" | "dark";
}) {
  const rawId = useId();
  const [svg, setSvg] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const render = async () => {
      try {
        const { default: mermaid } = await import("mermaid");
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "base",
          themeVariables:
            resolvedTheme === "dark"
              ? {
                  background: "#181c19",
                  primaryColor: "#242a26",
                  primaryTextColor: "#f4f2ec",
                  primaryBorderColor: "#69716b",
                  lineColor: "#a5ada7",
                  tertiaryColor: "#151916",
                  fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
                }
              : {
                  background: "#ffffff",
                  primaryColor: "#f5f3ee",
                  primaryTextColor: "#171a18",
                  primaryBorderColor: "#8c948f",
                  lineColor: "#5d6660",
                  tertiaryColor: "#ece9e2",
                  fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
                },
        });
        const safeId = `diagram-${rawId.replaceAll(":", "")}-${Date.now()}`;
        const result = await mermaid.render(safeId, definition);
        if (!cancelled) {
          setSvg(result.svg);
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    };
    void render();
    return () => {
      cancelled = true;
    };
  }, [definition, rawId, resolvedTheme]);

  if (error) {
    return (
      <div className="visual-fallback" role="status">
        Diagram unavailable. The explanation and text alternative remain available.
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="visual-loading" role="status">
        <span />
        Drawing the idea…
      </div>
    );
  }

  return <div className="mermaid-output" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />;
}

function ComparisonVisual({ data }: { data: RecordValue }) {
  const columns = records(data.columns);
  return (
    <div className="comparison-visual">
      {columns.map((column, index) => (
        <div className="comparison-column" key={`${stringValue(column.title)}-${index}`}>
          <strong>{stringValue(column.title, `Option ${index + 1}`)}</strong>
          <ul>
            {(Array.isArray(column.items) ? column.items : []).map((item, itemIndex) => (
              <li key={`${String(item)}-${itemIndex}`}>{String(item)}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function AgentFlowVisual({ data }: { data: RecordValue }) {
  const nodes = records(data.nodes);
  const layout = stringValue(data.layout, "linear");
  const edges = records(data.edges);
  return (
    <div className={`agent-flow agent-flow--${layout}`}>
      <div className="agent-flow__nodes">
        {nodes.map((node, index) => (
          <div className="agent-flow__step" key={stringValue(node.id, String(index))}>
            <div className="agent-node">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{stringValue(node.label, stringValue(node.id, "Agent"))}</strong>
              {node.role ? <small>{stringValue(node.role)}</small> : null}
            </div>
            {layout === "linear" && index < nodes.length - 1 ? <span className="flow-arrow">→</span> : null}
          </div>
        ))}
      </div>
      {edges.some((edge) => edge.label) ? (
        <div className="agent-flow__legend">
          {edges.filter((edge) => edge.label).map((edge, index) => (
            <span key={`${stringValue(edge.from)}-${stringValue(edge.to)}-${index}`}>
              {stringValue(edge.from)} → {stringValue(edge.to)} · {stringValue(edge.label)}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SequenceVisual({ data }: { data: RecordValue }) {
  const steps = records(data.steps);
  return (
    <ol className="sequence-visual">
      {steps.map((step, index) => (
        <li key={`${stringValue(step.actor)}-${index}`}>
          <span>{String(index + 1).padStart(2, "0")}</span>
          <div>
            <strong>{stringValue(step.actor, "System")}</strong>
            <p>{stringValue(step.action)}</p>
          </div>
          {step.status ? <em>{stringValue(step.status)}</em> : null}
        </li>
      ))}
    </ol>
  );
}

function GraphVisual({ data }: { data: RecordValue }) {
  const nodes = records(data.nodes).map((node, index) => ({
    id: stringValue(node.id, String(index)),
    label: stringValue(node.label, stringValue(node.id, String(index))),
    x: numberValue(node.x, 15 + (index % 4) * 23),
    y: numberValue(node.y, 24 + Math.floor(index / 4) * 45),
    state: stringValue(node.state, "default"),
  }));
  const edges = records(data.edges);
  const directed = data.directed === true;
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));

  return (
    <svg className="graph-visual" viewBox="0 0 100 100" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      <defs>
        <marker id="graph-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" />
        </marker>
      </defs>
      {edges.map((edge, index) => {
        const from = nodeMap.get(stringValue(edge.from));
        const to = nodeMap.get(stringValue(edge.to));
        if (!from || !to) return null;
        const state = stringValue(edge.state, "default");
        return (
          <g className={`graph-edge graph-edge--${state}`} key={`${from.id}-${to.id}-${index}`}>
            <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} markerEnd={directed ? "url(#graph-arrow)" : undefined} />
            {edge.label !== undefined ? (
              <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 2}>{stringValue(edge.label, String(edge.label))}</text>
            ) : null}
          </g>
        );
      })}
      {nodes.map((node) => (
        <g className={`graph-node graph-node--${node.state}`} key={node.id} transform={`translate(${node.x} ${node.y})`}>
          <circle r="7" />
          <text y="1.8">{node.label}</text>
        </g>
      ))}
    </svg>
  );
}

function DsuVisual({ data }: { data: RecordValue }) {
  const groups = records(data.groups);
  const paths = Array.isArray(data.paths) ? data.paths.map(String) : [];
  return (
    <div className="dsu-visual">
      <div className="dsu-groups">
        {groups.map((group, index) => (
          <div className="dsu-group" key={`${stringValue(group.root)}-${index}`}>
            <span className="dsu-root">{stringValue(group.root, "R")}</span>
            <div>
              {(Array.isArray(group.members) ? group.members : []).map((member, memberIndex) => (
                <span className="dsu-member" key={`${String(member)}-${memberIndex}`}>{String(member)}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
      {paths.length > 0 ? <p className="dsu-path">{paths.join("  →  ")}</p> : null}
    </div>
  );
}

function EdgeSortVisual({ data }: { data: RecordValue }) {
  const edges = records(data.edges);
  return (
    <div className="edge-sort-visual">
      {edges.map((edge, index) => (
        <div className={`edge-chip edge-chip--${stringValue(edge.state, "pending")}`} key={`${stringValue(edge.label)}-${index}`}>
          <span>{String(index + 1).padStart(2, "0")}</span>
          <strong>{stringValue(edge.label, "edge")}</strong>
          <em>{numberValue(edge.weight)}</em>
        </div>
      ))}
    </div>
  );
}

function VisualBody({ visual, resolvedTheme }: { visual: BlockVisual; resolvedTheme: "light" | "dark" }) {
  if (visual.type === "mermaid") {
    return <MermaidDiagram definition={visual.definition ?? "flowchart LR\nA[Start] --> B[Finish]"} resolvedTheme={resolvedTheme} />;
  }
  const data = visual.data ?? {};
  if (visual.type === "comparison") return <ComparisonVisual data={data} />;
  if (visual.type === "agent-flow") return <AgentFlowVisual data={data} />;
  if (visual.type === "sequence") return <SequenceVisual data={data} />;
  if (visual.type === "graph") return <GraphVisual data={data} />;
  if (visual.type === "dsu") return <DsuVisual data={data} />;
  return <EdgeSortVisual data={data} />;
}

export function VisualRenderer({
  visual,
  resolvedTheme,
}: {
  visual: BlockVisual;
  resolvedTheme: "light" | "dark";
}) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [expanded]);

  return (
    <>
      <figure className="visual-card">
        <div className="visual-card__head">
          <div>
            <span>Visual model</span>
            <strong>{visual.title}</strong>
          </div>
          <button type="button" className="icon-button icon-button--small" onClick={() => setExpanded(true)} aria-label={`Expand ${visual.title}`}>
            <Maximize2 size={16} />
          </button>
        </div>
        <div className="visual-card__canvas" role="img" aria-label={visual.alt}>
          <VisualBody visual={visual} resolvedTheme={resolvedTheme} />
        </div>
        <figcaption>{visual.caption}</figcaption>
      </figure>

      {expanded ? (
        <div className="visual-modal" role="dialog" aria-modal="true" aria-label={visual.title}>
          <div className="visual-modal__panel">
            <div className="visual-modal__head">
              <div>
                <span>Visual model</span>
                <h2>{visual.title}</h2>
              </div>
              <button type="button" className="icon-button" onClick={() => setExpanded(false)} aria-label="Close expanded visual">
                <X size={20} />
              </button>
            </div>
            <p className="sr-only">{visual.alt}</p>
            <div className="visual-modal__canvas">
              <VisualBody visual={visual} resolvedTheme={resolvedTheme} />
            </div>
            <p>{visual.caption}</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
