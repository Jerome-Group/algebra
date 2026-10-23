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
  const { progress, mastered, submit, account, acknowledged } =
    useLearningProgress();
  const saved = competencyId
    ? (account ? acknowledged?.progress : progress)?.attempts[competencyId]
    : undefined;
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
            ? "Demonstrated reasoning"
            : "Review needed"}{" "}
          · {saved.submissions} submitted attempt
          {saved.submissions === 1 ? "" : "s"}. Latest submitted reasoning
          determines progress.
          {account &&
          competencyId &&
          acknowledged?.progress.attempts[competencyId] === saved
            ? " Saved to your account."
            : " Temporary session answer."}
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
              aria-labelledby={`${group}-option-${index}`}
              name={group}
              value={index}
              checked={choice === index}
              onChange={() => {
                setChoice(index);
                setResult(null);
              }}
            />
            <span id={`${group}-option-${index}`}>
              <span className="sr-only">Choice {index + 1}. </span>
              <Prose focusable={false}>{option}</Prose>
            </span>
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
