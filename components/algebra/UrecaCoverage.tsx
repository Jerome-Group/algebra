import source from "@/lib/algebra/ureca-topics.json";
import { urecaLedgerSchema, type UrecaTopic } from "@/lib/algebra/ureca-topics";
import type { Lesson } from "@/lib/algebra/engine";
import { ConceptLink } from "./ConceptLink";
import { Prose } from "./Math";

const ledger = urecaLedgerSchema.parse(source);
const sections = [...new Set(ledger.topics.map(({ section }) => section))];
const required = ledger.topics.filter(
  ({ classification }) => classification === "required",
);

function statusLabel(topic: UrecaTopic) {
  if (topic.classification === "candidate") return "Candidate investigation";
  if (topic.classification === "prepared") return "Prepared scope";
  return topic.review.status === "reviewed"
    ? "Reviewed teaching"
    : "Review pending";
}

export function UrecaCoverage({
  lessons,
  open,
}: {
  lessons: Lesson[];
  open: (id: string) => void;
}) {
  const reviewed = required.filter(
    ({ review }) => review.status === "reviewed",
  );
  return (
    <div className="ureca-coverage">
      <h3>Representation theory, from actions to applications</h3>
      <p>
        {reviewed.length} of {required.length} required topics have
        independently reviewed teaching · {ledger.exerciseMethods.length}{" "}
        exercise methods. Open a topic to find its lessons and mathematical
        references.
      </p>
      <p>
        Content reviews describe the teaching available here. Your demonstrated
        competencies are recorded through the lesson checkpoints.
      </p>
      {sections.map((section) => {
        const topics = ledger.topics.filter(
          (topic) => topic.section === section,
        );
        return (
          <details className="ureca-topic-section" key={section}>
            <summary>
              {section} · {topics.length} topics
            </summary>
            <ul className="ureca-topics">
              {topics.map((topic) => {
                const lessonIds = [
                  ...new Set(topic.passages.map(({ lessonId }) => lessonId)),
                ];
                return (
                  <li key={topic.id}>
                    <details>
                      <summary>
                        {topic.id} · {topic.title}
                        <span className="ureca-topic-status">
                          {statusLabel(topic)}
                        </span>
                      </summary>
                      <ul>
                        {topic.objectives.map((objective) => (
                          <li key={objective}>
                            <Prose>{objective}</Prose>
                          </li>
                        ))}
                      </ul>
                      {lessonIds.length > 0 && (
                        <>
                          <p>Taught in:</p>
                          <ul>
                            {lessonIds.map((id) => (
                              <li key={id}>
                                <ConceptLink id={id} open={open}>
                                  {lessons.find((lesson) => lesson.id === id)
                                    ?.title ?? id}
                                </ConceptLink>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                      {topic.classification !== "required" && (
                        <p>
                          This scope is retained separately from the required
                          teaching route.
                        </p>
                      )}
                      <p>Mathematical references:</p>
                      <ul>
                        {topic.sources.map((citation) => (
                          <li key={`${citation.url}:${citation.section}`}>
                            <a href={citation.url}>{citation.title}</a> ·{" "}
                            {citation.section}
                          </li>
                        ))}
                      </ul>
                      {topic.review.status === "reviewed" && (
                        <p>
                          <a
                            href={`https://github.com/Jerome-Group/algebra/blob/main/${topic.review.evidence}`}
                          >
                            Independent mathematics review
                          </a>{" "}
                          · {topic.review.reviewedAt.slice(0, 10)}
                        </p>
                      )}
                    </details>
                  </li>
                );
              })}
            </ul>
          </details>
        );
      })}
    </div>
  );
}
