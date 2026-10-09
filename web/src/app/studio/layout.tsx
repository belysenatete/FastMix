import { redirect } from "next/navigation";
import { getDemoSession } from "@/lib/demo-auth";

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const session = await getDemoSession();
  if (!session) redirect("/login");
  return children;
}
