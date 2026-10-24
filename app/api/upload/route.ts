import { getConfig } from "@/lib/config";
import { getSession } from "@/lib/session";
import { uploadToDrive } from "@/lib/drive";
import { recordAttempt } from "@/lib/upload-log";
import { fileTypeFromBuffer } from "file-type";
import { isRateLimited } from "@/lib/rate-limit";

const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);
const maxFiles = 20;

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (session.role !== "admin" && session.role !== "uploader") {
      return Response.json(
        { error: "Upload access is required. Please click 'Access Key' and enter the secret." },
        { status: 401 }
      );
    }

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (isRateLimited(`upload:${ip}`, 60, 60 * 60 * 1000)) {
      return Response.json({ error: "Upload rate limit reached. Try again later." }, { status: 429 });
    }

    const config = getConfig();
    const form = await request.formData();
    const files = form.getAll("files").filter((value): value is File => value instanceof File);

    if (!files.length || files.length > maxFiles) {
      return Response.json({ error: `Choose between 1 and ${maxFiles} images.` }, { status: 400 });
    }

    const results = await Promise.all(
      files.map(async (file) => {
        const name = file.name.replace(/[^\w.\- ()]/g, "_");
        const bytes = Buffer.from(await file.arrayBuffer());
        const detected = await fileTypeFromBuffer(bytes);
        const detectedMime = detected?.mime ?? "";

        if (!allowed.has(file.type) || !allowed.has(detectedMime) || !/\.(jpe?g|png|webp|heic)$/i.test(name)) {
          const error = "Unsupported or invalid image type.";
          await recordAttempt({ name, createdAt: new Date().toISOString(), success: false, error });
          return { name, success: false, error };
        }

        if (file.size === 0 || file.size > config.MAX_UPLOAD_SIZE_MB * 1024 * 1024) {
          const error = `File exceeds the ${config.MAX_UPLOAD_SIZE_MB} MB limit.`;
          await recordAttempt({ name, createdAt: new Date().toISOString(), success: false, error });
          return { name, success: false, error };
        }

        try {
          const uploaded = await uploadToDrive(new File([bytes], name, { type: detectedMime }));
          await recordAttempt({ name, createdAt: new Date().toISOString(), success: true });
          return { name, success: true, fileId: uploaded.id };
        } catch (driveErr) {
          console.error("Google Drive upload error:", driveErr);
          const error = driveErr instanceof Error ? driveErr.message : "Google Drive could not save this image.";
          await recordAttempt({ name, createdAt: new Date().toISOString(), success: false, error });
          return { name, success: false, error };
        }
      })
    );

    return Response.json({ results }, { status: results.some((result) => result.success) ? 200 : 502 });
  } catch (err) {
    console.error("Upload route error:", err);
    const message = err instanceof Error ? err.message : "The upload request was invalid or could not be processed.";
    return Response.json({ error: message }, { status: 500 });
  }
}
