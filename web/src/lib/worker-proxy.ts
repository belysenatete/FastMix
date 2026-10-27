import { NextResponse } from "next/server";
import { getClerkSession } from "@/lib/clerk-auth";

export async function proxyWorker(request: Request, workerPath: string, method: "GET" | "POST" | "DELETE") {
  const session = await getClerkSession();
  if (!session) return NextResponse.json({ error: "Sign in to manage tracks." }, { status: 401 });
  const internalSecret = process.env.INTERNAL_API_SECRET;
  if (!internalSecret) return NextResponse.json({ error: "The private audio service is not configured." }, { status: 503 });

  const isTrackUpload = method === "POST" && workerPath.endsWith("/tracks");
  if (isTrackUpload) {
    const contentLength = Number(request.headers.get("content-length") || "0");
    if (contentLength > 105 * 1024 * 1024) return NextResponse.json({ error: "Audio files must be 100 MB or smaller." }, { status: 413 });
    if (!request.headers.get("content-type")?.startsWith("multipart/form-data;")) {
      return NextResponse.json({ error: "Send the track as a multipart audio upload." }, { status: 415 });
    }
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
