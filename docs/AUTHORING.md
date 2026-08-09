# Authoring InfoBlocks journeys

Content is the product. A block should be locally understandable and globally cumulative: a learner can deep-link into it, yet it still advances one coherent sequence.

## Add a topic

1. Copy an existing file in `content/topics/`.
2. Give the topic, milestones, blocks, and sources stable kebab-case IDs.
3. Order milestones by dependency. For non-historical subjects, “chronological” means prerequisite, causal, or execution order.
4. Add the JSON import and `parseTopic` call in `app/page.tsx`.
5. Run `npm test`.

The topic file must validate against `content/schemas/topic.schema.json`.

## Design the curriculum first

Before writing prose, define:

- target audience and assumed prerequisites;
- what the learner should be able to explain or do at the end;
- a concept/prerequisite graph;
- milestones that group 4–7 related blocks;
- one primary learning objective per block.

Use actual time order for history, state-transition order for processes, and prerequisite order for technical subjects. Every neighboring pair should have a clear answer to: “Why does this come next?”

## Block contract

Every block contains shared factual fields plus three presentations:

- `standard`: a direct explanation with `hook`, `body`, optional bullets, and optional short code.
- `story`: the same factual core through a recurring scenario. Name the real technical term and state important analogy limits.
- `challenge`: a prediction or micro-problem with `prompt`, `hint`, `answer`, and a reasoned explanation in `body`.

The stable block ID, order, objective, core facts, takeaway, and sources do not change across modes. A mode switch therefore changes presentation, not curriculum position.

Keep a normal presentation under roughly 1,000 serialized characters. Prefer one paragraph, at most 3 body paragraphs, at most 5 bullets, and at most 14 code lines. If the idea does not fit, create a connected continuation block—never shrink typography to hide an oversized lesson.

Use `kind: "recap"` for milestone retrieval blocks and `kind: "completion"` for the final capability summary.

## Visual contracts

All visuals require `title`, `caption`, and `alt`.

- `mermaid`: set `definition` to a valid Mermaid graph. It is rendered lazily in strict security mode.
- `agent-flow`: `data.nodes[{id,label,role?}]`, `data.edges[{from,to,label?}]`, and `data.layout` (`linear`, `hub`, or `parallel`).
- `sequence`: `data.steps[{actor,action,status?}]`.
- `graph`: `data.nodes[{id,label,x,y,state?}]` and `data.edges[{from,to,label?,state?}]`; coordinates are 0–100.
- `dsu`: `data.groups[{root,members[]}]` and optional `data.paths[]`.
- `edge-sort`: `data.edges[{label,weight,state}]`, with `chosen`, `rejected`, or `pending` state.
- `comparison`: `data.columns[{title,items[]}]`.

Use a visual only when it clarifies structure, state, sequence, or comparison. The surrounding copy must still work if the visual fails.

## Sources and accuracy

Use primary or authoritative sources. Add each source once to the topic-level `sources` array, then reference its ID from relevant blocks. Do not put claims in Story mode that are absent from the shared factual core. Keep labels and example data consistent across connected blocks.

## Customize the UI

Edit `content/config/ui-config.json` to change:

- brand name, mark, and tagline;
- default topic, mode, and theme;
- light and dark design tokens;
- sharing, resume, milestones, hints, and keyboard navigation;
- the complex-content mount radius.

The configuration validates against `content/schemas/ui-config.schema.json`. Configuration can select registered behavior; it cannot inject JavaScript or unsafe HTML.
