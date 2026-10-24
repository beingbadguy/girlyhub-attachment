import { z } from "zod";

const emptyToUndefined = (val: unknown) => (typeof val === "string" && val.trim() === "" ? undefined : val);
const cleanFolderId = (val: unknown) => {
  if (typeof val !== "string") return undefined;
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/^GOOGLE_DRIVE_FOLDER_ID=/, "").trim() || undefined;
};

const envSchema = z.object({
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_REDIRECT_URI: z.string().url(),
  GOOGLE_DRIVE_FOLDER_ID: z.preprocess(cleanFolderId, z.string().optional()),
  GOOGLE_REFRESH_TOKEN: z.preprocess(emptyToUndefined, z.string().optional()),
  SESSION_SECRET: z.string().min(32),
  UPLOAD_ACCESS_SECRET: z.string().min(16),
  MAX_UPLOAD_SIZE_MB: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().default(25)),
  KV_REST_API_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
  KV_REST_API_TOKEN: z.preprocess(emptyToUndefined, z.string().min(1).optional())
});

export function getConfig() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Environment configuration error:", parsed.error.format());
    throw new Error("Server configuration is incomplete: " + parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", "));
  }
  return parsed.data;
}
