import { google } from "googleapis";
import { getConfig } from "./config";

export function getOAuthClient(redirectUri?: string) {
  const config = getConfig();
  const uri = redirectUri || config.GOOGLE_REDIRECT_URI;
  return new google.auth.OAuth2(config.GOOGLE_CLIENT_ID, config.GOOGLE_CLIENT_SECRET, uri);
}

export function authorizationUrl(state: string, redirectUri?: string) {
  return getOAuthClient(redirectUri).generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/userinfo.email"
    ],
    state
  });
}
