import { proxyWorker } from "@/lib/worker-proxy";

type Context = { params: Promise<{ id: string; jobId: string }> };

export async function POST(request: Request, { params }: Context) {
  const { id, jobId } = await params;
  return proxyWorker(request, `/api/projects/${encodeURIComponent(id)}/jobs/${encodeURIComponent(jobId)}/retry`, "POST");
}
