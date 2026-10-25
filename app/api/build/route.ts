declare const __ALGEBRA_BUILD_IDENTITY__: {
  version: number;
  algorithm: string;
  sourceDigest: string;
  inputCount: number;
  directDependencyDigest: string;
  directDependencyCount: number;
};

export function GET(request: Request) {
  const localRunId =
    "ALGEBRA_VERIFY_RUN_ID" in env &&
    typeof env.ALGEBRA_VERIFY_RUN_ID === "string"
      ? env.ALGEBRA_VERIFY_RUN_ID
      : null;
  const requestedOwner = new URL(request.url).searchParams.get("owner");
  if (requestedOwner && requestedOwner !== localRunId)
    return Response.json(
      { error: "Local server ownership differs" },
      { status: 409 },
    );
  return Response.json(
    { ...__ALGEBRA_BUILD_IDENTITY__, localRunId },
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}
import { env } from "cloudflare:workers";
