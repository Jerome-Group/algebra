"use client";
import { useId, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowUpRight, Search } from "lucide-react";
import type { ArgumentSheet } from "@/lib/algebra/argument-records";
import {
  argumentEvidence,
  argumentPrerequisites,
  argumentSubjects,
  argumentTarget,
  balancingRecovery,
  currentArgumentLesson,
  searchArgumentSupport,
} from "@/lib/algebra/argument-catalogue";
import { workTargetId } from "@/lib/algebra/navigation";
import type { ReadingView } from "@/lib/algebra/reading-views";
import { labContract } from "@/lib/algebra/lab-contracts";
import { useLearningProgress } from "./LearningProgress";
import { ConceptLink } from "./ConceptLink";
import { LessonReader } from "./LessonReader";
import Exploration from "./Exploration";
import { Math as M, Prose } from "./Math";
import type { ArgumentDeskProps } from "./ArgumentDesk";
import { publicMathText } from "./PublicMathText";

type Support = NonNullable<ArgumentDeskProps["support"]>;
type Navigate = ArgumentDeskProps["navigate"];
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
    <ConceptLink
      className={className}
      id={workTargetId(targetId, unitId ?? undefined, support)}
      open={() => navigate(targetId, unitId, support)}
    >
      {children}
    </ConceptLink>
  );
}

function SupportBranch({
  lessonId,
  sheet,
  navigate,
  path = [],
}: {
  lessonId: string;
  sheet: ArgumentSheet;
  navigate: Navigate;
  path?: string[];
}) {
  const { mastered } = useLearningProgress();
  const [expanded, setExpanded] = useState(false);
  const target = argumentTarget(lessonId);
  if (!target || path.includes(lessonId)) return null;
  const prerequisites = argumentPrerequisites(lessonId);
  const evidence = argumentEvidence(lessonId, mastered);
  return (
    <li className="argument-support-branch">
      <WorkLink
        targetId={sheet.lessonId}
        unitId={sheet.unitId}
        support={{ lessonId, lab: false }}
        navigate={navigate}
      >
        <span>
          <Prose focusable={false}>{target.navTitle}</Prose>
        </span>
        <ArrowUpRight size={15} aria-hidden="true" />
      </WorkLink>
      <small>
        Catalogue prerequisite · {evidence.count} of {evidence.total} checkpoint
        competencies demonstrated
      </small>
      {prerequisites.length > 0 && (
        <details onToggle={(event) => setExpanded(event.currentTarget.open)}>
          <summary>
            Show its {prerequisites.length} prerequisite
            {prerequisites.length === 1 ? "" : "s"}
          </summary>
          {expanded && (
            <ul>
              {prerequisites.map((target) => (
                <SupportBranch
                  key={target.id}
                  lessonId={target.id}
                  sheet={sheet}
                  navigate={navigate}
                  path={[...path, lessonId]}
                />
              ))}
            </ul>
          )}
        </details>
      )}
    </li>
  );
}

export function ArgumentSupport({
  sheet,
  support,
  navigate,
  returnToWriting,
  chooseSupport,
  recovery,
}: {
  sheet: ArgumentSheet;
  support: Support | null;
  navigate: Navigate;
  returnToWriting: () => void;
  chooseSupport: () => void;
  recovery: boolean;
}) {
  const [query, setQuery] = useState("");
  const [reading, setReading] = useState<ReadingView>("guided");
  const searchId = useId();
  const target = support ? currentArgumentLesson(support.lessonId) : undefined;
  const direct = argumentPrerequisites(sheet.lessonId);
  const results = searchArgumentSupport(query);
  if (target && support)
    return (
      <section className="argument-consultation" aria-label="Consult a lesson">
        <p className="section-kicker">
          {support.lab ? "LABORATORY" : "LESSON"} ·{" "}
          <Prose>{target.navTitle || target.title}</Prose>
        </p>
        <div className="argument-actions argument-consult-navigation">
          <button onClick={returnToWriting}>
            <ArrowLeft size={16} aria-hidden="true" /> Return to my writing
          </button>
          <button onClick={chooseSupport}>Choose other support</button>
          <WorkLink
            targetId={sheet.lessonId}
            unitId={sheet.unitId}
            support={{ lessonId: target.id, lab: !support.lab }}
            navigate={navigate}
          >
            {support.lab ? "Read this lesson" : "Open its laboratory"}
          </WorkLink>
        </div>
        <p className="argument-caption">
          Your writing and current question stay on this sheet while you
          consult.
        </p>
        {support.lab ? (
          <Exploration key={target.id} lesson={target} />
        ) : (
          <LessonReader
            key={target.id}
            lesson={target}
            lessons={readerLessons}
            tab={reading}
            setTab={setReading}
            openExperiment={() =>
              navigate(sheet.lessonId, sheet.unitId, {
                lessonId: target.id,
                lab: true,
              })
            }
            open={(lessonId) =>
              navigate(sheet.lessonId, sheet.unitId, { lessonId, lab: false })
            }
          />
        )}
      </section>
    );
  return (
    <section className="argument-support" aria-label="Find support">
      <header className="argument-panel-heading">
        <div>
          <span className="section-kicker">FOLLOW YOUR QUESTION</span>
          <h2 id="argument-consult-heading" tabIndex={-1}>
            Find a useful next idea
          </h2>
        </div>
      </header>
      {recovery && (
        <details className="argument-recovery">
          <summary>{balancingRecovery.question}</summary>
          <ol>
            {balancingRecovery.steps.map((step) => (
              <li key={step}>
                <Prose>{publicMathText.get(step) ?? step}</Prose>
              </li>
            ))}
          </ol>
          <div className="argument-actions">
            <WorkLink
              targetId={sheet.lessonId}
              unitId={sheet.unitId}
              support={{ lessonId: "tensor-products", lab: false }}
              navigate={navigate}
            >
              Review balanced tensors
            </WorkLink>
            <WorkLink
              targetId={sheet.lessonId}
              unitId={sheet.unitId}
              support={{ lessonId: "tensor-products", lab: true }}
              navigate={navigate}
            >
              Test a finite example
            </WorkLink>
          </div>
        </details>
      )}
      <label className="argument-search-label" htmlFor={searchId}>
        Search teaching for your question
      </label>
      <div className="argument-search">
        <Search size={17} aria-hidden="true" />
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Try balancing, kernels, naturality…"
        />
      </div>
      {query.trim() ? (
        <>
          <p className="argument-caption" role="status">
            {results.length} matching lesson{results.length === 1 ? "" : "s"}.
            Excerpts are existing teaching.
          </p>
          <ol className="argument-search-results">
            {results.map(({ target, passage }) => (
              <li key={target.id}>
                <WorkLink
                  targetId={sheet.lessonId}
                  unitId={sheet.unitId}
                  support={{ lessonId: target.id, lab: false }}
                  navigate={navigate}
                >
                  <span>
                    <Prose focusable={false}>{target.navTitle}</Prose>
                  </span>
                  <ArrowUpRight size={15} aria-hidden="true" />
                </WorkLink>
                <small>
                  <Prose>{passage.label}</Prose>
                </small>
                <p>
                  {passage.text === target.definition ||
                  passage.text === target.theorem ? (
                    <M>{passage.text}</M>
                  ) : (
                    <Prose>{passage.text}</Prose>
                  )}
                </p>
                {labContract(target.id) && (
                  <WorkLink
                    className="argument-text-link"
                    targetId={sheet.lessonId}
                    unitId={sheet.unitId}
                    support={{ lessonId: target.id, lab: true }}
                    navigate={navigate}
                  >
                    Open laboratory
                  </WorkLink>
                )}
              </li>
            ))}
          </ol>
          {!results.length && (
            <p>
              Try fewer words, a named object, or a relation from your question.
            </p>
          )}
        </>
      ) : (
        <>
          <h3>Direct prerequisites</h3>
          <p className="argument-caption">
            Choose what helps. Expand a branch when you need more background.
          </p>
          {direct.length ? (
            <ul className="argument-support-tree">
              {direct.map((target) => (
                <SupportBranch
                  key={target.id}
                  lessonId={target.id}
                  sheet={sheet}
                  navigate={navigate}
                />
              ))}
            </ul>
          ) : (
            <p>
              This lesson has no catalogue prerequisites. You can still search
              all teaching.
            </p>
          )}
        </>
      )}
    </section>
  );
}

function argumentSubjectsForReader() {
  return argumentSubjects
    .flatMap((subject) => subject.families.flatMap((family) => family.lessons))
    .flatMap((target) => {
      const lesson = currentArgumentLesson(target.id);
      return lesson ? [lesson] : [];
    });
}
const readerLessons = argumentSubjectsForReader();
