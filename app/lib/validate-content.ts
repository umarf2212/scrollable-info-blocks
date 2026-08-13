import type { Topic, UiConfig } from "./types";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requireRecord(value: unknown, path: string, errors: string[]): UnknownRecord {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`);
    return {};
  }
  return value;
}

function requireString(record: UnknownRecord, key: string, path: string, errors: string[]) {
  if (typeof record[key] !== "string" || !(record[key] as string).trim()) {
    errors.push(`${path}.${key} must be a non-empty string`);
  }
}

function requireStringArray(record: UnknownRecord, key: string, path: string, errors: string[]) {
  const value = record[key];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.trim())) {
    errors.push(`${path}.${key} must be an array of strings`);
  }
}

function requireCodeLines(record: UnknownRecord, key: string, path: string, errors: string[]) {
  const value = record[key];
  if (
    !Array.isArray(value)
    || value.length === 0
    || value.some((item) => typeof item !== "string")
    || !value.some((item) => item.trim())
  ) {
    errors.push(`${path}.${key} must be a non-empty array of code lines`);
  }
}

function validatePresentation(value: unknown, path: string, challenge: boolean, errors: string[]) {
  const presentation = requireRecord(value, path, errors);
  if (challenge) {
    requireString(presentation, "prompt", path, errors);
    requireString(presentation, "hint", path, errors);
    requireString(presentation, "answer", path, errors);
  } else {
    requireString(presentation, "hook", path, errors);
  }
  requireStringArray(presentation, "body", path, errors);
  if (presentation.bullets !== undefined) requireStringArray(presentation, "bullets", path, errors);
  if (presentation.code !== undefined) {
    const code = requireRecord(presentation.code, `${path}.code`, errors);
    requireString(code, "language", `${path}.code`, errors);
    requireString(code, "caption", `${path}.code`, errors);
    requireCodeLines(code, "lines", `${path}.code`, errors);
  }
}

function topicInvariantErrors(topic: Topic): string[] {
  const errors: string[] = [];
  const milestoneIds = new Set(topic.milestones.map((milestone) => milestone.id));
  const sourceIds = new Set(topic.sources.map((source) => source.id));
  const blockIds = new Set<string>();
  const orders = new Set<number>();

  topic.blocks.forEach((block) => {
    if (blockIds.has(block.id)) errors.push(`Duplicate block id: ${block.id}`);
    if (orders.has(block.order)) errors.push(`Duplicate block order: ${block.order}`);
    if (!milestoneIds.has(block.milestoneId)) {
      errors.push(`${block.id} references unknown milestone ${block.milestoneId}`);
    }
    block.sourceIds.forEach((sourceId) => {
      if (!sourceIds.has(sourceId)) errors.push(`${block.id} references unknown source ${sourceId}`);
    });
    if (block.visual?.type === "mermaid" && !block.visual.definition) {
      errors.push(`${block.id} has a Mermaid visual without a definition`);
    }
    if (block.visual && block.visual.type !== "mermaid" && !block.visual.data) {
      errors.push(`${block.id} has a data visual without data`);
    }
    blockIds.add(block.id);
    orders.add(block.order);
  });

  [...orders].sort((a, b) => a - b).forEach((order, index) => {
    if (order !== index + 1) errors.push(`Block order must be contiguous; found ${order}`);
  });
  return errors;
}

export function parseTopic(value: unknown, label: string): Topic {
  const errors: string[] = [];
  const topic = requireRecord(value, label, errors);
  ["schemaVersion", "id", "version", "title", "shortTitle", "description", "category", "accent", "audience"].forEach((key) => {
    requireString(topic, key, label, errors);
  });
  requireStringArray(topic, "prerequisites", label, errors);
  requireStringArray(topic, "learningOutcomes", label, errors);
  if (typeof topic.estimatedMinutes !== "number" || topic.estimatedMinutes < 1) {
    errors.push(`${label}.estimatedMinutes must be a positive number`);
  }

  if (!Array.isArray(topic.sources) || topic.sources.length === 0) {
    errors.push(`${label}.sources must contain at least one source`);
  } else {
    topic.sources.forEach((value, index) => {
      const source = requireRecord(value, `${label}.sources[${index}]`, errors);
      requireString(source, "id", `${label}.sources[${index}]`, errors);
      requireString(source, "title", `${label}.sources[${index}]`, errors);
      requireString(source, "url", `${label}.sources[${index}]`, errors);
    });
  }

  if (!Array.isArray(topic.milestones) || topic.milestones.length === 0) {
    errors.push(`${label}.milestones must contain at least one milestone`);
  } else {
    topic.milestones.forEach((value, index) => {
      const milestone = requireRecord(value, `${label}.milestones[${index}]`, errors);
      ["id", "title", "shortTitle", "description"].forEach((key) => {
        requireString(milestone, key, `${label}.milestones[${index}]`, errors);
      });
    });
  }

  if (!Array.isArray(topic.blocks) || topic.blocks.length === 0) {
    errors.push(`${label}.blocks must contain at least one block`);
  } else {
    topic.blocks.forEach((value, index) => {
      const path = `${label}.blocks[${index}]`;
      const block = requireRecord(value, path, errors);
      ["id", "milestoneId", "kind", "eyebrow", "title", "learningObjective", "takeaway", "bridge"].forEach((key) => {
        requireString(block, key, path, errors);
      });
      requireStringArray(block, "coreFacts", path, errors);
      requireStringArray(block, "sourceIds", path, errors);
      if (!Number.isInteger(block.order) || (block.order as number) < 1) errors.push(`${path}.order must be a positive integer`);
      if (!Number.isInteger(block.estimatedSeconds) || (block.estimatedSeconds as number) < 1) errors.push(`${path}.estimatedSeconds must be a positive integer`);
      const presentations = requireRecord(block.presentations, `${path}.presentations`, errors);
      validatePresentation(presentations.standard, `${path}.presentations.standard`, false, errors);
      validatePresentation(presentations.story, `${path}.presentations.story`, false, errors);
      validatePresentation(presentations.challenge, `${path}.presentations.challenge`, true, errors);
      if (block.visual !== undefined) {
        const visual = requireRecord(block.visual, `${path}.visual`, errors);
        ["type", "title", "caption", "alt"].forEach((key) => requireString(visual, key, `${path}.visual`, errors));
      }
    });
  }

  if (errors.length > 0) throw new Error(`${label} failed runtime validation:\n${errors.join("\n")}`);
  const parsed = value as Topic;
  const invariants = topicInvariantErrors(parsed);
  if (invariants.length > 0) throw new Error(`${label} failed content validation:\n${invariants.join("\n")}`);
  return parsed;
}

export function parseUiConfig(value: unknown): UiConfig {
  const errors: string[] = [];
  const config = requireRecord(value, "UI config", errors);
  requireString(config, "schemaVersion", "UI config", errors);
  const brand = requireRecord(config.brand, "UI config.brand", errors);
  ["name", "mark", "tagline"].forEach((key) => requireString(brand, key, "UI config.brand", errors));
  const defaults = requireRecord(config.defaults, "UI config.defaults", errors);
  ["topicId", "mode", "theme"].forEach((key) => requireString(defaults, key, "UI config.defaults", errors));
  const features = requireRecord(config.features, "UI config.features", errors);
  ["sharing", "resume", "milestones", "challengeHints", "keyboardNavigation"].forEach((key) => {
    if (typeof features[key] !== "boolean") errors.push(`UI config.features.${key} must be boolean`);
  });
  const content = requireRecord(config.content, "UI config.content", errors);
  if (!Number.isInteger(content.windowRadius)) errors.push("UI config.content.windowRadius must be an integer");
  ["progressStorageKey", "preferencesStorageKey"].forEach((key) => requireString(content, key, "UI config.content", errors));
  const themes = requireRecord(config.themes, "UI config.themes", errors);
  ["light", "dark"].forEach((themeName) => {
    const theme = requireRecord(themes[themeName], `UI config.themes.${themeName}`, errors);
    ["background", "surface", "surfaceStrong", "text", "muted", "border"].forEach((key) => {
      requireString(theme, key, `UI config.themes.${themeName}`, errors);
    });
  });
  if (errors.length > 0) throw new Error(`UI config failed runtime validation:\n${errors.join("\n")}`);
  return value as UiConfig;
}
