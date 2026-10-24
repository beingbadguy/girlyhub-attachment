import { randomBytes } from "node:crypto";
import { authorizationUrl } from "@/lib/google";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const redirectUri = `${url.origin}/api/auth/google/callback`;
  const session = await getSession();
  const state = randomBytes(24).toString("hex");
  session.oauthState = state;
  await session.save();
  return Response.redirect(authorizationUrl(state, redirectUri));
}
