# InfoBlocks

The public site includes two entry points:

- `/` — the original Agent Orchestration and Graph Fundamentals demo library.
- `/dsa-roadmap/` — a separate explained-problem journey covering all 62 nodes from Umar Farooque's DSA roadmap.

Regenerate the curated DSA topic JSON with `npm run content:generate-dsa` after editing the normalized extraction or code notes in `content/source/`.

InfoBlocks is a finite, topic-driven alternative to short-form reel feeds. Every swipe advances one deliberately sequenced knowledge block, with visible milestones and a clear ending.

The bundled content contains three complete journeys across two entry points:

- **AI Agent Orchestration** — 26 blocks covering agent loops, workflow boundaries, orchestration patterns, contracts, context, reliability, evaluation, and an end-to-end production design.
- **Graph Fundamentals for Interviews** — 28 blocks covering graph representations, traversal, connectivity, DSU, Kruskal, Prim, MST correctness, complexity, and edge cases.
- **DSA Explained** — 62 always-visible problem blocks: source statement, core idea, model-pattern connection, problem-specific nuances, and the captured Python implementation split into explained fragments.

The two demo journeys support Clear, Story, and Challenge modes. The DSA route is intentionally locked to its simpler problem → idea → code walkthrough flow.

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

Create the dependency-free distributable with `npm run build:dist`, then run `node dist/server.js`. It listens on `0.0.0.0:3000` by default for LAN access.

## Project map

- `app/components/InfoBlocksApp.tsx` — feed navigation, modes, themes, deep links, progress, persistence, panels, and keyboard controls
- `app/components/InfoBlockSlide.tsx` — content presentation and Challenge interactions
- `app/components/VisualRenderer.tsx` — Mermaid and data-driven visual renderers
- `content/topics/` — the three learning journeys
- `content/config/ui-config.json` — brand, theme, defaults, features, and windowing configuration
- `content/schemas/` — JSON Schemas for topics and UI configuration
- `docs/AUTHORING.md` — how to add or edit a journey
- `docs/ARCHITECTURE.md` — design, state, performance, and extension notes

No account, backend, recommendation engine, or remote CMS is required. Progress and preferences stay on the current device.
