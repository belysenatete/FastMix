import { proxyWorker } from "@/lib/worker-proxy";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  const { id } = await params;
  return proxyWorker(request, `/api/projects/${encodeURIComponent(id)}/tracks`, "GET");
}

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  return proxyWorker(request, `/api/projects/${encodeURIComponent(id)}/tracks`, "POST");
}
