"use client";
import { useId, useState } from "react";
import type { Assessment } from "@/lib/algebra/guided";
import { Prose } from "./Math";

export function Checkpoint({
  assessment,
  title,
}: {
  assessment: Assessment;
  title: string;
}) {
  const group = useId();
  const [choice, setChoice] = useState<number | null>(null);
  const [result, setResult] = useState<boolean | null>(null);
  return (
    <form
      className="learning-checkpoint"
      onSubmit={(event) => {
        event.preventDefault();
        if (choice !== null) setResult(choice === assessment.answer);
      }}
    >
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
          </>
        )}
      </p>
    </form>
  );
}
