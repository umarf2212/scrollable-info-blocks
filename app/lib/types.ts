export type ExplanationMode = "standard" | "story" | "challenge";
export type ThemePreference = "light" | "dark" | "system";

export interface Source {
  id: string;
  title: string;
  url: string;
}

export interface Milestone {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
}

export interface CodeSample {
  language: string;
  caption: string;
  lines: string[];
  startLine?: number;
}

export interface ExplainedCodeStep {
  title: string;
  explanation: string;
  code: CodeSample;
}

export interface DsaSolution {
  coreIdea: string;
  patternConnection: string;
  nuances: string[];
  codeSteps: ExplainedCodeStep[];
}

export interface StandardPresentation {
  hook: string;
  body: string[];
  bullets?: string[];
  code?: CodeSample;
}

export interface ChallengePresentation {
  prompt: string;
  hint: string;
  answer: string;
  body: string[];
  bullets?: string[];
  code?: CodeSample;
}

export type VisualType =
  | "mermaid"
  | "agent-flow"
  | "sequence"
  | "graph"
  | "dsu"
  | "edge-sort"
  | "comparison";

export interface BlockVisual {
  type: VisualType;
  title: string;
  caption: string;
  alt: string;
  definition?: string;
  data?: Record<string, unknown>;
}

export interface InfoBlock {
  id: string;
  milestoneId: string;
  order: number;
  kind: "concept" | "recap" | "completion";
  eyebrow: string;
  title: string;
  learningObjective: string;
  coreFacts: string[];
  estimatedSeconds: number;
  presentations: {
    standard: StandardPresentation;
    story: StandardPresentation;
    challenge: ChallengePresentation;
  };
  solution?: DsaSolution;
  visual?: BlockVisual;
  takeaway: string;
  bridge: string;
  sourceIds: string[];
}

export interface Topic {
  schemaVersion: "1.0.0";
  id: string;
  version: string;
  title: string;
  shortTitle: string;
  description: string;
  category: string;
  accent: string;
  estimatedMinutes: number;
  audience: string;
  prerequisites: string[];
  learningOutcomes: string[];
  sources: Source[];
  milestones: Milestone[];
  blocks: InfoBlock[];
}

export interface ThemeTokens {
  background: string;
  surface: string;
  surfaceStrong: string;
  text: string;
  muted: string;
  border: string;
}

export interface UiConfig {
  schemaVersion: "1.0.0";
  brand: {
    name: string;
    mark: string;
    tagline: string;
  };
  defaults: {
    topicId: string;
    mode: ExplanationMode;
    theme: ThemePreference;
  };
  features: {
    sharing: boolean;
    resume: boolean;
    milestones: boolean;
    challengeHints: boolean;
    keyboardNavigation: boolean;
  };
  content: {
    windowRadius: number;
    progressStorageKey: string;
    preferencesStorageKey: string;
  };
  themes: {
    light: ThemeTokens;
    dark: ThemeTokens;
  };
}

export interface StoredProgress {
  [topicVersionKey: string]: {
    blockId: string;
    highestOrder: number;
    completedMilestones: string[];
    updatedAt: string;
  };
}

export interface StoredPreferences {
  mode: ExplanationMode;
  theme: ThemePreference;
  topicId: string;
}
