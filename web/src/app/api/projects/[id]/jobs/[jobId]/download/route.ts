import { proxyWorker } from "@/lib/worker-proxy";

type Context = { params: Promise<{ id: string; jobId: string }> };

export async function GET(request: Request, { params }: Context) {
  const { id, jobId } = await params;
  const inline = new URL(request.url).searchParams.get("inline") === "1";
  return proxyWorker(request, `/api/projects/${encodeURIComponent(id)}/jobs/${encodeURIComponent(jobId)}/download${inline ? "?inline=true" : ""}`, "GET");
}
