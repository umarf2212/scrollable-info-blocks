"use client";

import {
  ArrowDown,
  ArrowUp,
  BookOpenText,
  Check,
  ChevronDown,
  Clock3,
  Map,
  Monitor,
  Moon,
  Share2,
  Sparkles,
  Sun,
  X,
} from "lucide-react";
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  ExplanationMode,
  StoredPreferences,
  StoredProgress,
  ThemePreference,
  Topic,
  UiConfig,
} from "@/app/lib/types";
import { calculateCompletedMilestones, calculateProgressPercent } from "@/app/lib/progress";
import { isInsideMountWindow } from "@/app/lib/windowing";
import { InfoBlockSlide } from "./InfoBlockSlide";

type OpenPanel = "topics" | "milestones" | null;

const modeLabels: Record<ExplanationMode, { short: string; description: string }> = {
  standard: { short: "Clear", description: "Direct, structured explanation" },
  story: { short: "Story", description: "A connected narrative" },
  challenge: { short: "Challenge", description: "Predict, reveal, remember" },
};

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function versionKey(topic: Topic): string {
  return `${topic.id}@${topic.version}`;
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && Boolean(target.closest("button, a, input, textarea, select, summary, [tabindex], [role='dialog']"));
}

function ThemeIcon({ preference, resolved }: { preference: ThemePreference; resolved: "light" | "dark" }) {
  if (preference === "system") return <Monitor size={18} />;
  return resolved === "dark" ? <Moon size={18} /> : <Sun size={18} />;
}

export function InfoBlocksApp({
  topics,
  config,
  codeRecall = false,
}: {
  topics: Topic[];
  config: UiConfig;
  codeRecall?: boolean;
}) {
  const defaultTopic = topics.find((topic) => topic.id === config.defaults.topicId) ?? topics[0];
  const [topicId, setTopicId] = useState(defaultTopic.id);
  const lockedMode: ExplanationMode | null = codeRecall ? "challenge" : null;
  const [mode, setMode] = useState<ExplanationMode>(lockedMode ?? config.defaults.mode);
  const [theme, setTheme] = useState<ThemePreference>(config.defaults.theme);
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  const [activeIndex, setActiveIndex] = useState(0);
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const [hinted, setHinted] = useState<Record<string, boolean>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [storedProgress, setStoredProgress] = useState<StoredProgress>({});
  const [resumeOffer, setResumeOffer] = useState<{ topicId: string; blockId: string } | null>(null);
  const [toast, setToast] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const feedRef = useRef<HTMLDivElement>(null);
  const initialBlockRef = useRef<string | null>(null);

  const topic = useMemo(
    () => topics.find((candidate) => candidate.id === topicId) ?? defaultTopic,
    [defaultTopic, topicId, topics],
  );
  const activeBlock = topic.blocks[activeIndex] ?? topic.blocks[0];
  const activeMilestone = topic.milestones.find((milestone) => milestone.id === activeBlock.milestoneId) ?? topic.milestones[0];
  const progressFraction = (activeIndex + 1) / topic.blocks.length;
  const progressPercent = calculateProgressPercent(activeIndex, topic.blocks.length);
  const themeTokens = config.themes[resolvedTheme];
  const appStyle = {
    "--app-bg": themeTokens.background,
    "--surface": themeTokens.surface,
    "--surface-strong": themeTokens.surfaceStrong,
    "--text": themeTokens.text,
    "--muted": themeTokens.muted,
    "--border": themeTokens.border,
    "--accent": topic.accent,
    "--progress": `${progressFraction * 360}deg`,
  } as CSSProperties;

  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = "smooth") => {
    const boundedIndex = Math.max(0, Math.min(index, topic.blocks.length - 1));
    const target = feedRef.current?.querySelector<HTMLElement>(`[data-block-index="${boundedIndex}"]`);
    target?.scrollIntoView({ block: "start", behavior });
  }, [topic.blocks.length]);

  useEffect(() => {
    const savedProgress = safeParse<StoredProgress>(localStorage.getItem(config.content.progressStorageKey), {});
    const savedPreferences = safeParse<StoredPreferences | null>(localStorage.getItem(config.content.preferencesStorageKey), null);
    const url = new URL(window.location.href);
    const urlTopicId = url.searchParams.get("topic");
    const urlMode = url.searchParams.get("mode") as ExplanationMode | null;
    const urlBlockId = url.searchParams.get("block");

    const preferredTopicId = topics.some((item) => item.id === urlTopicId)
      ? (urlTopicId as string)
      : topics.some((item) => item.id === savedPreferences?.topicId)
        ? (savedPreferences?.topicId as string)
        : defaultTopic.id;
    const preferredMode = lockedMode ?? (urlMode && urlMode in modeLabels
      ? urlMode
      : savedPreferences?.mode && savedPreferences.mode in modeLabels
        ? savedPreferences.mode
        : config.defaults.mode);
    const preferredTheme = savedPreferences?.theme ?? config.defaults.theme;
    const preferredTopic = topics.find((item) => item.id === preferredTopicId) ?? defaultTopic;
    const savedTopicProgress = savedProgress[versionKey(preferredTopic)];

    const frame = window.requestAnimationFrame(() => {
      setStoredProgress(savedProgress);
      setTopicId(preferredTopicId);
      setMode(preferredMode);
      setTheme(preferredTheme);
      if (urlBlockId && preferredTopic.blocks.some((block) => block.id === urlBlockId)) {
        initialBlockRef.current = urlBlockId;
      } else if (config.features.resume && savedTopicProgress?.blockId && savedTopicProgress.blockId !== preferredTopic.blocks[0].id) {
        setResumeOffer({ topicId: preferredTopic.id, blockId: savedTopicProgress.blockId });
      }
      setHydrated(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [config, defaultTopic, lockedMode, topics]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      const nextResolved = theme === "system" ? (media.matches ? "dark" : "light") : theme;
      setResolvedTheme(nextResolved);
      document.documentElement.dataset.theme = nextResolved;
      document.documentElement.style.colorScheme = nextResolved;
    };
    applyTheme();
    media.addEventListener("change", applyTheme);
    return () => media.removeEventListener("change", applyTheme);
  }, [theme]);

  useEffect(() => {
    if (!hydrated) return;
    const preferences: StoredPreferences = { mode, theme, topicId: topic.id };
    localStorage.setItem(config.content.preferencesStorageKey, JSON.stringify(preferences));
  }, [config.content.preferencesStorageKey, hydrated, mode, theme, topic.id]);

  useEffect(() => {
    if (!hydrated) return;
    const blockId = initialBlockRef.current;
    const targetIndex = blockId ? topic.blocks.findIndex((block) => block.id === blockId) : 0;
    initialBlockRef.current = null;
    setActiveIndex(Math.max(0, targetIndex));
    window.requestAnimationFrame(() => scrollToIndex(Math.max(0, targetIndex), "auto"));
  }, [hydrated, scrollToIndex, topic.id, topic.blocks]);

  useEffect(() => {
    const root = feedRef.current;
    if (!root) return;
    const sections = [...root.querySelectorAll<HTMLElement>("[data-block-index]")];
    const observer = new IntersectionObserver(
      () => {
        const rootRect = root.getBoundingClientRect();
        const rootCenter = rootRect.top + rootRect.height / 2;
        let nextIndex = activeIndex;
        let smallestDistance = Number.POSITIVE_INFINITY;
        sections.forEach((section) => {
          const rect = section.getBoundingClientRect();
          const distance = Math.abs(rect.top + rect.height / 2 - rootCenter);
          if (distance < smallestDistance) {
            smallestDistance = distance;
            nextIndex = Number(section.dataset.blockIndex ?? 0);
          }
        });
        setActiveIndex((current) => (current === nextIndex ? current : nextIndex));
      },
      { root, threshold: [0.35, 0.55, 0.75] },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [activeIndex, topic.id, topic.blocks.length]);

  useEffect(() => {
    if (!hydrated || !activeBlock) return;
    const key = versionKey(topic);
    const persistFrame = window.requestAnimationFrame(() => {
      setStoredProgress((current) => {
        const existing = current[key];
        const highestOrder = Math.max(existing?.highestOrder ?? 0, activeBlock.order);
        const completedMilestones = calculateCompletedMilestones(topic.milestones, topic.blocks, highestOrder);
        const next: StoredProgress = {
          ...current,
          [key]: {
            blockId: activeBlock.id,
            highestOrder,
            completedMilestones,
            updatedAt: new Date().toISOString(),
          },
        };
        localStorage.setItem(config.content.progressStorageKey, JSON.stringify(next));
        return next;
      });
    });

    const url = new URL(window.location.href);
    url.searchParams.set("topic", topic.id);
    url.searchParams.set("block", activeBlock.id);
    url.searchParams.set("mode", mode);
    window.history.replaceState({}, "", `${url.pathname}${url.search}`);

    const timer = window.setTimeout(() => {
      setAnnouncement(`Block ${activeBlock.order} of ${topic.blocks.length}: ${activeBlock.title}`);
    }, 350);
    return () => {
      window.cancelAnimationFrame(persistFrame);
      window.clearTimeout(timer);
    };
  }, [activeBlock, config.content.progressStorageKey, hydrated, mode, topic]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (openPanel) {
        if (event.key === "Escape") setOpenPanel(null);
        return;
      }
      if (!config.features.keyboardNavigation || isInteractiveTarget(event.target)) return;
      if (["ArrowDown", "PageDown", " "].includes(event.key)) {
        event.preventDefault();
        scrollToIndex(activeIndex + 1);
      } else if (["ArrowUp", "PageUp"].includes(event.key)) {
        event.preventDefault();
        scrollToIndex(activeIndex - 1);
      } else if (event.key === "Home") {
        event.preventDefault();
        scrollToIndex(0);
      } else if (event.key === "End") {
        event.preventDefault();
        scrollToIndex(topic.blocks.length - 1);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeIndex, config.features.keyboardNavigation, openPanel, scrollToIndex, topic.blocks.length]);

  const selectTopic = (nextTopicId: string) => {
    if (nextTopicId === topic.id) {
      scrollToIndex(0);
    } else {
      initialBlockRef.current = topics.find((item) => item.id === nextTopicId)?.blocks[0].id ?? null;
      setTopicId(nextTopicId);
      setActiveIndex(0);
      setHinted({});
      setRevealed({});
    }
    setResumeOffer(null);
    setOpenPanel(null);
  };

  const jumpToBlock = (index: number) => {
    scrollToIndex(index);
    setOpenPanel(null);
  };

  const resume = () => {
    if (!resumeOffer) return;
    const resumeTopic = topics.find((item) => item.id === resumeOffer.topicId);
    const index = resumeTopic?.blocks.findIndex((block) => block.id === resumeOffer.blockId) ?? -1;
    if (resumeTopic && resumeTopic.id !== topic.id) {
      initialBlockRef.current = resumeOffer.blockId;
      setTopicId(resumeTopic.id);
    } else if (index >= 0) {
      scrollToIndex(index);
    }
    setResumeOffer(null);
  };

  const cycleTheme = () => {
    setTheme((current) => current === "system" ? "light" : current === "light" ? "dark" : "system");
  };

  const shareCurrent = async () => {
    const shareData = {
      title: `${activeBlock.title} · ${topic.title}`,
      text: `Continue this ${topic.shortTitle} learning journey at block ${activeBlock.order}.`,
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setToast("Share sheet opened");
      } else {
        await navigator.clipboard.writeText(shareData.url);
        setToast("Link copied to clipboard");
      }
    } catch (error) {
      if ((error as DOMException).name !== "AbortError") setToast("Could not share this link");
    }
  };

  const selectOtherTopic = () => {
    const other = topics.find((candidate) => candidate.id !== topic.id) ?? topics[0];
    selectTopic(other.id);
  };

  const currentProgress = storedProgress[versionKey(topic)];
  const currentMilestoneIndex = topic.milestones.findIndex((milestone) => milestone.id === activeMilestone.id);

  return (
    <main className="infoblocks-app" style={appStyle} data-mode={mode} data-experience={codeRecall ? "code-recall" : "default"}>
      <a href="#active-learning-block" className="skip-link">Skip to current learning block</a>
      <header className="app-header">
        <button type="button" className="topic-trigger" onClick={() => setOpenPanel("topics")} aria-label={`Choose topic. Current topic: ${topic.title}`}>
          <span className="brand-mark">{config.brand.mark}</span>
          <span className="topic-trigger__copy">
            <small>{config.brand.name}</small>
            <strong>{topic.shortTitle}</strong>
          </span>
          <ChevronDown size={17} />
        </button>

        <div className="app-header__context" aria-hidden="true">
          <span>{activeMilestone.shortTitle}</span>
          <i />
          <span>{codeRecall ? "Problem → reference code" : modeLabels[mode].description}</span>
        </div>

        <div className="app-header__actions">
          {config.features.sharing ? (
            <button type="button" className="icon-button header-share" onClick={() => void shareCurrent()} aria-label="Share the current block">
              <Share2 size={18} />
            </button>
          ) : null}
          <button type="button" className="icon-button" onClick={cycleTheme} aria-label={`Theme: ${theme}. Activate to change theme`}>
            <ThemeIcon preference={theme} resolved={resolvedTheme} />
          </button>
          <button
            type="button"
            className="progress-ring"
            onClick={() => setOpenPanel("milestones")}
            aria-label={`${progressPercent}% complete. Open milestones`}
          >
            <span>{progressPercent}</span>
          </button>
        </div>
      </header>

      <div className="feed" ref={feedRef} aria-label={`${topic.title} learning feed`}>
        {topic.blocks.map((block, index) => {
          const shouldMount = isInsideMountWindow(index, activeIndex, config.content.windowRadius);
          const milestone = topic.milestones.find((candidate) => candidate.id === block.milestoneId) ?? topic.milestones[0];
          const sources = topic.sources.filter((source) => block.sourceIds.includes(source.id));
          const stateKey = `${topic.id}:${block.id}`;
          return (
            <section
              id={index === activeIndex ? "active-learning-block" : undefined}
              className={`block-shell ${index === activeIndex ? "block-shell--active" : ""}`}
              data-block-index={index}
              data-block-id={block.id}
              key={`${topic.id}-${block.id}`}
              aria-current={index === activeIndex ? "step" : undefined}
              aria-label={`Block ${index + 1} of ${topic.blocks.length}: ${block.title}`}
            >
              {shouldMount ? (
                <div className="block-shell__inner">
                  <InfoBlockSlide
                    block={block}
                    milestone={milestone}
                    mode={mode}
                    index={index}
                    total={topic.blocks.length}
                    sources={sources}
                    resolvedTheme={resolvedTheme}
                    hinted={Boolean(hinted[stateKey])}
                    revealed={Boolean(revealed[stateKey])}
                    onHint={() => setHinted((current) => ({ ...current, [stateKey]: true }))}
                    onReveal={() => setRevealed((current) => ({ ...current, [stateKey]: true }))}
                    onResetChallenge={() => {
                      setHinted((current) => ({ ...current, [stateKey]: false }));
                      setRevealed((current) => ({ ...current, [stateKey]: false }));
                    }}
                    onExploreNext={selectOtherTopic}
                    hasAlternativeTopic={topics.length > 1}
                    codeRecall={codeRecall}
                  />
                </div>
              ) : (
                <div className="block-placeholder" aria-hidden="true"><span>{String(index + 1).padStart(2, "0")}</span></div>
              )}
            </section>
          );
        })}
      </div>

      {config.features.milestones ? (
        <nav className="milestone-rail" aria-label="Topic milestones">
          <span className="milestone-rail__label">Journey</span>
          <div className="milestone-rail__line" />
          {topic.milestones.map((milestone, index) => {
            const firstBlockIndex = topic.blocks.findIndex((block) => block.milestoneId === milestone.id);
            const complete = Boolean(currentProgress?.completedMilestones.includes(milestone.id));
            const current = index === currentMilestoneIndex;
            return (
              <button
                type="button"
                className={`${current ? "is-current" : ""} ${complete ? "is-complete" : ""}`}
                key={milestone.id}
                onClick={() => jumpToBlock(firstBlockIndex)}
                aria-label={`${milestone.title}${complete ? ", completed" : current ? ", current" : ""}`}
                aria-current={current ? "step" : undefined}
              >
                <span>{complete ? <Check size={11} /> : index + 1}</span>
                <em>{milestone.shortTitle}</em>
              </button>
            );
          })}
        </nav>
      ) : null}

      <div className="mode-dock" aria-label={codeRecall ? "Code recall navigation" : "Explanation mode"}>
        <button type="button" className="dock-arrow" onClick={() => scrollToIndex(activeIndex - 1)} disabled={activeIndex === 0} aria-label="Previous block">
          <ArrowUp size={17} />
        </button>
        {codeRecall ? (
          <div className="code-recall-dock"><BookOpenText size={13} /> Problem → Code</div>
        ) : <div className="mode-switch">
          {(Object.keys(modeLabels) as ExplanationMode[]).map((item) => (
            <button type="button" key={item} className={mode === item ? "is-active" : ""} aria-pressed={mode === item} onClick={() => setMode(item)}>
              {item === "story" ? <Sparkles size={13} /> : item === "challenge" ? <BookOpenText size={13} /> : null}
              {modeLabels[item].short}
            </button>
          ))}
        </div>}
        <button type="button" className="dock-arrow" onClick={() => scrollToIndex(activeIndex + 1)} disabled={activeIndex === topic.blocks.length - 1} aria-label="Next block">
          <ArrowDown size={17} />
        </button>
      </div>

      <div className="block-position" aria-hidden="true">
        <span>{String(activeIndex + 1).padStart(2, "0")}</span>
        <i />
        <span>{String(topic.blocks.length).padStart(2, "0")}</span>
      </div>

      {resumeOffer ? (
        <div className="resume-toast">
          <div>
            <Clock3 size={17} />
            <p><strong>Continue where you paused?</strong><span>Your place is saved on this device.</span></p>
          </div>
          <button type="button" onClick={resume}>Resume</button>
          <button type="button" className="resume-toast__close" onClick={() => setResumeOffer(null)} aria-label="Dismiss resume prompt"><X size={15} /></button>
        </div>
      ) : null}

      {openPanel ? (
        <div className="panel-backdrop">
          <aside className="side-panel" role="dialog" aria-modal="true" aria-labelledby="panel-title">
            <div className="side-panel__head">
              <div>
                <span>{openPanel === "topics" ? "Library" : `${progressPercent}% complete`}</span>
                <h2 id="panel-title">{openPanel === "topics" ? "Choose a journey" : "Journey map"}</h2>
              </div>
              <button type="button" className="icon-button" onClick={() => setOpenPanel(null)} aria-label="Close panel"><X size={20} /></button>
            </div>

            {openPanel === "topics" ? (
              <div className="topic-list">
                {topics.map((item, index) => {
                  const saved = storedProgress[versionKey(item)];
                  const percent = saved ? Math.round((saved.highestOrder / item.blocks.length) * 100) : 0;
                  return (
                    <button type="button" className={`topic-card ${item.id === topic.id ? "is-current" : ""}`} onClick={() => selectTopic(item.id)} key={item.id}>
                      <span className="topic-card__number" style={{ "--topic-accent": item.accent } as CSSProperties}>{String(index + 1).padStart(2, "0")}</span>
                      <div>
                        <span>{item.category} · {item.estimatedMinutes} min</span>
                        <h3>{item.title}</h3>
                        <p>{item.description}</p>
                        <small><i style={{ width: `${percent}%`, backgroundColor: item.accent }} /> {percent}% explored</small>
                      </div>
                      {item.id === topic.id ? <em>Current</em> : null}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="journey-list">
                <div className="journey-summary">
                  <Map size={18} />
                  <p>{topic.description}</p>
                </div>
                {topic.milestones.map((milestone, index) => {
                  const firstIndex = topic.blocks.findIndex((block) => block.milestoneId === milestone.id);
                  const blocksInMilestone = topic.blocks.filter((block) => block.milestoneId === milestone.id);
                  const complete = Boolean(currentProgress?.completedMilestones.includes(milestone.id));
                  const current = index === currentMilestoneIndex;
                  return (
                    <button type="button" className={`${current ? "is-current" : ""} ${complete ? "is-complete" : ""}`} onClick={() => jumpToBlock(firstIndex)} key={milestone.id}>
                      <span>{complete ? <Check size={15} /> : index + 1}</span>
                      <div><strong>{milestone.title}</strong><p>{milestone.description}</p><small>{blocksInMilestone.length} blocks</small></div>
                    </button>
                  );
                })}
                <div className="journey-scope">
                  <span>By the end</span>
                  <ul>{topic.learningOutcomes.map((outcome) => <li key={outcome}>{outcome}</li>)}</ul>
                </div>
              </div>
            )}
          </aside>
        </div>
      ) : null}

      {toast ? <div className="app-toast" role="status">{toast}</div> : null}
      <p className="sr-only" aria-live="polite">{announcement}</p>
    </main>
  );
}
