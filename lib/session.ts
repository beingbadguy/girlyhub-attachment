import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { getConfig } from "./config";

export type SessionData = { role?: "admin" | "uploader"; email?: string; oauthState?: string };
export const sessionOptions = (): SessionOptions => ({ cookieName: "girlyhub_session", password: getConfig().SESSION_SECRET, cookieOptions: { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 60 * 60 * 12 } });
export async function getSession() { return getIronSession<SessionData>(await cookies(), sessionOptions()); }
