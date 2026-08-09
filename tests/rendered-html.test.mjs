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

test("uses the finished product shell with no starter preview", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /InfoBlocksApp/);
  assert.match(page, /agent-orchestration\.json/);
  assert.match(page, /graph-fundamentals\.json/);
  assert.match(layout, /Scroll with somewhere to arrive/);
  assert.doesNotMatch(page + layout + packageJson, /SkeletonPreview|codex-preview|react-loading-skeleton/);
  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
  await access(new URL("../content/schemas/topic.schema.json", import.meta.url));
  await access(new URL("../content/config/ui-config.json", import.meta.url));
  await access(new URL("../public/favicon.svg", import.meta.url));
});
