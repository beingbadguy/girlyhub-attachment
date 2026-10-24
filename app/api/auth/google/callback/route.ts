import { google } from "googleapis";
import { getOAuthClient } from "@/lib/google";
import { getSession } from "@/lib/session";
import { getRefreshToken, saveRefreshToken } from "@/lib/token-store";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const redirectUri = `${url.origin}/api/auth/google/callback`;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const session = await getSession();

  if (!code) {
    return new Response("Missing authorization code from Google.", { status: 400 });
  }

  // Only reject if an oauthState was previously stored and does not match the callback state
  if (session.oauthState && state && session.oauthState !== state) {
    console.warn("OAuth state mismatch: expected", session.oauthState, "got", state);
    return new Response("Invalid OAuth state. Please restart authorization.", { status: 400 });
  }

  try {
    const client = getOAuthClient(redirectUri);
    const { tokens } = await client.getToken(code);
    const refreshToken = tokens.refresh_token ?? (await getRefreshToken());

    if (!refreshToken) {
      throw new Error("No refresh token returned by Google.");
    }

    if (tokens.refresh_token) {
      await saveRefreshToken(tokens.refresh_token);
    }

    client.setCredentials(tokens);

    let email = "Administrator";
    try {
      const user = await google.oauth2({ version: "v2", auth: client }).userinfo.get();
      if (user.data.email) email = user.data.email;
    } catch {
      // Gracefully continue if userinfo request cannot be completed
    }

    session.role = "admin";
    session.email = email;
    session.oauthState = undefined;
    await session.save();

    return Response.redirect(new URL("/admin", request.url));
  } catch (error) {
    console.error("OAuth callback error:", error);
    const message = error instanceof Error ? error.message : "Google authorization could not be completed.";
    return new Response(`Google authorization failed: ${message}. Check server logs and try again.`, { status: 500 });
  }
}
