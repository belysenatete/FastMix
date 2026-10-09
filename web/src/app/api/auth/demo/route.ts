import { NextResponse } from "next/server";
import { createDemoToken, demoCookieName, demoSessionSeconds } from "@/lib/demo-auth";

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Demo sign-in is available only during local development." }, { status: 404 });
  }
  const body = await request.json().catch(() => null) as { email?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Enter a valid email address for the local demo." }, { status: 400 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(demoCookieName, createDemoToken(email), {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: demoSessionSeconds,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(demoCookieName, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}

export async function GET() {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ authenticated: false });
  const { cookies } = await import("next/headers");
  const { verifyDemoToken } = await import("@/lib/demo-auth");
  const jar = await cookies();
  const session = verifyDemoToken(jar.get(demoCookieName)?.value);
  return NextResponse.json({ authenticated: Boolean(session), user: session ? { name: session.name, email: session.email } : null });
}
