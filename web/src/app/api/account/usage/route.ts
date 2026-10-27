import { proxyWorker } from "@/lib/worker-proxy";

export async function GET(request: Request) {
  return proxyWorker(request, "/api/account/usage", "GET");
}
