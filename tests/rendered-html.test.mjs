import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the InfoBlocks learning feed", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Scroll with somewhere to arrive · InfoBlocks<\/title>/i);
  assert.match(html, /InfoBlocks/);
  assert.match(html, /An agent is a controlled loop/);
  assert.match(html, /AI Agent Orchestration learning feed/);
  assert.match(html, /Standard|Clear/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("server-renders the separate always-visible DSA explanation route", async () => {
  const response = await render("/dsa-roadmap");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /<title>DSA Explained · InfoBlocks<\/title>/i);
  assert.match(html, /Matrix Search/);
  assert.match(html, /DSA Explained: 62 Problems learning feed/);
  assert.match(html, /Problem statement/);
  assert.match(html, /Core idea/);
  assert.match(html, /Pattern connection/);
  assert.match(html, /Code walkthrough/);
  assert.match(html, /Start at the top-right corner/);
  assert.doesNotMatch(html, /Show reference code|Reveal answer|Hide solution/);
});

test("uses the finished product shell with no starter preview", async () => {
  const [page, layout, dsaPage, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/dsa-roadmap/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /InfoBlocksApp/);
  assert.match(page, /agent-orchestration\.json/);
  assert.match(page, /graph-fundamentals\.json/);
  assert.match(page, /dsa-interview-recall\.json/);
  assert.match(page, /linkedJourneys/);
  assert.match(page, /dsa-roadmap/);
  assert.match(dsaPage, /dsa-interview-recall\.json/);
  assert.match(layout, /Scroll with somewhere to arrive/);
  assert.doesNotMatch(page + layout + dsaPage + packageJson, /SkeletonPreview|codex-preview|react-loading-skeleton/);
  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
  await access(new URL("../content/schemas/topic.schema.json", import.meta.url));
  await access(new URL("../content/config/ui-config.json", import.meta.url));
  await access(new URL("../public/favicon.svg", import.meta.url));
  await access(new URL("../public/dsa-roadmap-og.png", import.meta.url));
});
