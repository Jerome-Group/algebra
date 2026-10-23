"use client";
import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { ArrowLeft, ArrowUpRight, BookOpen, NotebookPen } from "lucide-react";
import {
  argumentSheetSchema,
  teachingEdition,
  type ArgumentSheet,
  type SavedArgument,
  type TeachingEdition,
} from "@/lib/algebra/argument-records";
import {
  argumentTarget,
  balancingRecovery,
  currentArgumentLesson,
  recoveryMatches,
} from "@/lib/algebra/argument-catalogue";
import { workTargetId } from "@/lib/algebra/navigation";
import { guidedContent } from "@/lib/algebra/guided";
import { learningMetadata } from "@/lib/algebra/learning";
import { learningRoutes } from "@/lib/algebra/routes";
import { useArguments } from "./ArgumentContext";
import { ArgumentWriting, ArgumentComparison } from "./ArgumentWriting";
import { ArgumentSupport } from "./ArgumentSupport";
import { ArgumentBackups } from "./ArgumentBackups";
import { Checkpoint } from "./Checkpoint";
import { Math as M, Prose, WrittenProse } from "./Math";

type Support = { lessonId: string; lab: boolean };
type Navigate = (
  targetId: string,
  unitId: string | null,
  support?: Support,
) => void;
type ArgumentState = ReturnType<typeof useArguments>;
type DeskView = "reconstruct" | "compare" | "consult" | "transfer";
type Replacement =
  | { kind: "target"; lessonId: string; unitId: string | null }
  | { kind: "saved"; saved: SavedArgument }
  | { kind: "new"; lessonId: string; unitId: string | null }
  | { kind: "import"; sheets: ArgumentSheet[] };

function ordinaryClick(event: MouseEvent<HTMLAnchorElement>) {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

function WorkLink({
  targetId,
  unitId,
  support,
  navigate,
  children,
  className,
}: {
  targetId: string;
  unitId: string | null;
  support?: Support;
  navigate: Navigate;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      className={className}
      href={`#${workTargetId(targetId, unitId ?? undefined, support)}`}
      onClick={(event) => {
        if (!ordinaryClick(event)) return;
        event.preventDefault();
        navigate(targetId, unitId, support);
      }}
    >
      {children}
    </a>
  );
}

export function ArgumentStartLink({
  lessonId,
  unitId,
  navigate,
}: {
  lessonId: string;
  unitId?: string;
  navigate: (targetId: string, unitId: string | null) => void;
}) {
  return (
    <WorkLink
      className="argument-start"
      targetId={lessonId}
      unitId={unitId ?? null}
      navigate={navigate}
    >
      <NotebookPen size={17} aria-hidden="true" /> Work on this argument
    </WorkLink>
  );
}

export function ArgumentReturnBar({
  navigate,
}: {
  navigate: (targetId: string, unitId: string | null) => void;
}) {
  const { active, dirty, phase } = useArguments();
  const visible = phase !== "hidden" && phase !== "loading";
  useEffect(() => {
    if (
      !visible ||
      !active ||
      !dirty ||
      !active.blocks.some((block) => block.text || block.question)
    )
      return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [active, dirty, visible]);
  if (!visible || !active) return null;
  const question = active.blocks.find(
    (block) => block.id === active.activeBlockId,
  )?.question;
  return (
    <aside className="argument-return" aria-label="Your argument in progress">
      <WorkLink
        targetId={active.lessonId}
        unitId={active.unitId}
        navigate={navigate}
      >
        <ArrowLeft size={16} aria-hidden="true" />
        <span>Return to my argument</span>
      </WorkLink>
      <span className="argument-return-title">
        <Prose>{argumentTarget(active.lessonId)?.navTitle || ""}</Prose>
      </span>
      {question && (
        <span className="argument-return-question">
          <WrittenProse>{question}</WrittenProse>
        </span>
      )}
      <span className="argument-return-state">
        {phase === "guest"
          ? "Temporary"
          : phase === "saving"
            ? "Saving"
            : phase === "failed" ||
                phase === "conflict" ||
                phase === "unsupported"
              ? "Save needs attention"
              : dirty
                ? "Unsaved"
                : "Saved"}
      </span>
    </aside>
  );
}

function SaveStatus({
  state,
  run,
}: {
  state: ArgumentState;
  run: (operation: () => Promise<void>) => void;
}) {
  let status: string;
  switch (state.phase) {
    case "hidden":
    case "loading":
      status = "Confirming your account before showing saved writing.";
      break;
    case "guest":
      status =
        "Temporary writing. Reloading or closing this page loses it. Export a copy to keep it.";
      break;
    case "saving":
      status = "Saving the captured writing. Later edits remain unsaved.";
      break;
    case "failed":
      status =
        state.message ||
        "Writing has not been saved. Retry the save or export a copy.";
      break;
    case "conflict":
      status =
        state.message ||
        "Another tab saved a different version. Your writing is still here. Choose which version to keep.";
      break;
    case "unsupported":
      status = `Some saved arguments need a newer version. Export a backup to retain them. ${state.dirty ? "Your current writing is unsaved." : state.acknowledged ? "Your current writing is saved." : "Your current argument has not been saved."}`;
      break;
    case "ready":
      status = state.dirty
        ? "Unsaved changes."
        : state.acknowledged
          ? "This writing is saved to your account."
          : "This argument has not been saved.";
      break;
    default: {
      const exhaustive: never = state.phase;
      status = exhaustive;
    }
  }
  return (
    <div className="argument-save-status" data-argument-phase={state.phase}>
      <p role="status">{status}</p>
      <div className="argument-actions">
        {state.phase === "failed" && (
          <button onClick={() => run(state.retry)}>
            {state.canRetry ? "Retry save" : "Reload saved arguments"}
          </button>
        )}
        {state.phase === "conflict" ? (
          <>
            <button onClick={state.useServerVersion}>
              {state.conflict
                ? "Use saved version"
                : "Accept deletion and discard local writing"}
            </button>
            <button onClick={() => run(state.saveCopy)}>
              Save my writing as a copy
            </button>
            {state.conflict && (
              <details>
                <summary>Read the other saved version</summary>
                {state.conflict.sheet.blocks.map((block) => (
                  <p className="argument-written-prose" key={block.id}>
                    <WrittenProse>{block.text || "Empty block"}</WrittenProse>
                  </p>
                ))}
              </details>
            )}
          </>
        ) : (
          state.phase !== "guest" && (
            <button
              className="argument-primary"
              disabled={
                !state.active ||
                !state.dirty ||
                (state.phase !== "ready" &&
                  state.phase !== "unsupported" &&
                  !(state.phase === "failed" && !state.canRetry))
              }
              onClick={() => run(state.save)}
            >
              {state.phase === "saving" ? "Saving…" : "Save argument"}
            </button>
          )
        )}
      </div>
    </div>
  );
}

export type ArgumentDeskProps = {
  targetId: string;
  unitId: string | null;
  support: Support | null;
  navigate: Navigate;
  openLesson: (lessonId: string, unitId?: string) => void;
  openCapstone: (unitId: string) => void;
  requestFocus: (id: string) => void;
};

export function ArgumentDesk({
  targetId,
  unitId,
  support,
  navigate,
  openLesson,
  openCapstone,
  requestFocus,
}: ArgumentDeskProps) {
  const state = useArguments();
  const [view, setView] = useState<DeskView>("reconstruct");
  const [notice, setNotice] = useState("");
  const [replacement, setReplacement] = useState<Replacement | null>(null);
  const [teaching, setTeaching] = useState<{
    lessonId: string;
    edition: TeachingEdition;
    recovery: boolean;
  } | null>(null);
  const target = currentArgumentLesson(targetId);
  const sheet = state.active;
  const phase = state.phase;
  const start = state.start;
  const resume = state.resume;
  const saved = state.saved;
  const privateHidden = state.phase === "hidden" || state.phase === "loading";
  const run = (operation: () => Promise<void>) => {
    setNotice("");
    void operation().catch((error: unknown) =>
      setNotice(
        error instanceof Error
          ? error.message
          : "The action could not finish. Your writing is still here.",
      ),
    );
  };
  useEffect(() => {
    let active = true;
    const ids =
      targetId === balancingRecovery.targetId
        ? balancingRecovery.bindings.map((binding) => binding.lessonId)
        : [targetId];
    void Promise.all(ids.map(teachingEdition))
      .then((editions) => {
        const edition = editions.find(
          (edition) => edition.lessonId === targetId,
        );
        if (active && edition)
          setTeaching({
            lessonId: targetId,
            edition,
            recovery: recoveryMatches(editions),
          });
      })
      .catch(() => {
        if (active) setTeaching(null);
      });
    return () => {
      active = false;
    };
  }, [targetId]);
  useEffect(() => {
    if (
      sheet ||
      replacement ||
      (phase !== "ready" && phase !== "guest" && phase !== "unsupported")
    )
      return;
    const attempts = saved.filter((saved) => saved.sheet.lessonId === targetId);
    if (attempts.length === 1) resume(attempts[0]);
    else if (!attempts.length)
      void start(targetId, unitId ?? undefined).catch((error: unknown) =>
        setNotice(
          error instanceof Error
            ? error.message
            : "Could not open this argument.",
        ),
      );
  }, [sheet, replacement, phase, start, resume, saved, targetId, unitId]);
  const applyReplacement = async (next: Replacement) => {
    switch (next.kind) {
      case "target":
        await state.start(next.lessonId, next.unitId ?? undefined);
        navigate(next.lessonId, next.unitId);
        break;
      case "saved": {
        const selected = state.saved.find(
          (saved) => saved.sheet.id === next.saved.sheet.id,
        );
        if (!selected)
          throw new Error(
            "This saved argument is no longer available. Refresh before choosing it again.",
          );
        state.resume(selected);
        navigate(selected.sheet.lessonId, selected.sheet.unitId);
        break;
      }
      case "new":
        await state.start(next.lessonId, next.unitId ?? undefined);
        navigate(next.lessonId, next.unitId);
        break;
      case "import": {
        await state.importSheets(next.sheets);
        const sheet = next.sheets[0];
        if (sheet) navigate(sheet.lessonId, sheet.unitId);
        break;
      }
      default: {
        const exhaustive: never = next;
        return exhaustive;
      }
    }
    setReplacement(null);
    setView("reconstruct");
  };
  const request = (next: Replacement) => {
    if (state.dirty) setReplacement(next);
    else run(() => applyReplacement(next));
  };
  const commit = (next: ArgumentSheet) => {
    const parsed = argumentSheetSchema.safeParse(next);
    if (!parsed.success) {
      setNotice(
        parsed.error.issues[0]?.message ??
          "This argument exceeds its writing limit.",
      );
      return;
    }
    setNotice("");
    state.edit(parsed.data);
  };
  const showPane = (next: DeskView) => {
    setView(next);
    if (support && next !== "consult")
      navigate(targetId, sheet?.unitId ?? unitId);
    const headings = {
      reconstruct: "argument-reconstruct-heading",
      compare: "argument-compare-heading",
      consult: support ? "support-heading" : "argument-consult-heading",
      transfer: "argument-transfer-heading",
    } satisfies Record<DeskView, string>;
    requestFocus(headings[next]);
  };
  const findSupport = () => {
    setView("consult");
    if (support) navigate(targetId, sheet?.unitId ?? unitId);
    requestFocus("argument-consult-heading");
  };
  if (!target)
    return (
      <section className="argument-desk">
        <h1 id="work-heading" tabIndex={-1}>
          Choose an existing argument
        </h1>
        <p>This argument is unavailable. Open a lesson to choose another.</p>
      </section>
    );
  const currentTeaching = teaching?.lessonId === targetId ? teaching : null;
  const historical =
    !!sheet &&
    !!currentTeaching &&
    currentTeaching.edition.digest !== sheet.edition.digest;
  const editionCurrent =
    !!sheet &&
    !!currentTeaching &&
    currentTeaching.edition.digest === sheet.edition.digest;
  const TeachingProse = editionCurrent ? Prose : WrittenProse;
  const mismatched = sheet && sheet.lessonId !== targetId;
  const mode = support ? "consult" : view;
  const unit = sheet?.unitId
    ? learningRoutes.find((unit) => unit.id === sheet.unitId)
    : undefined;
  const guide = guidedContent(targetId);
  const transferId = `${targetId}:transfer`;
  const publicSupport = support
    ? currentArgumentLesson(support.lessonId)
    : undefined;
  return (
    <article className="argument-desk" data-argument-target={targetId}>
      <header className="argument-heading">
        <div>
          <p className="section-kicker">
            ARGUMENT DESK · <Prose>{target.subject || ""}</Prose>
          </p>
          <h1 id="work-heading" tabIndex={-1}>
            <Prose>{target.navTitle || target.title}</Prose>
          </h1>
          <p>
            Write the argument. Keep the question. Return with a clearer next
            move.
          </p>
        </div>
        <a
          href={`#${target.id}`}
          className="argument-lesson-link"
          onClick={(event) => {
            if (!ordinaryClick(event)) return;
            event.preventDefault();
            openLesson(target.id, unit?.id);
          }}
        >
          <BookOpen size={16} aria-hidden="true" /> Read full lesson
        </a>
      </header>
      {support && (
        <section className="argument-route-support">
          <p className="section-kicker">CONSULTING FOR THIS ARGUMENT</p>
          <h2 id="support-heading" tabIndex={-1}>
            <Prose>{publicSupport?.navTitle ?? "Supporting lesson"}</Prose>
          </h2>
        </section>
      )}
      {privateHidden ? (
        <p role="status">
          Confirming your account before showing private writing.
        </p>
      ) : (
        <>
          <SaveStatus state={state} run={run} />
          {notice && (
            <p className="argument-notice" role="alert">
              {notice}
            </p>
          )}
          {replacement && (
            <section
              className="argument-confirmation"
              aria-label="Keep your unsaved argument"
            >
              <h2>Keep your current writing?</h2>
              <p>
                {state.dirty
                  ? "Opening another argument replaces this unsaved sheet. Save it or export a backup before continuing."
                  : "Your current writing is saved. Continue when you are ready."}
              </p>
              <div className="argument-actions">
                {state.dirty ? (
                  <>
                    <button
                      className="argument-primary"
                      disabled={
                        state.phase !== "ready" && state.phase !== "unsupported"
                      }
                      onClick={() => run(state.save)}
                    >
                      Save current argument
                    </button>
                    <button
                      disabled={state.phase === "saving"}
                      onClick={() => {
                        state.discardActive();
                        run(() => applyReplacement(replacement));
                      }}
                    >
                      Discard unsaved changes and continue
                    </button>
                  </>
                ) : (
                  <button
                    className="argument-primary"
                    onClick={() => run(() => applyReplacement(replacement))}
                  >
                    Continue with selected argument
                  </button>
                )}
                <button
                  onClick={() => {
                    setReplacement(null);
                    if (sheet) navigate(sheet.lessonId, sheet.unitId);
                  }}
                >
                  Keep current argument
                </button>
              </div>
            </section>
          )}
          {mismatched ? (
            <section className="argument-other-target">
              <h2>You have an argument in progress</h2>
              <p>
                <Prose>{argumentTarget(sheet.lessonId)?.navTitle || ""}</Prose>.
                Your writing stays there until you choose to open this argument.
              </p>
              <div className="argument-actions">
                <WorkLink
                  targetId={sheet.lessonId}
                  unitId={sheet.unitId}
                  navigate={navigate}
                >
                  Return to current argument
                </WorkLink>
                <button
                  onClick={() =>
                    request({ kind: "target", lessonId: targetId, unitId })
                  }
                >
                  Open this argument
                </button>
              </div>
            </section>
          ) : sheet ? (
            <>
              {unit && (
                <p className="argument-unit-context">
                  From your unit · <Prose>{unit.title}</Prose>
                </p>
              )}
              {historical && (
                <section
                  className="argument-freshness"
                  aria-label="Teaching has changed"
                >
                  <h2>This sheet uses earlier teaching</h2>
                  <p>
                    Your writing and retained proof references are preserved.
                    Earlier self-review does not describe the current teaching.
                  </p>
                  <button
                    onClick={() =>
                      request({
                        kind: "new",
                        lessonId: sheet.lessonId,
                        unitId: sheet.unitId,
                      })
                    }
                  >
                    Start a new attempt with current teaching
                  </button>
                </section>
              )}
              <nav className="argument-view-tabs" aria-label="Argument work">
                <button
                  aria-pressed={mode === "reconstruct"}
                  onClick={() => showPane("reconstruct")}
                >
                  Reconstruct
                </button>
                <button
                  aria-pressed={mode === "compare"}
                  onClick={() => showPane("compare")}
                >
                  Compare
                </button>
                <button
                  aria-pressed={mode === "consult"}
                  onClick={() => showPane("consult")}
                >
                  Consult
                </button>
              </nav>
              <div className={`argument-workspace argument-mode-${mode}`}>
                <ArgumentWriting
                  key={sheet.id}
                  sheet={sheet}
                  commit={commit}
                  historical={!editionCurrent}
                  consult={findSupport}
                />
                <div className="argument-companion">
                  {mode === "reconstruct" ? (
                    <section
                      className="argument-target-notes"
                      aria-label="Objects and statement"
                    >
                      <span className="section-kicker">
                        KEEP THE TYPES IN VIEW
                      </span>
                      <h2 id="argument-reconstruct-heading" tabIndex={-1}>
                        Objects and statement
                      </h2>
                      <p>
                        <TeachingProse>{sheet.edition.objects}</TeachingProse>
                      </p>
                      <M block>{sheet.edition.statement}</M>
                      {sheet.edition.conventions.map((convention) => (
                        <p className="argument-convention" key={convention}>
                          <TeachingProse>{convention}</TeachingProse>
                        </p>
                      ))}
                      <p className="argument-caption">
                        The proof stays concealed while you reconstruct. Compare
                        when you want to inspect a reference.
                      </p>
                      <button onClick={() => showPane("compare")}>
                        Compare with teaching
                      </button>
                    </section>
                  ) : mode === "compare" ? (
                    <ArgumentComparison
                      sheet={sheet}
                      commit={commit}
                      historical={!editionCurrent}
                    />
                  ) : mode === "consult" ? (
                    <ArgumentSupport
                      sheet={sheet}
                      support={support}
                      navigate={navigate}
                      recovery={editionCurrent && !!currentTeaching?.recovery}
                      returnToWriting={() => showPane("compare")}
                      chooseSupport={findSupport}
                    />
                  ) : (
                    <section
                      className="argument-transfer"
                      aria-label="Existing transfer checkpoint"
                    >
                      <span className="section-kicker">
                        APPLY THE REASONING
                      </span>
                      <h2 id="argument-transfer-heading" tabIndex={-1}>
                        Try the existing transfer check
                      </h2>
                      <p className="argument-caption">
                        This selected-response check uses the lesson’s current
                        assessment. Your written sheet remains your own
                        self-review.
                      </p>
                      {guide && (
                        <Checkpoint
                          key={targetId}
                          title="Transfer your reasoning"
                          assessment={guide.transfer}
                          competencyId={
                            learningMetadata(target).competencies.some(
                              (competency) => competency.id === transferId,
                            )
                              ? transferId
                              : undefined
                          }
                        />
                      )}
                    </section>
                  )}
                </div>
              </div>
              <footer className="argument-next">
                <div>
                  <h2>Use what you reconstructed</h2>
                  <p>
                    Try the lesson’s existing transfer question when you are
                    ready.
                  </p>
                </div>
                <div className="argument-actions">
                  <button onClick={() => showPane("transfer")}>
                    Try transfer check
                  </button>
                  {unit && (
                    <a
                      href={`#capstone:${encodeURIComponent(unit.id)}`}
                      onClick={(event) => {
                        if (!ordinaryClick(event)) return;
                        event.preventDefault();
                        openCapstone(unit.id);
                      }}
                    >
                      Return to original unit capstone{" "}
                      <ArrowUpRight size={16} aria-hidden="true" />
                    </a>
                  )}
                </div>
              </footer>
              <div className="argument-attempt-actions">
                <button
                  onClick={() =>
                    request({
                      kind: "new",
                      lessonId: sheet.lessonId,
                      unitId: sheet.unitId,
                    })
                  }
                >
                  New attempt
                </button>
                {state.phase !== "guest" && (
                  <button
                    disabled={
                      state.phase !== "ready" && state.phase !== "unsupported"
                    }
                    onClick={() => run(state.saveCopy)}
                  >
                    Save as a copy
                  </button>
                )}
              </div>
            </>
          ) : saved.some((saved) => saved.sheet.lessonId === targetId) ? (
            <section className="argument-other-target">
              <h2>Choose a saved argument</h2>
              <p>
                You have more than one attempt for this lesson. Resume one below
                or start a new sheet.
              </p>
              <button
                onClick={() =>
                  run(() => state.start(targetId, unitId ?? undefined))
                }
              >
                Start a new sheet
              </button>
            </section>
          ) : (
            <p role="status">
              {state.message || "Preparing your proof sheet…"}
            </p>
          )}
          <ArgumentBackups
            onResume={(saved) => request({ kind: "saved", saved })}
            onImport={(sheet) => request({ kind: "import", sheets: [sheet] })}
          />
        </>
      )}
    </article>
  );
}
