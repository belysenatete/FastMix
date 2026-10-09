import { redirect } from "next/navigation";
import { getDemoSession } from "@/lib/demo-auth";
import StudioShell from "@/components/studio-shell";

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const session = await getDemoSession();
  if (!session) redirect("/login");
  return <StudioShell name={session.name} email={session.email}>{children}</StudioShell>;
}
