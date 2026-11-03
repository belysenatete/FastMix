import type { Metadata } from "next";
import AuthCard from "@/components/auth-card";
import { getLocale } from "@/lib/locale-server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: locale === "fr" ? "Connexion" : "Log in" };
}
export default function LoginPage() { return <AuthCard mode="login" />; }
