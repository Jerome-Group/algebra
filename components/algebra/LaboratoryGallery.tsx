import type { Lesson } from "@/lib/algebra/engine";
import { Prose } from "./Math";
import { labContract } from "@/lib/algebra/lab-contracts";

export function LaboratoryGallery({
  lessons,
  open,
}: {
  lessons: Lesson[];
  open: (id: string) => void;
}) {
  const experiences = lessons.flatMap((lesson) => {
    const contract = labContract(lesson.id);
    return contract ? [{ id: lesson.id, ...contract }] : [];
  });
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
