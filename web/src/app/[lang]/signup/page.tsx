import type { Metadata } from "next";
import AuthCard from "@/components/auth-card";
import { getLocale } from "@/lib/locale-server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: locale === "fr" ? "Créez votre espace" : "Create your workspace" };
}
export default function SignupPage() { return <AuthCard mode="signup" />; }
