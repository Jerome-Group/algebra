"use client";
import { useId, useState } from "react";
import type { Assessment } from "@/lib/algebra/guided";
import { useLearningProgress } from "./LearningProgress";
import { Prose } from "./Math";

export function Checkpoint({
  assessment,
  title,
  competencyId,
}: {
  assessment: Assessment;
  title: string;
  competencyId?: string;
}) {
  const group = useId();
  const { progress, mastered, submit } = useLearningProgress();
  const saved = competencyId ? progress.attempts[competencyId] : undefined;
  const [choice, setChoice] = useState<number | null>(null);
  const [result, setResult] = useState<boolean | null>(null);
  return (
    <form
      className="learning-checkpoint"
      onSubmit={(event) => {
        event.preventDefault();
        if (choice !== null) {
          setResult(choice === assessment.answer);
          if (competencyId) submit(competencyId, choice);
        }
      }}
    >
      {saved && (
        <p className="saved-checkpoint">
          {mastered.has(competencyId!)
            ? "Demonstrated on this device"
            : "Review needed"}{" "}
          · {saved.submissions} submitted attempt
          {saved.submissions === 1 ? "" : "s"}. Latest submitted reasoning
          determines progress.
        </p>
      )}
      <fieldset aria-describedby={`${group}-feedback`}>
        <legend>
          <span>{title}</span>
          <Prose>{assessment.question}</Prose>
        </legend>
        {assessment.choices.map((option, index) => (
          <label key={index}>
            <input
              type="radio"
              name={group}
              value={index}
              checked={choice === index}
              onChange={() => {
                setChoice(index);
                setResult(null);
              }}
            />
            <Prose>{option}</Prose>
          </label>
        ))}
      </fieldset>
      <button type="submit" disabled={choice === null}>
        Check reasoning
      </button>
      <p id={`${group}-feedback`} role="status">
        {result !== null && (
          <>
            <strong>{result ? "Correct. " : "Reconsider. "}</strong>
            <Prose>{assessment.explanation}</Prose>
            {!result && (
              <span>
                {" "}
                Revisit the worked examples and proof moves, or follow the
                prerequisite/remediation links, then try again.
              </span>
            )}
          </>
        )}
      </p>
    </form>
  );
}
