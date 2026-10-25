import fs from "node:fs";
import path from "node:path";
import { sha256 } from "./lib/math-presentation.mjs";
import { fileURLToPath } from "node:url";
import {
  buildIdentity,
  observeIdentity,
  requireOwnerIdentity,
} from "./algebra-identity.mjs";
import { loopback, readOwner } from "./algebra-runtime.mjs";

export default async function verifyOwnedTarget(config) {
  const origin = config.projects[0].use.baseURL;
  if (!loopback(origin)) return;
  const root = fileURLToPath(new URL("../", import.meta.url));
  const descriptorFile = process.env.ALGEBRA_PUBLIC_MATH_DESCRIPTOR;
  const descriptor = descriptorFile
    ? JSON.parse(fs.readFileSync(descriptorFile, "utf8"))
    : null;
  const capture = async (destination) => {
    const owner = readOwner(process.env.ALGEBRA_LOCAL_OWNER, root, origin);
    const target = await observeIdentity(origin, buildIdentity(root), owner);
    requireOwnerIdentity(target, owner);
    if (descriptor) {
      if (owner.kind !== "built")
        throw new Error(
          "Public mathematics execution requires an owned production Worker",
        );
      fs.writeFileSync(
        destination,
        JSON.stringify({
          root,
          origin,
          ownerFile: path
            .relative(root, owner.ownerFile)
            .split(path.sep)
            .join("/"),
          ownerSha256: sha256(fs.readFileSync(owner.ownerFile)),
          runId: owner.runId,
          pid: owner.pid,
          processIdentity: owner.processIdentity,
          kind: owner.kind,
          acknowledgedRunId: target.localRunId,
          identity: target.observed,
          sourceMatch: target.sourceMatch,
          dependencyMatch: target.dependencyMatch,
        }) + "\n",
        { flag: "wx" },
      );
    }
  };
  await capture(descriptor?.targetBefore);
  return async () => capture(descriptor?.targetAfter);
}
