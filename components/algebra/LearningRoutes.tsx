import { useLayoutEffect, useRef } from "react";
import { capstoneAssessment, unitCompletion } from "@/lib/algebra/progress";
import { useLearningProgress } from "./LearningProgress";
import { RepresentationJourney } from "./RepresentationJourney";
import { Checkpoint } from "./Checkpoint";
import type { Lesson } from "@/lib/algebra/engine";
import { learningRoutes, type LearningUnit } from "@/lib/algebra/routes";
import { capstoneTargetId } from "@/lib/algebra/navigation";
import { ConceptLink } from "./ConceptLink";
import { learningMetadata } from "@/lib/algebra/learning";
import { Prose } from "./Math";
export function LearningRoutes({
  lessons,
  route,
  open,
  capstone,
}: {
  lessons: Lesson[];
  route: string;
  open: (id: string, unit?: string) => void;
  capstone: LearningUnit | null;
}) {
  const { mastered } = useLearningProgress();
  const capstones = useRef(new Map<string, HTMLDetailsElement>());
  useLayoutEffect(() => {
    if (!capstone) return;
    const details = capstones.current.get(capstone.id);
    if (!details) return;
    details.open = true;
    const answer = details.querySelector("details");
    if (answer) answer.open = false;
  }, [capstone]);
  return (
    <section className="learning-routes course-catalog">
      <p className="section-kicker">GUIDED COURSES</p>
      <h1 id="mode-heading" tabIndex={-1}>
        One idea at a time. A connected course.
      </h1>
      <p>
        Follow a short unit, explain its key moves, then solve its capstone.
        Completion records demonstrated competencies, not page visits.
      </p>
      <RepresentationJourney lessons={lessons} open={open} />
      <div className="route-options">
        {learningRoutes.map((item) => {
          const completion = unitCompletion(item, lessons, mastered);
          const assessment = capstoneAssessment(item.id);
          return (
            <section key={item.id}>
              <h2>
                <Prose>{item.title}</Prose>
              </h2>
              <p>
                <Prose>{item.description}</Prose>
              </p>
              <p>
                <strong>Entry skills:</strong>{" "}
                {item.entryCompetencies.map((text, index) => (
                  <span key={index}>
                    <Prose>{text}</Prose>{" "}
                  </span>
                ))}
              </p>
              <p>
                <strong>Outcomes:</strong>{" "}
                {item.outcomes.map((text, index) => (
                  <span key={index}>
                    <Prose>{text}</Prose>{" "}
                  </span>
                ))}
              </p>
              <p>
                {
                  item.lessons.filter((id) => {
                    const lesson = lessons.find((entry) => entry.id === id);
                    return (
                      lesson &&
                      learningMetadata(lesson).teachingStatus === "guided"
                    );
                  }).length
                }{" "}
                of {item.lessons.length} lessons currently meet the guided
                teaching contract.
              </p>
              <p className="competency-progress" role="status">
                {completion.count} of {completion.total} currently assessed
                competencies demonstrated · Capstone{" "}
                {completion.capstone ? "demonstrated" : "not yet demonstrated"}
                {completion.complete ? " · Unit complete" : ""}
                {!completion.teachingReady
                  ? " · More guided teaching remains before this unit can be completed"
                  : ""}
                .
              </p>
              <button
                aria-pressed={route === item.id}
                onClick={() => open(item.lessons[0], item.id)}
              >
                Start this unit
              </button>
              <ol>
                {item.lessons.map((id) => (
                  <li key={id}>
                    <ConceptLink
                      id={id}
                      open={(target) => open(target, item.id)}
                    >
                      <Prose focusable={false}>
                        {lessons.find((lesson) => lesson.id === id)?.navTitle ||
                          id}
                      </Prose>
                    </ConceptLink>
                  </li>
                ))}
              </ol>
              <details
                ref={(element) => {
                  if (element) capstones.current.set(item.id, element);
                  else capstones.current.delete(item.id);
                }}
              >
                <summary id={capstoneTargetId(item)}>Unit capstone</summary>
                {assessment && (
                  <Checkpoint
                    competencyId={`unit:${item.id}`}
                    title="Unit transfer checkpoint"
                    assessment={assessment}
                  />
                )}
                <p>
                  Write your full solution before choosing its supporting
                  reasoning. A selected response is evidence of this checkpoint,
                  not independent certification of a written proof.
                </p>
                <details>
                  <summary>Compare your reasoning</summary>
                  <p>
                    <Prose>{item.capstone.answer}</Prose>
                  </p>
                </details>
              </details>
              <p>
                <strong>Completion:</strong>{" "}
                <Prose>{item.completionCriteria}</Prose>
              </p>
              <p>
                <strong>Remediation:</strong>{" "}
                {item.remediation.map((id) => (
                  <ConceptLink key={id} id={id} open={open}>
                    <Prose focusable={false}>
                      {lessons.find((lesson) => lesson.id === id)?.navTitle ||
                        id}
                    </Prose>
                    {" · "}
                  </ConceptLink>
                ))}
              </p>
              <p>
                <strong>Builds on:</strong>{" "}
                {item.prerequisiteUnits.length
                  ? item.prerequisiteUnits.map((id, index) => (
                      <span key={id}>
                        {index > 0 && " → "}
                        <Prose>
                          {learningRoutes.find((unit) => unit.id === id)
                            ?.title || id}
                        </Prose>
                      </span>
                    ))
                  : "Start here"}
              </p>
            </section>
          );
        })}
      </div>
    </section>
  );
}
