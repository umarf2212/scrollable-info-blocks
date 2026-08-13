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

const normalizedCodeLines = (lines) => {
  const result = lines.map((line) => line.replaceAll("\t", "    ").replace(/\s+$/, ""));
  while (result[0] === "") result.shift();
  while (result.at(-1) === "") result.pop();
  return result;
};

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
    if (topic.id !== "dsa-interview-recall") {
      assert.ok(topic.blocks.some((block) => block.kind === "recap"));
      assert.equal(topic.blocks.at(-1).kind, "completion");
      assert.ok(topic.blocks.some((block) => block.visual?.type === "mermaid"));
      assert.ok(topic.blocks.some((block) => block.visual && block.visual.type !== "mermaid"));
    }

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
        const contentSize = JSON.stringify({
          ...block.presentations[mode],
          code: undefined,
          ...(mode === "challenge" ? { prompt: undefined } : {}),
        }).length + block.takeaway.length;
        assert.ok(contentSize < 1000, `${block.id}/${mode} exceeds the mobile content budget`);
        if (block.presentations[mode].code) {
          assert.ok(block.presentations[mode].code.lines.length <= 300);
          assert.ok(block.presentations[mode].code.lines.join("\n").length <= 20_000);
        }
      }
      assert.ok(block.presentations.challenge.prompt);
      assert.ok(block.presentations.challenge.hint);
      assert.ok(block.presentations.challenge.answer);
    }
  }
});

test("the DSA code-recall journey preserves all source nodes and reference snippets", async () => {
  const [topic, source] = await Promise.all([
    readJson(new URL("../content/topics/dsa-interview-recall.json", import.meta.url)),
    readJson(new URL("../content/source/dsa-roadmap-extracted.json", import.meta.url)),
  ]);

  assert.equal(topic.blocks.length, 62);
  assert.equal(topic.milestones.length, 9);
  assert.equal(topic.blocks.every((block) => block.kind === "concept"), true);
  assert.deepEqual(topic.blocks.map((block) => block.title), source.nodes.map((node) => node.originalTitle));

  for (const [index, block] of topic.blocks.entries()) {
    const node = source.nodes[index];
    assert.ok(node.problemStatementParagraphs.every((paragraph) => block.presentations.challenge.prompt.includes(paragraph)));
    assert.ok(block.presentations.challenge.code, `${block.id} missing reference snippet`);
    assert.ok(block.presentations.challenge.code.lines.length > 0);
    assert.ok(block.presentations.challenge.answer.length < 350, `${block.id} explanation should stay brief`);
    const sourcePython = node.snippets.find((snippet) => snippet.language === "python");
    if (sourcePython) {
      assert.deepEqual(
        block.presentations.challenge.code.lines,
        normalizedCodeLines(sourcePython.lines),
        `${block.id} drifted from its source Python`,
      );
    }
  }

  assert.equal(topic.blocks[56].title, "Infix to Postfix");
  assert.equal(topic.blocks[60].title, "Infix to Postfix");
  assert.equal(topic.blocks.every((block) => block.presentations.challenge.code.language === "python"), true);
  assert.match(topic.blocks[29].presentations.challenge.code.caption, /reconstructed/i);
  assert.match(topic.blocks[29].presentations.challenge.code.lines.join("\n"), /def solve\(self, A, B\)/);
  assert.match(topic.description, /source-document Python snippet/i);
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
