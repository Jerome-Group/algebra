import contracts from "./lab-contracts.json" with { type: "json" };
import type { LearningMetadata } from "./learning";
export type LabContract = {
  name: string;
  type: Exclude<LearningMetadata["visualisationType"], "none">;
  question: string;
  prediction: string;
  objects: string;
  invariant: string;
  counterexample: string;
  debrief: string;
  fallback: string;
};
export function labContract(id: string): LabContract | undefined {
  return (contracts as Record<string, LabContract>)[id];
}
