import { readFile } from "node:fs/promises";
import path from "node:path";
import prettier from "prettier";
import {
  sha256,
  readCatalogue,
  compileManifest,
  generateModule,
} from "../math-presentation.mjs";
import {
  readReview,
  reviewFile,
  verifyCompleteReview,
} from "../math-review.mjs";
import { hashValue } from "./identity.mjs";
export async function coreEvidence(root) {
  const catalogue = await readCatalogue(root);
  const manifestBytes = await readFile(
    path.join(root, "lib/algebra/math-presentation/annotations.json"),
  );
  const manifest = JSON.parse(manifestBytes);
  const review = await readReview(root);
  const compiled = compileManifest(catalogue, manifest);
  const complete = await verifyCompleteReview({
    root,
    catalogue,
    manifest,
    compiled,
    review,
  });
  const generated = await prettier.format(generateModule(compiled), {
    parser: "typescript",
  });
  if (
    (await readFile(
      path.join(root, "lib/algebra/math-presentation.generated.ts"),
      "utf8",
    )) !== generated
  )
    throw new Error("Strict core generated presentation is stale");
  const reviewBytes = await readFile(path.join(root, reviewFile));
  return {
    digest: hashValue({
      complete,
      manifestBytes: sha256(manifestBytes),
      reviewBytes: sha256(reviewBytes),
      reports: review.reports,
    }),
    complete,
  };
}
