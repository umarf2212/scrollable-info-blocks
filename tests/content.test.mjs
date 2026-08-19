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

const normalizedExecutableLines = (lines) => {
  const result = lines
    .map((line) => line.replaceAll("\t", "    ").replace(/\s+$/, ""))
    .filter((line) => !/^\s*#/.test(line));
  while (result[0] === "") result.shift();
  while (result.at(-1) === "") result.pop();
  return result.filter((line, index) => line !== "" || result[index - 1] !== "");
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

test("the DSA journey explains every source problem and walks through its code", async () => {
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
    assert.equal(block.presentations.challenge.code, undefined, `${block.id} must not hide one monolithic answer`);
    assert.ok(block.solution, `${block.id} missing its always-visible explained solution`);
    assert.ok(block.solution.coreIdea.length > 20);
    assert.match(block.solution.patternConnection, /(?:Model pattern|pattern):/i);
    assert.ok(block.solution.nuances.length >= 1);
    assert.ok(block.solution.codeSteps.length >= 2, `${block.id} must split code into multiple steps`);
    assert.ok(block.solution.codeSteps.every((step) => step.title.length > 4 && step.explanation.length > 20));
    assert.ok(block.solution.codeSteps.every((step) => step.code.lines.length <= 20));
    assert.ok(block.solution.codeSteps.every((step) => !/next part|working state|source implementation/i.test(step.explanation)));

    let expectedStartLine = 1;
    for (const step of block.solution.codeSteps) {
      assert.equal(step.code.startLine, expectedStartLine, `${block.id} has discontinuous source line numbers`);
      expectedStartLine += step.code.lines.length;
    }

    const sourcePython = node.snippets.find((snippet) => snippet.language === "python");
    if (sourcePython) {
      assert.deepEqual(
        block.solution.codeSteps.flatMap((step) => step.code.lines),
        normalizedExecutableLines(sourcePython.lines),
        `${block.id} drifted from the executable source Python`,
      );
    }
  }

  assert.equal(topic.blocks[56].title, "Infix to Postfix");
  assert.equal(topic.blocks[60].title, "Infix to Postfix");
  assert.equal(topic.blocks.every((block) => block.solution.codeSteps.every((step) => step.code.language === "python")), true);
  assert.match(topic.blocks[29].solution.codeSteps[0].code.caption, /reconstructed/i);
  assert.match(topic.blocks[29].solution.codeSteps.flatMap((step) => step.code.lines).join("\n"), /def solve\(self, A, B\)/);
  assert.match(topic.description, /explained code fragments/i);
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
