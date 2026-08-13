import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = resolve(root, "content/source/dsa-roadmap-extracted.json");
const notesPath = resolve(root, "content/source/dsa-code-notes.json");
const outputPath = resolve(root, "content/topics/dsa-interview-recall.json");

const CYCLIC_PERMUTATIONS_RECONSTRUCTION = [
  "class Solution:",
  "    # @param A : string",
  "    # @param B : string",
  "    # @return an integer",
  "    def solve(self, A, B):",
  "        if len(A) != len(B) or not A:",
  "            return 0",
  "",
  "        n = len(A)",
  "        lps = [0] * n",
  "        j = 0",
  "",
  "        for i in range(1, n):",
  "            while j > 0 and A[i] != A[j]:",
  "                j = lps[j - 1]",
  "            if A[i] == A[j]:",
  "                j += 1",
  "                lps[i] = j",
  "",
  "        # Exactly the N cyclic-shift starting positions of B.",
  "        text = B + B[:-1]",
  "        matches = 0",
  "        j = 0",
  "",
  "        for char in text:",
  "            while j > 0 and char != A[j]:",
  "                j = lps[j - 1]",
  "            if char == A[j]:",
  "                j += 1",
  "            if j == n:",
  "                matches += 1",
  "                j = lps[j - 1]",
  "",
  "        return matches",
];

const slug = (value) => value
  .toLowerCase()
  .replaceAll(/[^a-z0-9]+/g, "-")
  .replaceAll(/^-|-$/g, "");

const trimBlankEdges = (lines) => {
  const result = lines.map((line) => line.replaceAll("\t", "    ").replace(/\s+$/, ""));
  while (result[0] === "") result.shift();
  while (result.at(-1) === "") result.pop();
  return result;
};

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));
const source = await readJson(sourcePath);
const notes = await readJson(notesPath);

if (source.nodeCount !== 62 || source.nodes.length !== 62) {
  throw new Error(`Expected 62 source nodes, received ${source.nodes.length}`);
}

const milestones = source.sections.map((section) => ({
  id: slug(section.sectionTitle),
  title: section.sectionTitle,
  shortTitle: section.sectionTitle
    .replace(" — sequences, windows, and last-seen state", "")
    .replace(" — geometry and relationships", "")
    .replace(" — derived grouping", "")
    .replace(" — source label: Stacks 2", ""),
  description: `${section.declaredNodeCount} reference-code problems from the source roadmap.`,
}));

const blocks = source.nodes.map((node, index) => {
  const note = notes[String(node.nodeNumber)];
  if (!note) throw new Error(`Missing code note for node ${node.nodeNumber}`);

  const python = node.snippets.find((snippet) => snippet.language === "python");
  const textSnippets = node.snippets.filter((snippet) => snippet.language === "text");
  const reconstructed = node.nodeNumber === 30 && !python;
  const normalizedIndentation = Boolean(python?.lines.some((line) => line.includes("\t")));
  const sourceLines = reconstructed
    ? CYCLIC_PERMUTATIONS_RECONSTRUCTION
    : python?.lines ?? textSnippets.flatMap((snippet) => snippet.lines);
  const language = python || reconstructed ? "python" : "text";
  const codeLines = trimBlankEdges(sourceLines);
  if (codeLines.length === 0) throw new Error(`Missing reference snippet for node ${node.nodeNumber}`);

  const statementParts = [];
  let textSnippetIndex = 0;
  for (const part of node.contentSequence) {
    if (part.type === "problemStatementParagraph") statementParts.push(part.text);
    else {
      const snippet = node.snippets[part.snippetIndex];
      if (snippet?.language === "text" && snippet.lines.join(" ").trim() !== "No code yet") {
        statementParts.push(...snippet.lines);
        textSnippetIndex += 1;
      }
    }
  }

  const problemStatement = statementParts.join("\n\n");
  const nuances = [...note.nuances];
  if (note.warning) nuances.push(`Source-code caveat: ${note.warning}`);
  if (reconstructed) {
    note.explanation = "Builds an LPS table for A, then uses KMP to count A at every cyclic-shift start inside B + B[:-1].";
    nuances.length = 0;
    nuances.unshift(
      "The document says “No code yet”; this KMP solution is reconstructed from its problem statement.",
      "B + B[:-1] represents exactly N rotations, and resetting j through the LPS table counts overlapping matches.",
      "Time O(N); auxiliary space O(N).",
    );
  } else if (!python) {
    nuances.push("The source document contains no Python solution for this node; its captured snippet is shown verbatim.");
  }
  if (textSnippetIndex > 0) nuances.push("Constraint text embedded between source snippets has been folded into the problem statement above.");

  const code = {
    language,
    caption: reconstructed
      ? "Reconstructed solution · source says “No code yet”"
      : python
        ? `Code from the source document${normalizedIndentation ? " · indentation normalized" : ""}`
        : "Source document note",
    lines: codeLines,
  };

  const sharedPresentation = {
    hook: `Recall the captured ${node.originalTitle} implementation.`,
    body: [note.explanation],
    ...(nuances.length ? { bullets: nuances.slice(0, 5) } : {}),
  };

  return {
    id: `node-${String(node.nodeNumber).padStart(2, "0")}-${slug(node.originalTitle)}`,
    milestoneId: slug(node.sectionTitle),
    order: index + 1,
    kind: "concept",
    eyebrow: `Source node ${String(node.nodeNumber).padStart(2, "0")} · Code recall`,
    title: node.originalTitle,
    learningObjective: `Recall and understand the captured implementation for ${node.originalTitle}.`,
    coreFacts: [note.explanation, ...nuances],
    estimatedSeconds: Math.min(300, Math.max(45, 35 + codeLines.length * 2)),
    presentations: {
      standard: sharedPresentation,
      story: sharedPresentation,
      challenge: {
        prompt: problemStatement,
        hint: "Write the solution from memory, including the original function signature.",
        answer: note.explanation,
        body: [],
        ...(nuances.length ? { bullets: nuances.slice(0, 5) } : {}),
        code,
      },
    },
    takeaway: note.explanation,
    bridge: index + 1 < source.nodes.length ? `Next: ${source.nodes[index + 1].originalTitle}.` : "End of the 62-node code-recall deck.",
    sourceIds: ["umar-roadmap"],
  };
});

const topic = {
  schemaVersion: "1.0.0",
  id: "dsa-interview-recall",
  version: "2.0.0",
  title: "DSA Code Recall: 62 Problems",
  shortTitle: "DSA Code Recall",
  description: "Read each problem statement, attempt the implementation, then reveal its source-document Python snippet with only brief code-specific notes. The one missing source solution is clearly marked as reconstructed.",
  category: "Data Structures & Algorithms",
  accent: "#E86F51",
  estimatedMinutes: 125,
  audience: "An interview candidate revisiting previously learned DSA implementations",
  prerequisites: ["Prior exposure to the source roadmap problems", "Comfort reading Python"],
  learningOutcomes: [
    "Recall the original implementation associated with each roadmap problem",
    "Understand the small, problem-specific decisions inside each captured solution",
    "Notice source-code caveats without replacing the reference implementation",
  ],
  sources: [
    {
      id: "umar-roadmap",
      title: "Umar Farooque’s community DSA roadmap — source captured 6 August 2026",
      url: "https://roadmap.sh/r/dsa-roadmap-tdko4",
    },
  ],
  milestones,
  blocks,
};

await writeFile(outputPath, `${JSON.stringify(topic, null, 2)}\n`, "utf8");
console.log(`Generated ${blocks.length} code-recall blocks at ${outputPath}`);
