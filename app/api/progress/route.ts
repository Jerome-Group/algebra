import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";
import lessons from "../../../lib/algebra/lessons.json";
import { assessmentRegistry } from "../../../lib/algebra/progress";
import type { Lesson } from "../../../lib/algebra/engine";
import { handleAccountProgress } from "../../../lib/algebra/account-server";

export const dynamic = "force-dynamic";
const registry = assessmentRegistry(lessons as Lesson[]);
async function respond(request: Request) {
  return handleAccountProgress({
    request,
    user: await getChatGPTUser(request.headers),
    db: env.DB,
    registry,
  });
}
export const GET = respond;
export const POST = respond;
