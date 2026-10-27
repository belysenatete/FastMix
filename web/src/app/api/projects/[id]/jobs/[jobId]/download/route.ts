import { proxyWorker } from "@/lib/worker-proxy";

type Context = { params: Promise<{ id: string; jobId: string }> };

export async function GET(request: Request, { params }: Context) {
  const { id, jobId } = await params;
  const search = new URL(request.url).searchParams;
  const query = new URLSearchParams();
  if (search.get("inline") === "1") query.set("inline", "true");
  const format = search.get("format");
  if (format === "mp3" || format === "wav") query.set("format", format);
  const suffix = query.size ? `?${query}` : "";
  return proxyWorker(request, `/api/projects/${encodeURIComponent(id)}/jobs/${encodeURIComponent(jobId)}/download${suffix}`, "GET");
}
