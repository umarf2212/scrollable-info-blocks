import type { Metadata } from "next";
import { InfoBlocksApp } from "@/app/components/InfoBlocksApp";
import { parseTopic, parseUiConfig } from "@/app/lib/validate-content";
import agentOrchestrationData from "@/content/topics/agent-orchestration.json";
import dsaInterviewRecallData from "@/content/topics/dsa-interview-recall.json";
import graphFundamentalsData from "@/content/topics/graph-fundamentals.json";
import uiConfigData from "@/content/config/ui-config.json";

export const metadata: Metadata = {
  title: "Scroll with somewhere to arrive",
  description:
    "Learn AI agent orchestration or graph algorithms through finite, full-screen knowledge blocks.",
};

function loadContent() {
  try {
    const topics = [
      parseTopic(agentOrchestrationData, "AI Agent Orchestration"),
      parseTopic(graphFundamentalsData, "Graph Fundamentals"),
    ];
    const dsaJourney = parseTopic(dsaInterviewRecallData, "DSA Explained");
    const config = parseUiConfig(uiConfigData);
    return { topics, dsaJourney, config, error: null };
  } catch (error) {
    return {
      topics: null,
      dsaJourney: null,
      config: null,
      error: error instanceof Error ? error.message : "Unknown content error",
    };
  }
}

export default function Home() {
  const result = loadContent();
  if (result.error || !result.topics || !result.dsaJourney || !result.config) {
    return (
      <main className="content-error">
        <div>
          <p>InfoBlocks content check</p>
          <h1>This journey could not be loaded.</h1>
          <p>The interface is intact, but one of the JSON files needs attention.</p>
          <pre>{result.error}</pre>
        </div>
      </main>
    );
  }
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  return (
    <InfoBlocksApp
      topics={result.topics}
      config={result.config}
      linkedJourneys={[{ topic: result.dsaJourney, href: `${basePath}/dsa-roadmap/` }]}
    />
  );
}
