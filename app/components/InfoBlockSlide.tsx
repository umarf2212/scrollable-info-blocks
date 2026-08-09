"use client";

import {
  ArrowRight,
  Check,
  Clock3,
  Eye,
  Lightbulb,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import type {
  ExplanationMode,
  InfoBlock,
  Milestone,
  Source,
} from "@/app/lib/types";
import { VisualRenderer } from "./VisualRenderer";

function CodeSample({
  code,
}: {
  code: { language: string; caption: string; lines: string[] };
}) {
  return (
    <figure className="code-sample">
      <figcaption>
        <span>{code.caption}</span>
        <em>{code.language}</em>
      </figcaption>
      <pre aria-label={code.caption}>
        <code>{code.lines.join("\n")}</code>
      </pre>
    </figure>
  );
}

export function InfoBlockSlide({
  block,
  milestone,
  mode,
  index,
  total,
  sources,
  resolvedTheme,
  hinted,
  revealed,
  onHint,
  onReveal,
  onResetChallenge,
  onExploreNext,
}: {
  block: InfoBlock;
  milestone: Milestone;
  mode: ExplanationMode;
  index: number;
  total: number;
  sources: Source[];
  resolvedTheme: "light" | "dark";
  hinted: boolean;
  revealed: boolean;
  onHint: () => void;
  onReveal: () => void;
  onResetChallenge: () => void;
  onExploreNext: () => void;
}) {
  const standardPresentation = mode === "challenge" ? null : block.presentations[mode];
  const challengePresentation = block.presentations.challenge;
  const hasVisual = Boolean(block.visual);

  return (
    <article
      className={`block-card block-card--${block.kind} ${hasVisual ? "block-card--visual" : ""}`}
      aria-labelledby={`title-${block.id}`}
    >
      <div className="block-card__meta">
        <span className="block-card__chapter">
          <i />
          {milestone.shortTitle}
        </span>
        <span className="block-card__count">{String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
        <span className="block-card__time"><Clock3 size={13} /> {block.estimatedSeconds}s</span>
      </div>

      <div className="block-card__grid">
        <div className="block-card__copy">
          <p className="block-card__eyebrow">{block.eyebrow}</p>
          <h1 id={`title-${block.id}`}>{block.title}</h1>

          {standardPresentation ? (
            <div className="presentation">
              <p className="presentation__hook">
                {mode === "story" ? <Sparkles size={17} aria-hidden="true" /> : null}
                {standardPresentation.hook}
              </p>
              <div className="presentation__body">
                {standardPresentation.body.map((paragraph, paragraphIndex) => (
                  <p key={`${block.id}-body-${paragraphIndex}`}>{paragraph}</p>
                ))}
              </div>
              {standardPresentation.bullets?.length ? (
                <ul className="presentation__bullets">
                  {standardPresentation.bullets.map((bullet, bulletIndex) => (
                    <li key={`${block.id}-bullet-${bulletIndex}`}><Check size={14} /> <span>{bullet}</span></li>
                  ))}
                </ul>
              ) : null}
              {standardPresentation.code ? <CodeSample code={standardPresentation.code} /> : null}
            </div>
          ) : (
            <div className="challenge-card">
              <div className="challenge-card__prompt">
                <span><Lightbulb size={17} /> Pause & predict</span>
                <p>{challengePresentation.prompt}</p>
              </div>
              {!revealed ? (
                <div className="challenge-card__actions">
                  <button type="button" className="button button--ghost" onClick={onHint} aria-expanded={hinted}>
                    <Lightbulb size={16} /> {hinted ? "Hint shown" : "Show a hint"}
                  </button>
                  <button type="button" className="button button--primary" onClick={onReveal}>
                    <Eye size={16} /> Reveal answer
                  </button>
                </div>
              ) : null}
              {hinted && !revealed ? <p className="challenge-card__hint"><strong>Hint:</strong> {challengePresentation.hint}</p> : null}
              {revealed ? (
                <div className="challenge-card__answer">
                  <span><Check size={15} /> Answer</span>
                  <p><strong>{challengePresentation.answer}</strong></p>
                  {challengePresentation.body.map((paragraph, paragraphIndex) => (
                    <p key={`${block.id}-challenge-${paragraphIndex}`}>{paragraph}</p>
                  ))}
                  {challengePresentation.bullets?.length ? (
                    <ul className="presentation__bullets">
                      {challengePresentation.bullets.map((bullet, bulletIndex) => (
                        <li key={`${block.id}-challenge-bullet-${bulletIndex}`}><Check size={14} /><span>{bullet}</span></li>
                      ))}
                    </ul>
                  ) : null}
                  {challengePresentation.code ? <CodeSample code={challengePresentation.code} /> : null}
                  <button type="button" className="challenge-card__reset" onClick={onResetChallenge}>
                    <RotateCcw size={13} /> Try again
                  </button>
                </div>
              ) : null}
            </div>
          )}

          <div className="takeaway">
            <span>Keep this</span>
            <p>{block.takeaway}</p>
          </div>

          {block.kind === "completion" ? (
            <button type="button" className="button button--primary completion-action" onClick={onExploreNext}>
              Open the other journey <ArrowRight size={17} />
            </button>
          ) : null}
        </div>

        {block.visual ? <VisualRenderer visual={block.visual} resolvedTheme={resolvedTheme} /> : null}
      </div>

      <footer className="block-card__footer">
        <p><ArrowRight size={14} /> <span>{block.bridge}</span></p>
        {sources.length > 0 ? (
          <details className="sources">
            <summary>Sources · {sources.length}</summary>
            <div>
              {sources.map((source) => (
                <a key={source.id} href={source.url} target="_blank" rel="noreferrer">{source.title}</a>
              ))}
            </div>
          </details>
        ) : null}
      </footer>
    </article>
  );
}
