import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = resolve(root, "content/source/dsa-roadmap-extracted.json");
const notesPath = resolve(root, "content/source/dsa-code-notes.json");
const patternsPath = resolve(root, "content/source/dsa-pattern-connections.json");
const stepNotesPath = resolve(root, "content/source/dsa-code-step-notes.json");
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
  const result = lines
    .map((line) => line.replaceAll("\t", "    ").replace(/\s+$/, ""))
    // Platform annotations and hand-drawn diagrams obscure the executable
    // walkthrough. Inline comments remain attached to the statement they clarify.
    .filter((line) => !/^\s*#/.test(line));
  while (result[0] === "") result.shift();
  while (result.at(-1) === "") result.pop();
  return result.filter((line, index) => line !== "" || result[index - 1] !== "");
};

const splitCodeLines = (lines, maxLines = 12) => {
  const steps = [];
  let start = 0;

  while (start < lines.length) {
    let end = Math.min(lines.length, start + maxLines);
    if (end < lines.length) {
      const minimumCut = start + Math.min(5, Math.max(2, end - start - 1));
      let cut = -1;
      for (let index = end - 1; index >= minimumCut; index -= 1) {
        if (lines[index] === "") {
          cut = index + 1;
          break;
        }
      }
      if (cut === -1) {
        for (let index = end; index >= minimumCut; index -= 1) {
          if (/^ {4,8}(?:def |for |while |if |elif |else:|return )/.test(lines[index] ?? "")) {
            cut = index;
            break;
          }
        }
      }
      if (cut > start) end = cut;
    }

    steps.push({ startLine: start + 1, lines: lines.slice(start, end) });
    start = end;
  }

  if (steps.length === 1 && lines.length > 5) {
    const midpoint = Math.ceil(lines.length / 2);
    return [
      { startLine: 1, lines: lines.slice(0, midpoint) },
      { startLine: midpoint + 1, lines: lines.slice(midpoint) },
    ];
  }

  const last = steps.at(-1);
  const previous = steps.at(-2);
  if (last && previous && last.lines.filter(Boolean).length < 3) {
    const transferable = Math.min(4, Math.max(0, previous.lines.length - 6));
    if (transferable > 0) {
      const moved = previous.lines.splice(previous.lines.length - transferable, transferable);
      last.lines.unshift(...moved);
      last.startLine -= moved.length;
    }
  }

  return steps;
};

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));
const source = await readJson(sourcePath);
const notes = await readJson(notesPath);
const patterns = await readJson(patternsPath);
const stepNotes = await readJson(stepNotesPath);

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
  const patternConnection = patterns[String(node.nodeNumber)];
  if (!patternConnection) throw new Error(`Missing pattern connection for node ${node.nodeNumber}`);

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

  const fragments = splitCodeLines(codeLines);
  const nodeStepNotes = stepNotes[String(node.nodeNumber)];
  if (!nodeStepNotes || nodeStepNotes.length !== fragments.length) {
    throw new Error(`Node ${node.nodeNumber} has ${fragments.length} code fragments but ${nodeStepNotes?.length ?? 0} explanations`);
  }
  const codeSteps = fragments.map((fragment, stepIndex) => {
    const description = nodeStepNotes[stepIndex];
    const endLine = fragment.startLine + fragment.lines.length - 1;
    return {
      ...description,
      code: {
        language,
        caption: reconstructed
          ? `Reconstructed code · lines ${fragment.startLine}–${endLine}`
          : `Source code · lines ${fragment.startLine}–${endLine}${normalizedIndentation ? " · indentation normalized" : ""}`,
        startLine: fragment.startLine,
        lines: fragment.lines,
      },
    };
  });

  const sharedPresentation = {
    hook: `Understand the captured ${node.originalTitle} implementation.`,
    body: [note.explanation],
    ...(nuances.length ? { bullets: nuances.slice(0, 5) } : {}),
  };

  return {
    id: `node-${String(node.nodeNumber).padStart(2, "0")}-${slug(node.originalTitle)}`,
    milestoneId: slug(node.sectionTitle),
    order: index + 1,
    kind: "concept",
    eyebrow: `Source node ${String(node.nodeNumber).padStart(2, "0")} · Explained solution`,
    title: node.originalTitle,
    learningObjective: `Understand the pattern, problem-specific nuance, and implementation for ${node.originalTitle}.`,
    coreFacts: [note.explanation, ...nuances],
    estimatedSeconds: Math.min(300, Math.max(45, 35 + codeLines.length * 2)),
    solution: {
      coreIdea: note.explanation,
      patternConnection,
      nuances: nuances.slice(0, 6),
      codeSteps,
    },
    presentations: {
      standard: sharedPresentation,
      story: sharedPresentation,
      challenge: {
        prompt: problemStatement,
        hint: "Read the core idea and follow the implementation one fragment at a time.",
        answer: note.explanation,
        body: [],
        ...(nuances.length ? { bullets: nuances.slice(0, 5) } : {}),
      },
    },
    takeaway: note.explanation,
    bridge: index + 1 < source.nodes.length ? `Next: ${source.nodes[index + 1].originalTitle}.` : "End of the 62-problem explained deck.",
    sourceIds: ["umar-roadmap"],
  };
});

const topic = {
  schemaVersion: "1.0.0",
  id: "dsa-interview-recall",
  version: "3.0.0",
  title: "DSA Explained: 62 Problems",
  shortTitle: "DSA Explained",
  description: "Each problem is followed by its core idea, the exact pattern-specific trick, and the source implementation broken into short explained code fragments.",
  category: "Data Structures & Algorithms",
  accent: "#E86F51",
  estimatedMinutes: 125,
  audience: "An interview candidate revisiting previously learned DSA implementations",
  prerequisites: ["Prior exposure to the source roadmap problems", "Comfort reading Python"],
  learningOutcomes: [
    "Connect each problem to its underlying model pattern",
    "Understand the problem-specific trick before reading the implementation",
    "Follow the source implementation one explained code fragment at a time",
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
console.log(`Generated ${blocks.length} explained DSA blocks at ${outputPath}`);
