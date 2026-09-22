import type { Lesson } from "@/lib/algebra/engine";
import { Prose } from "./Math";

const experiences = [
  {
    id: "orthogonal-axis-angle",
    name: "Axis–angle rotation experiment",
    question: "Which rotations preserve a cube?",
  },
  {
    id: "representations-real-complex",
    name: "Real and complex eigenline illustration",
    question: "Can a real irreducible split over the complex numbers?",
  },
  {
    id: "actions-regular-conjugation",
    name: "Regular and conjugation action checker",
    question: "How does changing the action change the orbit?",
  },
  {
    id: "linear-quotient",
    name: "Linear quotient constructor",
    question: "Which vectors become the same after taking a quotient?",
  },
  {
    id: "m3220-modules",
    name: "Module scalar-action experiment",
    question: "Can a nonunit act invertibly?",
  },
  {
    id: "mh2220-semidirect",
    name: "Semidirect product constructor",
    question: "When does the action change a product group?",
  },
];

export function LaboratoryGallery({
  lessons,
  open,
}: {
  lessons: Lesson[];
  open: (id: string) => void;
}) {
  return (
    <section className="laboratory-gallery">
      <p className="section-kicker">MATHEMATICAL LABORATORIES</p>
      <h1 id="mode-heading" tabIndex={-1}>
        Make a prediction. Test an object.
      </h1>
      <p>
        Each workspace names its mathematical objects and the limit of its
        evidence. A finite experiment does not prove a general theorem.
      </p>
      <div className="gallery-grid">
        {experiences.map((experience) => {
          const lesson = lessons.find((item) => item.id === experience.id);
          if (!lesson) return null;
          return (
            <article key={experience.id}>
              <h2>{experience.name}</h2>
              <p>{experience.question}</p>
              <p>
                <Prose>{lesson.labScope}</Prose>
              </p>
              <button onClick={() => open(experience.id)}>
                Open workspace →
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
