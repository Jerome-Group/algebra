import { useState } from "react";
import { useLearningProgress } from "./LearningProgress";
import { lessonCompletion } from "@/lib/algebra/progress";
import type { Lesson } from "@/lib/algebra/engine";
import type { ProductMode } from "@/lib/algebra/navigation";

export function LearningHome({
  lessons,
  resume,
  open,
  navigate,
}: {
  lessons: Lesson[];
  resume?: Lesson;
  open: (id: string) => void;
  navigate: (mode: ProductMode) => void;
}) {
  const { mastered, reset, storageAvailable } = useLearningProgress();
  const [resetting, setResetting] = useState(false);
  const results = lessons.map((lesson) => lessonCompletion(lesson, mastered));
  return (
    <section className="learning-home">
      <p className="section-kicker">ABSTRACT ALGEBRA · A MATHEMATICAL STUDIO</p>
      <h1 id="mode-heading" tabIndex={-1}>
        What stays the same
        <br />
        when everything moves?
      </h1>
      <p className="home-intro">
        Build a group. Follow a fiber. Find the hidden structure in a symmetry.
        Start with a question, then learn to prove the answer.
      </p>
      <div className="home-paths">
        <button onClick={() => navigate("learn")}>
          <strong>Learn</strong>
          <span>
            Short units, worked examples and mathematical checkpoints.
          </span>
        </button>
        <button onClick={() => navigate("explore")}>
          <strong>Explore</strong>
          <span>Construct objects and test predictions in a laboratory.</span>
        </button>
        <button onClick={() => navigate("reference")}>
          <strong>Reference</strong>
          <span>
            Search the full atlas by topic, source and teaching depth.
          </span>
        </button>
        <button onClick={() => navigate("sources")}>
          <strong>Sources</strong>
          <span>
            See coverage and its limits across four source collections.
          </span>
        </button>
      </div>
      <section className="featured-challenge">
        <p className="section-kicker">A QUESTION TO BEGIN WITH</p>
        <h2>Why can cosets sometimes multiply—and sometimes not?</h2>
        <p>
          One class has many representatives. If you choose another
          representative, will the answer change?
        </p>
        <button onClick={() => open("mh2220-quotient")}>
          Investigate quotient groups →
        </button>
      </section>
      <section className="device-progress">
        <h2>Your demonstrated competencies</h2>
        <p role="status">
          {results.reduce((sum, item) => sum + item.count, 0)} of{" "}
          {results.reduce((sum, item) => sum + item.total, 0)} currently
          assessed competencies ·{" "}
          {results.filter((item) => item.complete).length} guided lessons
          complete.
        </p>
        <p>
          {storageAvailable
            ? "Saved only in this browser. Page visits do not count; revised assessments require new evidence."
            : "Browser storage is unavailable. Progress lasts only for this session."}
        </p>
        {resetting ? (
          <>
            <p>
              Clear all submitted competency and capstone evidence on this
              device?
            </p>
            <button
              onClick={() => {
                reset();
                setResetting(false);
              }}
            >
              Clear my progress
            </button>
            <button onClick={() => setResetting(false)}>
              Keep my progress
            </button>
          </>
        ) : (
          <button onClick={() => setResetting(true)}>
            Reset learning progress
          </button>
        )}
      </section>
      <section className="resume-learning">
        <h2>Continue learning</h2>
        {resume ? (
          <button onClick={() => open(resume.id)}>
            Return to {resume.navTitle || resume.title} →
          </button>
        ) : (
          <>
            <p>Your place is saved on this device when you open a lesson.</p>
            <button onClick={() => open("foundations-functions")}>
              Start with functions and fibers →
            </button>
          </>
        )}
      </section>
    </section>
  );
}
