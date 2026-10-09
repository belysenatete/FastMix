import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "fastmix_demo_session";
const SESSION_SECONDS = 60 * 60 * 8;
const DEVELOPMENT_SECRET = "fastmix-local-demo-only-change-before-deploy";

function secret() {
  return process.env.AUTH_SECRET || DEVELOPMENT_SECRET;
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export type DemoSession = { email: string; name: string; expiresAt: number };

export function createDemoToken(email: string) {
  const expiresAt = Date.now() + SESSION_SECONDS * 1000;
  const name = email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) || "Artist";
  const payload = Buffer.from(JSON.stringify({ email, name, expiresAt } satisfies DemoSession)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyDemoToken(token: string | undefined): DemoSession | null {
  if (!token || process.env.NODE_ENV === "production") return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as DemoSession;
    if (typeof session.email !== "string" || typeof session.expiresAt !== "number" || session.expiresAt < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

export async function getDemoSession() {
  if (process.env.NODE_ENV === "production") return null;
  const jar = await cookies();
  return verifyDemoToken(jar.get(COOKIE_NAME)?.value);
}

export const demoCookieName = COOKIE_NAME;
export const demoSessionSeconds = SESSION_SECONDS;
