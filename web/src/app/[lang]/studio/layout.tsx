import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getClerkSession } from "@/lib/clerk-auth";
import StudioShell from "@/components/studio-shell";
import { getLocale } from "@/lib/locale-server";

async function AuthenticatedStudio({ children }: { children: React.ReactNode }) {
  // Session cookies and their expiry are request-time values; keep them out of the prerendered shell.
  await connection();
  const session = await getClerkSession();
  if (!session) redirect("/login");
  return <StudioShell name={session.name} email={session.email}>{children}</StudioShell>;
}

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return <Suspense fallback={<div className="studio-loading" aria-live="polite">{locale === "fr" ? "Ouverture de votre studio…" : "Opening your studio…"}</div>}>
    <AuthenticatedStudio>{children}</AuthenticatedStudio>
  </Suspense>;
}
