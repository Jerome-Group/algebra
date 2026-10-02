import { useState } from "react";
import type { Lesson } from "@/lib/algebra/engine";
import type { ProductMode } from "@/lib/algebra/navigation";
import { lessonCompletion } from "@/lib/algebra/progress";
import { ProgressDataControls, useLearningProgress } from "./LearningProgress";
import { SymmetryDesk } from "./SymmetryDesk";

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
  const demonstrated = results.reduce((sum, item) => sum + item.count, 0);
  const total = results.reduce((sum, item) => sum + item.total, 0);
  return (
    <section className="learning-home">
      <div className="studio-introduction">
        <p className="section-kicker">ABSTRACT ALGEBRA · THE LEARNING STUDIO</p>
        <h1 id="mode-heading" tabIndex={-1}>
          Explore a pattern.
          <br />
          Build an argument.
        </h1>
        <p>
          Groups, rings, fields and representations. Start with a concrete
          object; learn exactly what makes its mathematics work.
        </p>
      </div>
      <div className="studio-start">
        <SymmetryDesk open={open} />
        <div className="studio-learning">
          <section className="resume-learning">
            <p className="section-kicker">YOUR NEXT STEP</p>
            <h2>
              {resume
                ? "Pick up your argument."
                : "Start with the foundations."}
            </h2>
            <p>
              {resume
                ? `Your place: ${resume.navTitle || resume.title}.`
                : "Functions and equivalence explain what a rule must do before it can define an algebraic structure."}
            </p>
            <button
              className="studio-primary"
              onClick={() => open(resume?.id || "foundations-functions")}
            >
              {resume
                ? `Return to ${resume.navTitle || resume.title}`
                : "Start with functions and fibers"}
            </button>
            <button onClick={() => navigate("learn")}>
              Choose a learning unit
            </button>
          </section>
          <section className="device-progress">
            <h2>Your demonstrated competencies</h2>
            <p role="status">
              {demonstrated} of {total} currently assessed competencies ·{" "}
              {results.filter((item) => item.complete).length} guided lessons
              complete.
            </p>
            <progress
              value={demonstrated}
              max={Math.max(total, 1)}
              aria-label="Demonstrated competencies"
            />
            <p>
              {storageAvailable
                ? "Saved in this browser. Page visits do not count; each checkpoint asks for mathematical reasoning."
                : "Saving unavailable. Progress lasts only for this session."}
            </p>
            <ProgressDataControls />
            {resetting ? (
              <div className="reset-confirmation">
                <p>
                  Clear submitted competency and capstone evidence on this
                  device? You can restore the previous record.
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
              </div>
            ) : (
              <button onClick={() => setResetting(true)}>
                Reset learning progress
              </button>
            )}
          </section>
        </div>
      </div>
      <div className="home-paths">
        {(
          [
            [
              "learn",
              "Learn",
              "Follow a short unit: objects, examples, proofs, then a capstone.",
            ],
            [
              "explore",
              "Explore",
              "Predict, manipulate and explain what a laboratory preserves.",
            ],
            [
              "reference",
              "Reference",
              "Find a definition, hypothesis, proof or connected idea.",
            ],
            [
              "sources",
              "Sources",
              "Trace the mathematics to its sources and proof boundaries.",
            ],
          ] as const
        ).map(([mode, title, description]) => (
          <button key={mode} onClick={() => navigate(mode)}>
            <strong>{title}</strong>
            <span>{description}</span>
          </button>
        ))}
      </div>
      <section className="featured-challenge">
        <p className="section-kicker">ANOTHER WAY IN</p>
        <h2>Why can cosets sometimes multiply—and sometimes not?</h2>
        <p>
          One class has many representatives. Change the representative: does
          the answer change?
        </p>
        <button onClick={() => open("mh2220-quotient")}>
          Investigate quotient groups
        </button>
      </section>
    </section>
  );
}
