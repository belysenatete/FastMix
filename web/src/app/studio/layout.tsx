import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getClerkSession } from "@/lib/clerk-auth";
import StudioShell from "@/components/studio-shell";

async function AuthenticatedStudio({ children }: { children: React.ReactNode }) {
  // Session cookies and their expiry are request-time values; keep them out of the prerendered shell.
  await connection();
  const session = await getClerkSession();
  if (!session) redirect("/login");
  return <StudioShell name={session.name} email={session.email}>{children}</StudioShell>;
}

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="studio-loading" aria-live="polite">Opening your studio…</div>}>
    <AuthenticatedStudio>{children}</AuthenticatedStudio>
  </Suspense>;
}
