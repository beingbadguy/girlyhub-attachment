import { kv } from "@vercel/kv";
import { getConfig } from "./config";

export type Attempt = { name: string; createdAt: string; success: boolean; error?: string };

const key = "girlyhub:upload-attempts";
const localAttempts: Attempt[] = [];

export async function recordAttempt(attempt: Attempt) {
  localAttempts.unshift(attempt);
  if (localAttempts.length > 100) localAttempts.pop();

  const config = getConfig();
  if (config.KV_REST_API_URL && config.KV_REST_API_TOKEN) {
    try {
      await kv.lpush(key, attempt);
    } catch (err) {
      console.warn("Could not record attempt to KV:", err);
    }
  }
}

export async function getUploadAttempts(): Promise<Attempt[]> {
  const config = getConfig();
  if (config.KV_REST_API_URL && config.KV_REST_API_TOKEN) {
    try {
      const records = await kv.lrange<Attempt>(key, 0, 99);
      if (records && records.length > 0) return records;
    } catch (err) {
      console.warn("Could not read attempts from KV:", err);
    }
  }
  return localAttempts;
}
