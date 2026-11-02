import { NextResponse } from "next/server";
import { getClerkSession } from "@/lib/clerk-auth";

export async function proxyWorker(request: Request, workerPath: string, method: "GET" | "POST" | "DELETE") {
  const session = await getClerkSession();
  if (!session) return NextResponse.json({ error: "Sign in to manage tracks." }, { status: 401 });
  const internalSecret = process.env.INTERNAL_API_SECRET;
  if (!internalSecret) return NextResponse.json({ error: "The private audio service is not configured." }, { status: 503 });

  // Audio never passes through here: the browser uploads it straight to storage with a signed link
  // (see /tracks/uploads), so every request this proxies is small JSON.
  if (method === "POST" && Number(request.headers.get("content-length") || "0") > 64 * 1024) {
    return NextResponse.json({ error: "Request too large." }, { status: 413 });
  }

  const headers = new Headers({
    "X-Internal-Secret": internalSecret,
    "X-User-ID": session.id,
  });
  const contentType = request.headers.get("content-type");
  if (contentType && method === "POST") headers.set("Content-Type", contentType);
  const options: RequestInit & { duplex?: "half" } = {
    method,
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(method === "GET" ? 15_000 : 180_000),
  };
  if (method === "POST" && request.body) {
    options.body = request.body;
    options.duplex = "half";
  }

  const baseUrl = (process.env.WORKER_API_URL || "http://localhost:8000").replace(/\/$/, "");
  try {
    const response = await fetch(`${baseUrl}${workerPath}`, options);
    const responseBody = await response.text();
    return new NextResponse(responseBody, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("content-type") || "application/json" },
    });
  } catch {
    return NextResponse.json({ error: "Private audio storage is unavailable. Start the local API and storage services, then retry." }, { status: 503 });
  }
}
