"use client";
import { useState } from "react";
import { Minus, Plus, Maximize2, Minimize2 } from "lucide-react";
import type { Lesson } from "@/lib/algebra/engine";
import Laboratory from "./Laboratory";
import { Prose } from "./Math";
import { labContractPresentation } from "@/lib/algebra/lab-contract-presentations";
import { laboratoryPresentation } from "@/lib/algebra/laboratory-presentations";

export default function Exploration({ lesson }: { lesson: Lesson }) {
  const [open, setOpen] = useState(true),
    [expanded, setExpanded] = useState(false);
  const [prediction, setPrediction] = useState("");
  const [testing, setTesting] = useState(false);
  const contract = labContractPresentation(lesson.id);
  const presentation = laboratoryPresentation(lesson.id);
  const integratedPrediction =
    lesson.machine === "ideal-quotient-lattice" ||
    lesson.machine === "polynomial-factorisation" ||
    lesson.machine === "localisation-microscope" ||
    lesson.machine === "ideal-chain-explorer" ||
    lesson.machine === "module-action-board" ||
    lesson.machine === "wedderburn-layers" ||
    lesson.machine === "tensor-balancing" ||
    lesson.machine === "invariant-intertwiner" ||
    lesson.machine === "induction-reciprocity" ||
    lesson.machine === "character-construction";
  return (
    <section
      className={`exploration ${expanded ? "expanded" : "compact"}`}
      aria-label={
        presentation === "model"
          ? "Interactive mathematical experience"
          : "Mathematical illustration"
      }
      id="experiment"
      tabIndex={-1}
    >
      <div className="exploration-heading">
        <span className="exploration-label">
          {presentation === "worked-example"
            ? "Worked example"
            : presentation === "reference-diagram"
              ? "Mathematical diagram"
              : contract?.type.replaceAll("-", " ") || "Model"}
        </span>
        <span className="exploration-description">
          <Prose>
            {contract?.name ||
              (presentation === "model"
                ? "Test an example"
                : lesson.navTitle || lesson.title)}
          </Prose>
        </span>
        <div className="exploration-actions">
          {open && (
            <button
              onClick={() => setExpanded(!expanded)}
              aria-label={
                expanded ? "Compact visualisation" : "Enlarge visualisation"
              }
            >
              {expanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              <span>{expanded ? "Compact" : "Enlarge"}</span>
            </button>
          )}
          <button
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls="laboratory-content"
          >
            {open ? "Minimise" : "Explore"}
            {open ? <Minus size={17} /> : <Plus size={17} />}
          </button>
        </div>
      </div>
      <div
        hidden={!open}
        id="laboratory-content"
        className="visual-panel"
        data-machine={lesson.machine}
      >
        <div className="experiment-context">
          {contract && (
            <>
              <h2>
                <Prose>{contract.question}</Prose>
              </h2>
              <p>
                <Prose>{contract.objects}</Prose>
              </p>
              {!integratedPrediction && (
                <>
                  <label className="prediction-prompt">
                    <Prose focusable={false}>{contract.prediction}</Prose>
                    <textarea
                      value={prediction}
                      onChange={(event) => setPrediction(event.target.value)}
                      aria-label="Your mathematical prediction"
                    />
                  </label>
                  {!testing && (
                    <button
                      disabled={!prediction.trim()}
                      onClick={() => setTesting(true)}
                    >
                      Test my prediction
                    </button>
                  )}
                </>
              )}
            </>
          )}
          <p>
            <Prose>{contract?.prediction || lesson.prompt}</Prose>
          </p>
          <p className="reading-caption">
            <Prose>
              {presentation === "worked-example"
                ? "Follow the lesson's actual worked construction. Read the objects and hypotheses before the calculation, then use the reading for its proof."
                : contract?.debrief || lesson.labScope}
            </Prose>
          </p>
        </div>
        {(!contract || testing || integratedPrediction) && (
          <Laboratory key={lesson.id} l={lesson} />
        )}
        {contract && testing && !integratedPrediction && (
          <section className="laboratory-debrief">
            <h3>Invariant</h3>
            <p>
              <Prose>{contract.invariant}</Prose>
            </p>
            <h3>Try a failure state</h3>
            <p>
              <Prose>{contract.counterexample}</Prose>
            </p>
            <h3>Theorem debrief and proof boundary</h3>
            <p>
              <Prose>{contract.debrief}</Prose>
            </p>
            <p>
              <Prose>{contract.fallback}</Prose>
            </p>
          </section>
        )}
      </div>
    </section>
  );
}
