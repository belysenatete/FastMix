import { proxyWorker } from "@/lib/worker-proxy";

type Context = { params: Promise<{ id: string; trackId: string }> };

export async function DELETE(request: Request, { params }: Context) {
  const { id, trackId } = await params;
  return proxyWorker(request, `/api/projects/${encodeURIComponent(id)}/tracks/${encodeURIComponent(trackId)}`, "DELETE");
}
