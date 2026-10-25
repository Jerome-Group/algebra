import type { Lesson } from "@/lib/algebra/engine";
import { Math as M, Prose, WrittenProse } from "./Math";
import { workedExampleContext } from "./WorkedExampleContext";

export function WorkedObjectView({ lesson }: { lesson: Lesson }) {
  if (!lesson.worked?.steps.length)
    throw Error(`Missing worked construction for ${lesson.id}`);
  const context = workedExampleContext(lesson);
  return (
    <section
      className="worked-object-view"
      aria-label="Worked mathematical construction"
    >
      <p className="section-kicker">WORKED EXAMPLE</p>
      <h3>
        <Prose>{lesson.worked.title}</Prose>
      </h3>
      <p>
        <Prose>{lesson.intuition}</Prose>
      </p>
      <section aria-label="Objects and conventions for this example">
        <h4>Objects and conventions</h4>
        <M block>{lesson.definition}</M>
        <p>
          <Prose>{lesson.explanation}</Prose>
        </p>
        {lesson.conventions && (
          <p>
            <Prose>{lesson.conventions}</Prose>
          </p>
        )}
        {context.map((entry, index) => (
          <div key={index} className="worked-source-context">
            {entry.kind === "specialization" && (
              <p>
                <WrittenProse>{entry.note}</WrittenProse>
              </p>
            )}
            {entry.kind === "math" || entry.kind === "specialization" ? (
              <M block>{entry.body}</M>
            ) : (
              <p>
                <WrittenProse>{entry.body}</WrittenProse>
              </p>
            )}
            <p className="reading-caption">
              {entry.kind === "convention" || entry.kind === "specialization"
                ? "Example convention from "
                : "Selected context from "}
              {entry.citations.map((citation, citationIndex) => (
                <span key={`${citation.lessonId}-${citation.field}`}>
                  {citationIndex > 0 && "; "}
                  <a href={citation.source.url}>
                    <Prose focusable={false}>{citation.title}</Prose>
                  </a>
                  {` (${citation.field}; ${citation.source.section})`}
                </span>
              ))}
              .
            </p>
          </div>
        ))}
      </section>
      <ol className="worked-steps">
        {lesson.worked.steps.map((step, index) => (
          <li key={index}>
            <Prose>{step}</Prose>
          </li>
        ))}
      </ol>
      <details>
        <summary>Check the construction’s boundary</summary>
        <p>
          <strong>Check the hypothesis. </strong>
          <Prose>{lesson.pitfall}</Prose>
        </p>
      </details>
      <p className="reading-caption">
        This worked example explains the stated construction. The reading
        supplies its proof. There is no automatic computation or grading in this
        view.
      </p>
    </section>
  );
}
