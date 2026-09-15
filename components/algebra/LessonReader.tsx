import { readingViews, type ReadingView } from "@/lib/algebra/reading-views";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { ConceptLink } from "./ConceptLink";
import type { Lesson } from "@/lib/algebra/engine";
import { Math as M, Prose } from "./Math";
import { Reference } from "./Sources";
export function LessonReader({
  lesson,
  lessons,
  tab,
  setTab,
  open,
}: {
  lesson: Lesson;
  lessons: Lesson[];
  tab: ReadingView;
  setTab: (s: ReadingView) => void;
  open: (id: string) => void;
}) {
  return (
    <div className="lesson-reader">
      <nav className="reading-tabs" aria-label="Reading view">
        {readingViews.map(([value, label]) => (
          <button
            key={value}
            aria-pressed={tab === value}
            onClick={() => setTab(value)}
          >
            {label}
          </button>
        ))}
      </nav>
      <p className="reading-caption">
        {lesson.level} · {lesson.proofStatus}
      </p>
      {lesson.objective && (
        <p className="learning-objective">
          <strong>Your goal: </strong>
          <Prose>{lesson.objective}</Prose>
        </p>
      )}
      {!!lesson.prerequisites?.length && (
        <div className="prerequisite-links">
          <span>Before this lesson:</span>{" "}
          {lesson.prerequisites.map((id) => {
            const prerequisite = lessons.find((item) => item.id === id);
            return prerequisite ? (
              <ConceptLink key={id} id={id} open={open}>
                {prerequisite.navTitle}
              </ConceptLink>
            ) : null;
          })}
        </div>
      )}
      <div className="reading-prelude">
        <div>
          <p className="concept-intro">
            <Prose>{lesson.intuition}</Prose>
          </p>
          <div className="definition-strip">
            <M block>{lesson.definition}</M>
          </div>
        </div>
        <aside className="margin-note">
          <span className="section-kicker">KEEP IN MIND</span>
          <p>
            <Prose>{lesson.pitfall}</Prose>
          </p>
        </aside>
      </div>
      <div className="reading-layout">
        <article className="concept-notes">
          <div className="reading-content">
            {(tab === "guided" || tab === "understand") && (
              <section className="lesson-section" aria-label="understand">
                <h2>
                  <Prose>{lesson.title}</Prose>
                </h2>
                <p>
                  <Prose>{lesson.explanation}</Prose>
                </p>
                <div className="study-prompt">
                  <h3>Study task</h3>
                  <p>
                    <Prose>{lesson.prompt}</Prose>
                  </p>
                  <button
                    className="open-experiment"
                    onClick={() => {
                      const experiment = document.getElementById("experiment");
                      experiment?.scrollIntoView({ block: "start" });
                      experiment?.focus({ preventScroll: true });
                    }}
                  >
                    Open experiment
                  </button>
                </div>
              </section>
            )}
            {(tab === "guided" || tab === "example") && (
              <section className="lesson-section" aria-label="example">
                <h2>{lesson.worked?.title || "Reason through the example"}</h2>
                {lesson.worked ? (
                  <ol className="worked-steps">
                    {lesson.worked.steps.map((step, i) => (
                      <li key={i}>
                        <Prose>{step}</Prose>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p>
                    This reference entry does not yet include a worked problem.
                    Read the statement and labelled proof sketch, then use the
                    cited source for further examples.
                  </p>
                )}
                <p className="reading-caption">
                  {lesson.worked
                    ? "Original worked illustration; source results linked below."
                    : "Reference entry · worked example not yet developed."}
                </p>
              </section>
            )}
            {(tab === "guided" || tab === "theorem") && (
              <section className="lesson-section" aria-label="theorem">
                <h2>Statement and hypotheses</h2>
                <M block>{lesson.theorem}</M>
                <p>
                  <Prose>{lesson.pitfall}</Prose>
                </p>
              </section>
            )}
            {(tab === "guided" || tab === "proof") && (
              <section className="lesson-section" aria-label="proof">
                <h2>{lesson.proofStatus || "Proof sketch here"}</h2>
                <p>
                  <Prose>{lesson.proof}</Prose>
                </p>
                <p className="reading-caption">
                  The visual model illustrates the argument; the linked source
                  gives the full treatment.
                </p>
              </section>
            )}
          </div>
          {!!lesson.practice?.length && (
            <section
              className="lesson-practice"
              aria-label="Practice with feedback"
            >
              <h2>Check your understanding</h2>
              {lesson.practice.map((problem, index) => (
                <div key={index} className="practice-problem">
                  <h3>Problem {index + 1}</h3>
                  <p>
                    <Prose>{problem.question}</Prose>
                  </p>
                  <details>
                    <summary>Hint</summary>
                    <p>
                      <Prose>{problem.hint}</Prose>
                    </p>
                  </details>
                  <details>
                    <summary>Answer and reasoning</summary>
                    <p>
                      <Prose>{problem.answer}</Prose>
                    </p>
                  </details>
                </div>
              ))}
            </section>
          )}
          {lesson.reading?.length ? (
            <section className="further-reading" aria-label="Deeper notes">
              <h2>Further reading · outlines</h2>
              {lesson.reading.map((note) => (
                <details key={note.title}>
                  <summary>
                    <Prose>{note.title}</Prose>
                    <ChevronDown size={16} />
                  </summary>
                  <div>
                    {note.paragraphs.map((paragraph, i) => (
                      <p key={i}>
                        <Prose>{paragraph}</Prose>
                      </p>
                    ))}
                    <ul className="reference-list">
                      <Reference source={note.source} />
                    </ul>
                  </div>
                </details>
              ))}
            </section>
          ) : null}
          <section className="lesson-references">
            <h2>Read the source</h2>
            <ul className="reference-list">
              <Reference source={lesson.source} />
              {lesson.references?.map((s, i) => (
                <Reference key={i} source={s} />
              ))}
            </ul>
          </section>
        </article>
        <aside className="connections">
          <span className="section-kicker">CONNECTED IDEAS</span>
          {lesson.connections?.map((target) => {
            const next = lessons.find(
              (l) => l.id === target || l.aliases?.includes(target),
            );
            return next ? (
              <ConceptLink key={target} id={target} open={open}>
                <small>{next.subject}</small>
                <span>
                  <Prose>{next.navTitle || next.title}</Prose>
                  <ArrowUpRight size={16} />
                </span>
              </ConceptLink>
            ) : null;
          })}
          <div className="convention-note">
            <h3>Conventions</h3>
            <p>
              <Prose>
                {lesson.conventions ||
                  "Matrices act on column vectors. Check the hypotheses of each statement."}
              </Prose>
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
