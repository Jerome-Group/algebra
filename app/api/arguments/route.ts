import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";
import { handleArguments } from "../../../lib/algebra/argument-server";

export const dynamic = "force-dynamic";
async function respond(request: Request) {
  return handleArguments({
    request,
    user: await getChatGPTUser(request.headers),
    db: env.DB,
  });
}
export const GET = respond;
export const POST = respond;
