import { kv } from "@vercel/kv";
import { getConfig } from "./config";

const key = "girlyhub:google:refresh-token";
let localMemoryToken: string | null = null;

export async function getRefreshToken() {
  const config = getConfig();
  if (config.KV_REST_API_URL && config.KV_REST_API_TOKEN) {
    try {
      const stored = await kv.get<string>(key);
      if (stored) return stored;
    } catch (err) {
      console.warn("Could not retrieve token from KV store, falling back to local:", err);
    }
  }
  return localMemoryToken ?? config.GOOGLE_REFRESH_TOKEN;
}

export async function saveRefreshToken(token: string) {
  const config = getConfig();
  if (config.KV_REST_API_URL && config.KV_REST_API_TOKEN) {
    try {
      await kv.set(key, token);
      return;
    } catch (err) {
      console.warn("Failed saving token to KV, keeping in memory:", err);
    }
  }

  // Fallback for local development when Vercel KV is not configured
  localMemoryToken = token;
  console.log(
    "\n[Auth] Google Refresh Token acquired! You can persist this in your .env:\n" +
      `GOOGLE_REFRESH_TOKEN=${token}\n`
  );
}
