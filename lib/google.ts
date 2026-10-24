import { google } from "googleapis";
import { getConfig } from "./config";

export function getOAuthClient() {
  const config = getConfig();
  return new google.auth.OAuth2(config.GOOGLE_CLIENT_ID, config.GOOGLE_CLIENT_SECRET, config.GOOGLE_REDIRECT_URI);
}

export function authorizationUrl(state: string) {
  return getOAuthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/userinfo.email"
    ],
    state
  });
}
