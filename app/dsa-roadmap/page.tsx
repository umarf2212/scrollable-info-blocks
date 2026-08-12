import type { Metadata } from "next";
import { InfoBlocksApp } from "@/app/components/InfoBlocksApp";
import { parseTopic, parseUiConfig } from "@/app/lib/validate-content";
import uiConfigData from "@/content/config/ui-config.json";
import dsaInterviewRecallData from "@/content/topics/dsa-interview-recall.json";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

export const metadata: Metadata = {
  title: "DSA Interview Recall",
  description:
    "Actively recall 62 DSA roadmap problems through their interview triggers, invariants, complexity, and edge cases.",
  alternates: { canonical: `${siteUrl}/dsa-roadmap/` },
  openGraph: {
    title: "DSA Interview Recall · InfoBlocks",
    description: "62 problems. Nine pattern shelves. One finite active-recall journey.",
    url: `${siteUrl}/dsa-roadmap/`,
    images: [
      {
        url: `${siteUrl}/dsa-roadmap-og.png`,
        width: 1659,
        height: 948,
        alt: "DSA Interview Recall in InfoBlocks",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DSA Interview Recall · InfoBlocks",
    description: "62 problems. Nine pattern shelves. One finite active-recall journey.",
    images: [`${siteUrl}/dsa-roadmap-og.png`],
  },
};

function loadDsaContent() {
  try {
    const topic = parseTopic(dsaInterviewRecallData, "DSA Interview Recall");
    const config = parseUiConfig({
      ...uiConfigData,
      defaults: {
        ...uiConfigData.defaults,
        topicId: "dsa-interview-recall",
        mode: "challenge",
      },
      content: {
        ...uiConfigData.content,
        progressStorageKey: "infoblocks.dsa-recall.progress.v1",
        preferencesStorageKey: "infoblocks.dsa-recall.preferences.v1",
      },
    });
    return { topic, config, error: null };
  } catch (error) {
    return {
      topic: null,
      config: null,
      error: error instanceof Error ? error.message : "Unknown content error",
    };
  }
}

export default function DsaRoadmapPage() {
  const result = loadDsaContent();
  if (result.error || !result.topic || !result.config) {
    return (
      <main className="content-error">
        <div>
          <p>DSA recall content check</p>
          <h1>This journey could not be loaded.</h1>
          <p>The interface is intact, but the roadmap JSON needs attention.</p>
          <pre>{result.error}</pre>
        </div>
      </main>
    );
  }

  return <InfoBlocksApp topics={[result.topic]} config={result.config} />;
}
