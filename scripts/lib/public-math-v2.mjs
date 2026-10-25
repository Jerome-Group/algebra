import { z } from "zod";
import { coreEvidence } from "./public-math/evidence.mjs";
import { hashValue } from "./public-math/identity.mjs";
import {
  observationRequirements,
  requiredFixtures,
} from "./public-math-v2/requirements.mjs";
import { sourceAcceptanceSchema } from "./public-math-v2/schema.mjs";
import { checkExecution } from "./public-math-v2/execution.mjs";
import {
  captureSource,
  assertSourceCurrent,
  savedEvidenceFile,
} from "./public-math-v2/source.mjs";
import {
  readSavedEvidence,
  validateLocalEvidence,
} from "./public-math-v2/reviews.mjs";

const planInput = z
  .object({ root: z.string().min(1), previous: z.unknown().optional() })
  .strict();
const checkInput = z
  .object({
    root: z.string().min(1),
    require: z.enum(["source-attestation", "executed-presentation"]),
  })
  .strict();

export async function planPublicMath(input) {
  const { root, previous } = planInput.parse(input);
  const capture = await captureSource(root);
  const prior = new Map(
    Array.isArray(previous?.units)
      ? previous.units
          .filter(
            (unit) =>
              typeof unit?.id === "string" &&
              typeof unit?.fingerprint === "string",
          )
          .map(({ id, fingerprint }) => [id, fingerprint])
      : [],
  );
  const invalidated = capture.plan.units
    .filter(
      ({ id, fingerprint }) => prior.has(id) && prior.get(id) !== fingerprint,
    )
    .map(({ id }) => id);
  const removed = [...prior.keys()].filter(
    (id) => !capture.plan.units.some((unit) => unit.id === id),
  );
  await assertSourceCurrent(capture);
  return {
    ...capture.plan,
    invalidated,
    removed,
    previousAuthority: "advisory-only",
  };
}

export async function checkPublicMath(input) {
  const { root, require } = checkInput.parse(input);
  let capture;
  try {
    capture = await captureSource(root);
    const core = await coreEvidence(capture.root);
    const saved = await readSavedEvidence(capture);
    if (!saved)
      throw new Error(
        `Missing complete-source independent evidence: ${savedEvidenceFile}`,
      );
    const localEvidence = await validateLocalEvidence(capture, saved.evidence);
    const sourceAcceptance = sourceAcceptanceSchema.parse({
      version: "public-math-source-acceptance-v2",
      sourceSetDigest: capture.plan.sourceSetDigest,
      contractDigest: capture.plan.contractDigest,
      graphDigest: capture.plan.graphDigest,
      coreDigest: core.digest,
      evidence: { file: savedEvidenceFile, sha256: saved.sha256 },
      reports: localEvidence.receipts.map(({ file, intentDigest, report }) => ({
        file,
        intentDigest,
        report,
      })),
      requiredCases: requiredFixtures(saved.evidence),
      observations: observationRequirements(saved.evidence),
    });
    const acceptanceDigest = hashValue(sourceAcceptance);
    await assertSourceCurrent(capture);
    if (
      (await coreEvidence(capture.root)).digest !== core.digest ||
      (await readSavedEvidence(capture))?.sha256 !== saved.sha256
    )
      throw new Error("Concurrent core or saved evidence drift");
    const base = {
      require,
      semanticApproval: true,
      sourceAcceptance,
      acceptanceDigest,
      nativeSignIn: "unverified",
      releaseApproval: false,
      mathematicalTruthProof: false,
    };
    if (require === "source-attestation")
      return {
        ...base,
        kind: "source-reviewed",
        satisfiesRequirement: true,
        renderedProof: "unverified",
        pending: [{ kind: "execution-unverified" }],
      };
    const execution = await checkExecution(
      capture,
      sourceAcceptance,
      acceptanceDigest,
    );
    await assertSourceCurrent(capture);
    if (
      (await coreEvidence(capture.root)).digest !== core.digest ||
      (await readSavedEvidence(capture))?.sha256 !== saved.sha256
    )
      throw new Error(
        "Concurrent source evidence drift after execution validation",
      );
    return execution.ok
      ? {
          ...base,
          kind: "exercised",
          satisfiesRequirement: true,
          renderedProof: "required-cases-exercised",
          execution,
          pending: [],
        }
      : {
          ...base,
          kind: "source-reviewed",
          satisfiesRequirement: false,
          renderedProof: "unverified",
          pending: execution.pending,
        };
  } catch (error) {
    return {
      kind: "blocked",
      require,
      satisfiesRequirement: false,
      semanticApproval: false,
      sourceAcceptance: null,
      pending: [{ kind: "invalid-source-or-evidence", reason: error.message }],
      renderedProof: "unverified",
      nativeSignIn: "unverified",
      releaseApproval: false,
      mathematicalTruthProof: false,
    };
  }
}
