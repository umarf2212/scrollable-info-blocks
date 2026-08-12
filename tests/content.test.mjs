import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";

const topicFiles = [
  new URL("../content/topics/agent-orchestration.json", import.meta.url),
  new URL("../content/topics/graph-fundamentals.json", import.meta.url),
  new URL("../content/topics/dsa-interview-recall.json", import.meta.url),
];

const readJson = async (url) => JSON.parse(await readFile(url, "utf8"));

test("every learning journey validates and stays pedagogically coherent", async () => {
  const [schema, ...topics] = await Promise.all([
    readJson(new URL("../content/schemas/topic.schema.json", import.meta.url)),
    ...topicFiles.map(readJson),
  ]);
  const validate = new Ajv2020({ allErrors: true, strict: false }).compile(schema);

  for (const topic of topics) {
    assert.equal(validate(topic), true, JSON.stringify(validate.errors));
    assert.ok(topic.blocks.length >= 20, `${topic.id} needs a complete journey`);
    assert.ok(topic.milestones.length >= 3);
    assert.deepEqual(topic.blocks.map((block) => block.order), topic.blocks.map((_, index) => index + 1));
    assert.equal(new Set(topic.blocks.map((block) => block.id)).size, topic.blocks.length);
    assert.ok(topic.blocks.some((block) => block.kind === "recap"));
    assert.equal(topic.blocks.at(-1).kind, "completion");
    assert.ok(topic.blocks.some((block) => block.visual?.type === "mermaid"));
    assert.ok(topic.blocks.some((block) => block.visual && block.visual.type !== "mermaid"));

    const milestoneIds = new Set(topic.milestones.map((milestone) => milestone.id));
    const sourceIds = new Set(topic.sources.map((source) => source.id));
    for (const source of topic.sources) assert.match(source.url, /^https:\/\//);

    for (const block of topic.blocks) {
      assert.ok(milestoneIds.has(block.milestoneId));
      assert.ok(block.coreFacts.length > 0);
      assert.ok(block.takeaway.length > 0 && block.bridge.length > 0);
      for (const sourceId of block.sourceIds) assert.ok(sourceIds.has(sourceId));
      for (const mode of ["standard", "story", "challenge"]) {
        assert.ok(block.presentations[mode], `${block.id} missing ${mode}`);
        const contentSize = JSON.stringify(block.presentations[mode]).length + block.takeaway.length;
        assert.ok(contentSize < 1000, `${block.id}/${mode} exceeds the mobile content budget`);
      }
      assert.ok(block.presentations.challenge.prompt);
      assert.ok(block.presentations.challenge.hint);
      assert.ok(block.presentations.challenge.answer);
    }
  }
});

test("the DSA recall journey preserves all source nodes and its retrieval structure", async () => {
  const topic = await readJson(new URL("../content/topics/dsa-interview-recall.json", import.meta.url));
  const sourceBlocks = topic.blocks.filter((block) => block.eyebrow.startsWith("Original roadmap node"));

  assert.equal(sourceBlocks.length, 62);
  assert.equal(topic.milestones.length, 9);
  assert.equal(topic.blocks.filter((block) => block.kind === "recap").length, 9);
  assert.equal(topic.blocks.length, 72);
  assert.equal(sourceBlocks[56].title, "Infix to Postfix");
  assert.equal(sourceBlocks[60].title, "Infix to Postfix");
  assert.match(sourceBlocks[60].presentations.challenge.prompt, /repeated/i);
  assert.match(topic.description, /active-recall/i);
});

test("the UI configuration validates independently from content", async () => {
  const [schema, config] = await Promise.all([
    readJson(new URL("../content/schemas/ui-config.schema.json", import.meta.url)),
    readJson(new URL("../content/config/ui-config.json", import.meta.url)),
  ]);
  const validate = new Ajv2020({ allErrors: true, strict: false }).compile(schema);
  assert.equal(validate(config), true, JSON.stringify(validate.errors));
  assert.equal(config.content.windowRadius, 2);
  assert.deepEqual(Object.keys(config.themes).sort(), ["dark", "light"]);
});
