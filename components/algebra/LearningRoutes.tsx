import type { Lesson } from "@/lib/algebra/engine";
import { learningRoutes } from "@/lib/algebra/routes";
import { ConceptLink } from "./ConceptLink";
import { learningMetadata } from "@/lib/algebra/learning";
export function LearningRoutes({
  lessons,
  route,
  setRoute,
  open,
}: {
  lessons: Lesson[];
  route: string;
  setRoute: (id: string) => void;
  open: (id: string, unit?: string) => void;
}) {
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
      <div className="route-options">
        {learningRoutes.map((item) => (
          <section key={item.id}>
            <h2>{item.title}</h2>
            <p>{item.description}</p>
            <p>
              <strong>Entry skills:</strong> {item.entryCompetencies.join(" ")}
            </p>
            <p>
              <strong>Outcomes:</strong> {item.outcomes.join(" ")}
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
            <button
              aria-pressed={route === item.id}
              onClick={() => {
                setRoute(item.id);
                open(item.lessons[0], item.id);
              }}
            >
              Start this unit
            </button>
            <ol>
              {item.lessons.map((id) => (
                <li key={id}>
                  <ConceptLink
                    id={id}
                    open={(target) => {
                      setRoute(item.id);
                      open(target, item.id);
                    }}
                  >
                    {lessons.find((lesson) => lesson.id === id)?.navTitle}
                  </ConceptLink>
                </li>
              ))}
            </ol>
            <details>
              <summary>Unit capstone</summary>
              <p>{item.capstone.question}</p>
              <details>
                <summary>Compare your reasoning</summary>
                <p>{item.capstone.answer}</p>
              </details>
            </details>
            <p>
              <strong>Completion:</strong> {item.completionCriteria}
            </p>
            <p>
              <strong>Remediation:</strong>{" "}
              {item.remediation.map((id) => (
                <ConceptLink key={id} id={id} open={open}>
                  {lessons.find((lesson) => lesson.id === id)?.navTitle}
                  {" · "}
                </ConceptLink>
              ))}
            </p>
            <p>
              <strong>Builds on:</strong>{" "}
              {item.prerequisiteUnits
                .map(
                  (id) => learningRoutes.find((unit) => unit.id === id)?.title,
                )
                .join(" → ") || "Start here"}
            </p>
          </section>
        ))}
      </div>
    </section>
  );
}
