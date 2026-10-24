import { timingSafeEqual } from "node:crypto";
import { getConfig } from "@/lib/config";
import { getSession } from "@/lib/session";
import { isRateLimited } from "@/lib/rate-limit";

function safeEqual(a: string, b: string) { const left = Buffer.from(a); const right = Buffer.from(b); return left.length === right.length && timingSafeEqual(left, right); }
export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (isRateLimited(`access:${ip}`, 10, 15 * 60 * 1000)) return Response.json({ error: "Too many attempts. Try again later." }, { status: 429 });
    const body = await request.json() as { secret?: unknown }; const config = getConfig();
    if (typeof body.secret !== "string" || !safeEqual(body.secret, config.UPLOAD_ACCESS_SECRET)) return Response.json({ error: "Invalid upload access." }, { status: 401 });
    const session = await getSession(); session.role = "uploader"; await session.save(); return Response.json({ ok: true });
  } catch { return Response.json({ error: "Unable to enable upload access." }, { status: 500 }); }
}
