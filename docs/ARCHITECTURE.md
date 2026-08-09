# Architecture

## Data flow

`app/page.tsx` imports bundled topic and UI JSON, performs runtime shape and cross-reference checks, then passes typed content into the client application. The full JSON Schemas are also exercised in automated tests. A malformed topic renders a readable diagnostic instead of an empty feed.

The UI never branches on a topic ID. Topic-specific facts, copy, milestones, sources, accent color, and visual payloads all live in JSON.

## Feed and navigation

The feed uses native `100dvh` viewport shells with mandatory CSS scroll snapping. Lightweight shells exist for every block, preserving stable snap targets and direct jumps. Only the active block and a configurable neighbor radius mount their complex copy, code, media, and diagrams.

`IntersectionObserver` plus center-distance selection establishes the active block. Touch, wheel, and trackpad use native scrolling; Arrow, Page, Home, and End keys call the same indexed navigation. Reduced-motion preferences disable smooth transitions.

## State

Conceptual progress is keyed by topic ID and topic version. It stores the current block, highest reached order, completed milestones, and update time. Preferences store topic, explanation mode, and theme. Both use device-local storage.

The URL carries `topic`, `block`, and `mode`, making every block shareable and reloadable. URL updates use history replacement so ordinary scrolling does not flood browser history.

Changing explanation mode leaves the topic and block untouched. Challenge hint/reveal state is keyed by topic and block.

## Rendering and safety

Renderers are selected from a fixed registry. JSON cannot provide a component name, script, or arbitrary HTML. Mermaid is loaded only near the current block, runs with strict security settings, and has an accessible text alternative and failure state. Data diagrams render from constrained structures.

## Responsive model

Fixed header and bottom controls respect safe-area insets. The learning card owns the remaining viewport. Authored blocks target one-screen reading; its inner region permits overflow only as a final fallback for very small screens, enlarged text, expanded Challenge answers, or unusually long code.

Desktop adds a milestone rail. Mobile moves the journey map into a sheet opened by the circular progress control.

## Extension points

- Add a block renderer by extending `VisualType`, `BlockVisual`, the JSON Schema enum, and `VisualBody`.
- Add a topic through a JSON file and one import in `app/page.tsx`; no feed component changes are needed.
- Add a new mode by extending `ExplanationMode`, the presentation schema, and the mode switch. Existing modes deliberately share one factual block identity.
- Replace bundled JSON loading with a safe remote loader later without changing the renderer contract.

The MVP intentionally excludes accounts, authoring CMS, remote uploads, social metrics, infinite recommendations, and cross-device sync.
