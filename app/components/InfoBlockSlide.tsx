"use client";

import {
  ArrowRight,
  Check,
  Clock3,
  Code2,
  Copy,
  Eye,
  Lightbulb,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { type KeyboardEvent, useState } from "react";
import type {
  ExplanationMode,
  InfoBlock,
  Milestone,
  Source,
} from "@/app/lib/types";
import { VisualRenderer } from "./VisualRenderer";
import { SyntaxHighlightedCode } from "./SyntaxHighlightedCode";

function CodeSample({
  code,
}: {
  code: { language: string; caption: string; lines: string[]; startLine?: number };
}) {
  const [copied, setCopied] = useState(false);

  const copyWithSelectionFallback = (value: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = value;
    textArea.setAttribute("readonly", "");
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.append(textArea);
    textArea.select();
    const succeeded = document.execCommand("copy");
    textArea.remove();
    if (!succeeded) throw new Error("Browser copy command was rejected");
  };

  const copyCode = async () => {
    const value = code.lines.join("\n");
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(value);
      } catch {
        copyWithSelectionFallback(value);
      }
    } else {
      copyWithSelectionFallback(value);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const scrollCodeWithKeyboard = (event: KeyboardEvent<HTMLPreElement>) => {
    const pane = event.currentTarget;
    if (pane.scrollHeight <= pane.clientHeight) return;

    const page = Math.max(80, pane.clientHeight * 0.8);
    const deltas: Partial<Record<string, number>> = {
      ArrowDown: 44,
      ArrowUp: -44,
      PageDown: page,
      PageUp: -page,
    };

    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      pane.scrollTop = event.key === "Home" ? 0 : pane.scrollHeight;
    } else if (deltas[event.key] !== undefined) {
      event.preventDefault();
      pane.scrollBy({ top: deltas[event.key], behavior: "smooth" });
    }
  };

  return (
    <figure className="code-sample">
      <figcaption>
        <span>{code.caption}</span>
        <span className="code-sample__actions">
          <em>{code.language}</em>
          <button type="button" onClick={() => void copyCode()} aria-label={`Copy ${code.caption}`}>
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </span>
      </figcaption>
      {/* A focusable region lets keyboard users scroll long code without moving the reel. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex, jsx-a11y/no-noninteractive-element-interactions */}
      <pre aria-label={code.caption} tabIndex={0} onKeyDown={scrollCodeWithKeyboard}>
        <SyntaxHighlightedCode language={code.language} lines={code.lines} startLine={code.startLine} />
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
  hasAlternativeTopic,
  codeRecall = false,
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
  hasAlternativeTopic: boolean;
  codeRecall?: boolean;
}) {
  const standardPresentation = mode === "challenge" ? null : block.presentations[mode];
  const challengePresentation = block.presentations.challenge;
  const hasVisual = Boolean(block.visual);
  const explainedSolution = codeRecall ? block.solution : undefined;

  return (
    <article
      className={`block-card block-card--${block.kind} ${hasVisual ? "block-card--visual" : ""} ${codeRecall ? "block-card--code-recall" : ""}`}
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

          {explainedSolution ? (
            <div className="dsa-reading">
              <section className="dsa-section dsa-problem">
                <div className="dsa-section__label"><Lightbulb size={16} /> Problem statement</div>
                <p>{challengePresentation.prompt}</p>
              </section>

              <section className="dsa-section dsa-solution-overview">
                <div className="dsa-section__label"><Check size={16} /> Core idea</div>
                <p className="dsa-core-idea">{explainedSolution.coreIdea}</p>
                <div className="dsa-pattern-connection">
                  <strong>Pattern connection</strong>
                  <p>{explainedSolution.patternConnection}</p>
                </div>
                <div className="dsa-nuances">
                  <strong>Problem-specific nuances</strong>
                  <ul>
                    {explainedSolution.nuances.map((nuance, nuanceIndex) => (
                      <li key={`${block.id}-nuance-${nuanceIndex}`}><Check size={14} /><span>{nuance}</span></li>
                    ))}
                  </ul>
                </div>
              </section>

              <section className="dsa-walkthrough">
                <div className="dsa-section__label"><Code2 size={16} /> Code walkthrough</div>
                <div className="dsa-code-steps">
                  {explainedSolution.codeSteps.map((step, stepIndex) => (
                    <article className="dsa-code-step" key={`${block.id}-code-step-${stepIndex}`}>
                      <header>
                        <span>{String(stepIndex + 1).padStart(2, "0")}</span>
                        <div>
                          <h2>{step.title}</h2>
                          <p>{step.explanation}</p>
                        </div>
                      </header>
                      <CodeSample code={step.code} />
                    </article>
                  ))}
                </div>
              </section>
            </div>
          ) : standardPresentation ? (
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
                <span><Lightbulb size={17} /> {codeRecall ? "Problem statement" : "Pause & predict"}</span>
                <p>{challengePresentation.prompt}</p>
              </div>
              {!revealed ? (
                <div className="challenge-card__actions">
                  {!codeRecall ? (
                    <button type="button" className="button button--ghost" onClick={onHint} aria-expanded={hinted}>
                      <Lightbulb size={16} /> {hinted ? "Hint shown" : "Show a hint"}
                    </button>
                  ) : null}
                  <button type="button" className="button button--primary" onClick={onReveal}>
                    <Eye size={16} /> {codeRecall ? "Show reference code" : "Reveal answer"}
                  </button>
                </div>
              ) : null}
              {hinted && !revealed && !codeRecall ? <p className="challenge-card__hint"><strong>Hint:</strong> {challengePresentation.hint}</p> : null}
              {revealed ? (
                <div className="challenge-card__answer">
                  <span><Check size={15} /> {codeRecall ? "Reference solution" : "Answer"}</span>
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
                    <RotateCcw size={13} /> {codeRecall ? "Hide solution" : "Try again"}
                  </button>
                </div>
              ) : null}
            </div>
          )}

          {!codeRecall ? (
            <div className="takeaway">
              <span>Keep this</span>
              <p>{block.takeaway}</p>
            </div>
          ) : null}

          {block.kind === "completion" ? (
            <button type="button" className="button button--primary completion-action" onClick={onExploreNext}>
              {hasAlternativeTopic ? "Open the other journey" : "Restart this journey"} <ArrowRight size={17} />
            </button>
          ) : null}
        </div>

        {block.visual ? <VisualRenderer visual={block.visual} resolvedTheme={resolvedTheme} /> : null}
      </div>

      {!codeRecall ? <footer className="block-card__footer">
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
      </footer> : null}
    </article>
  );
}
