import { proxyWorker } from "@/lib/worker-proxy";

type Context = { params: Promise<{ id: string }> };

/** Returns a short-lived signed link the browser uses to upload a track straight to private storage. */
export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  return proxyWorker(request, `/api/projects/${encodeURIComponent(id)}/tracks/uploads`, "POST");
}
