# InfoBlocks

InfoBlocks is a finite, topic-driven alternative to short-form reel feeds. Every swipe advances one deliberately sequenced knowledge block, with visible milestones and a clear ending.

The bundled demo contains two complete journeys:

- **AI Agent Orchestration** — 26 blocks covering agent loops, workflow boundaries, orchestration patterns, contracts, context, reliability, evaluation, and an end-to-end production design.
- **Graph Fundamentals for Interviews** — 28 blocks covering graph representations, traversal, connectivity, DSU, Kruskal, Prim, MST correctness, complexity, and edge cases.

Every block is available in Clear, Story, and Challenge modes without changing its conceptual position.

## Run locally

```bash
npm install
npm run dev
```

For another device on the same Wi-Fi network:

```bash
npm run dev:lan
```

Open the printed Network URL on the phone. The host computer and phone must be on the same LAN, and the operating-system firewall must permit the Node process.

## Checks

```bash
npm run lint
npm test
```

`npm test` validates both JSON schemas, curriculum invariants, mobile content budgets, progress calculations, the 1,000-block windowing fixture, the production build, and server-rendered output.

## Project map

- `app/components/InfoBlocksApp.tsx` — feed navigation, modes, themes, deep links, progress, persistence, panels, and keyboard controls
- `app/components/InfoBlockSlide.tsx` — content presentation and Challenge interactions
- `app/components/VisualRenderer.tsx` — Mermaid and data-driven visual renderers
- `content/topics/` — the two demo journeys
- `content/config/ui-config.json` — brand, theme, defaults, features, and windowing configuration
- `content/schemas/` — JSON Schemas for topics and UI configuration
- `docs/AUTHORING.md` — how to add or edit a journey
- `docs/ARCHITECTURE.md` — design, state, performance, and extension notes

No account, backend, recommendation engine, or remote CMS is required. Progress and preferences stay on the current device.
