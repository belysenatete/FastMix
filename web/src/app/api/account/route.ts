import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getClerkSession } from "@/lib/clerk-auth";
import { proxyWorker } from "@/lib/worker-proxy";

/** Deletes the signed-in account: audio and data first, then the Clerk sign-in. Safe to repeat. */
export async function DELETE(request: Request) {
  const session = await getClerkSession();
  if (!session) return NextResponse.json({ error: "Sign in to delete your account." }, { status: 401 });
  const removed = await proxyWorker(request, "/api/account", "DELETE");
  if (!removed.ok) return removed;
  try {
    await (await clerkClient()).users.deleteUser(session.id);
  } catch {
    return NextResponse.json({ error: "Your sessions and audio were deleted, but the sign-in account could not be removed. Please retry." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
