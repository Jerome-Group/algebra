import type { Lesson } from "@/lib/algebra/engine";
import type { GuidedContent } from "@/lib/algebra/guided";
import { learningMetadata } from "@/lib/algebra/learning";
import { Math as M, Prose } from "./Math";
import { Checkpoint } from "./Checkpoint";
import { ConceptLink } from "./ConceptLink";
import { lessonCompletion } from "@/lib/algebra/progress";
import { useLearningProgress } from "./LearningProgress";
import { Reference } from "./Sources";

export function GuidedReader({
  lesson,
  content,
  lessons,
  open,
  readReference,
}: {
  lesson: Lesson;
  content: GuidedContent;
  lessons: Lesson[];
  open: (id: string) => void;
  readReference: () => void;
}) {
  const { mastered } = useLearningProgress();
  const completion = lessonCompletion(lesson, mastered);
  const metadata = learningMetadata(lesson);
  return (
    <article className="guided-reader">
      <p className="section-kicker">
        GUIDED LESSON · ABOUT {metadata.estimatedMinutes} MINUTES
      </p>
      <h2 className="guided-question">
        <Prose>{content.hook}</Prose>
      </h2>
      <p>
        <strong>Your outcome: </strong>
        <Prose>{lesson.objective || content.connection}</Prose>
      </p>
      <Checkpoint
        title="Before you begin"
        assessment={content.prerequisiteCheck}
      />
      {metadata.prerequisites.length > 0 && (
        <p className="prerequisite-links">
          Need a refresher?{" "}
          {metadata.prerequisites.map((id) => (
            <ConceptLink key={id} id={id} open={open}>
              {lessons.find((item) => item.id === id)?.navTitle}
              {" · "}
            </ConceptLink>
          ))}
        </p>
      )}
      <p className="competency-progress" role="status">
        {completion.count} of {completion.total} competencies demonstrated
        {completion.complete ? " · Lesson complete" : ""}. Checkpoint choices
        assess recognition of reasoning; practise writing the proofs
        independently.
      </p>
      <section>
        <h2>Objects and conventions</h2>
        <p>
          <Prose>{content.objects}</Prose>
        </p>
        <M block>{lesson.definition}</M>
      </section>
      {content.examples.map((example, index) => (
        <section key={example.title} className="guided-example">
          <p className="section-kicker">EXAMPLE {index + 1}</p>
          <h2>
            <Prose>{example.title}</Prose>
          </h2>
          <ol>
            {example.steps.map((step, i) => (
              <li key={i}>
                <Prose>{step}</Prose>
              </li>
            ))}
          </ol>
        </section>
      ))}
      <section className="guided-nonexample">
        <p className="section-kicker">A BOUNDARY TO NOTICE</p>
        <h2>
          <Prose>{content.nonexample.title}</Prose>
        </h2>
        <p>
          <Prose>{content.nonexample.explanation}</Prose>
        </p>
      </section>
      <Checkpoint
        competencyId={`${lesson.id}:boundaryCheck`}
        title="Check the hypothesis"
        assessment={content.boundaryCheck}
      />
      <section>
        <h2>Statement and proof moves</h2>
        <M block>{lesson.theorem}</M>
        <p className="reading-caption">
          {lesson.proofStatus}. The following steps expose the reasoning; a
          visual state alone is not a proof.
        </p>
        <ol className="worked-steps">
          {content.proofSteps.map((step, index) => (
            <li key={index}>
              <Prose>{step}</Prose>
            </li>
          ))}
        </ol>
      </section>
      <Checkpoint
        competencyId={`${lesson.id}:application`}
        title="Apply the idea"
        assessment={content.application}
      />
      <Checkpoint
        competencyId={`${lesson.id}:transfer`}
        title="Transfer to a new problem"
        assessment={content.transfer}
      />
      <section>
        <h2>Connect the ideas</h2>
        <p>
          <Prose>{content.connection}</Prose>
        </p>
        <ul>
          {(lesson.connections || []).map((id) => (
            <li key={id}>
              <ConceptLink id={id} open={open}>
                {lessons.find((item) => item.id === id)?.navTitle}
              </ConceptLink>
            </li>
          ))}
        </ul>
      </section>
      <details className="guided-sources">
        <summary>Rigour and sources</summary>
        <p>
          <Prose>{lesson.conventions || content.objects}</Prose>
        </p>
        <p>
          <Prose>{lesson.labScope}</Prose>
        </p>
        <ul className="reference-list">
          {[lesson.source, ...(lesson.references || [])].map(
            (source, index) => (
              <Reference key={index} source={source} />
            ),
          )}
        </ul>
      </details>
      <button className="read-reference" onClick={readReference}>
        Read the reference notes and further practice →
      </button>
    </article>
  );
}
