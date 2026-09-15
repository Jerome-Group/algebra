import type { Lesson } from "@/lib/algebra/engine";
import { learningRoutes } from "@/lib/algebra/routes";
import { ConceptLink } from "./ConceptLink";
export function LearningRoutes({
  lessons,
  route,
  setRoute,
  open,
}: {
  lessons: Lesson[];
  route: string;
  setRoute: (id: string) => void;
  open: (id: string) => void;
}) {
  return (
    <details className="learning-routes">
      <summary>Learn a route</summary>
      <div className="route-options">
        {learningRoutes.map((item) => (
          <section key={item.id}>
            <h2>{item.title}</h2>
            <p>{item.description}</p>
            <button
              aria-pressed={route === item.id}
              onClick={() => {
                setRoute(item.id);
                open(item.lessons[0]);
              }}
            >
              Start this route
            </button>
            <ol>
              {item.lessons.map((id) => (
                <li key={id}>
                  <ConceptLink
                    id={id}
                    open={(target) => {
                      setRoute(item.id);
                      open(target);
                    }}
                  >
                    {lessons.find((lesson) => lesson.id === id)?.navTitle}
                  </ConceptLink>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </details>
  );
}
