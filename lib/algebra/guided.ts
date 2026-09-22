import content from "./guided-lessons.json" with { type: "json" };

export const assessmentKinds = [
  "recognise",
  "compute",
  "explain",
  "proof-step",
  "hypotheses",
  "transfer",
] as const;
export type Assessment = {
  kind: (typeof assessmentKinds)[number];
  question: string;
  choices: string[];
  answer: number;
  explanation: string;
};
export type GuidedContent = {
  hook: string;
  objects: string;
  prerequisiteCheck: Assessment;
  examples: { title: string; steps: string[] }[];
  nonexample: { title: string; explanation: string };
  proofSteps: string[];
  boundaryCheck: Assessment;
  application: Assessment;
  transfer: Assessment;
  connection: string;
};

export function guidedContent(id: string): GuidedContent | undefined {
  return (content as Record<string, GuidedContent>)[id];
}
