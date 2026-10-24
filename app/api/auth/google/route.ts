import { randomBytes } from "node:crypto";
import { authorizationUrl } from "@/lib/google";
import { getSession } from "@/lib/session";
export async function GET() { const session = await getSession(); const state = randomBytes(24).toString("hex"); session.oauthState = state; await session.save(); return Response.redirect(authorizationUrl(state)); }
