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
  const owner = readOwner(process.env.ALGEBRA_LOCAL_OWNER, root, origin);
  requireOwnerIdentity(
    await observeIdentity(origin, buildIdentity(root), owner),
    owner,
  );
}
