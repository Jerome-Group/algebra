import type { z } from "zod";
import type { Lesson } from "../lib/algebra/engine";
import type { GuidedContent } from "../lib/algebra/guided";
import type { LearningMetadata } from "../lib/algebra/learning";
import type { LearningUnit } from "../lib/algebra/routes";
import type { proposalSchema } from "../scripts/lib/ureca-proposals.mjs";

type Proposal = z.infer<typeof proposalSchema>;
type Entry = Proposal["entries"][number];
type Conforms<Expected, Actual extends Expected> = Actual;

export type UrecaAuthoringContracts = [
  Conforms<Lesson, Entry["lesson"]>,
  Conforms<GuidedContent, Entry["guide"]>,
  Conforms<LearningMetadata, Entry["metadata"]>,
  Conforms<LearningUnit, Proposal["units"][number]>,
];
