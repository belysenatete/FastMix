import type { Metadata } from "next";
import { SimplePage } from "@/components/site-chrome";

export const metadata: Metadata = { title: "Cookies" };

export default function CookiesPage() {
  return <SimplePage label="Cookies" title="Cookie information" intro="FastMix only uses the cookies Clerk needs to keep you signed in.">
    <div className="prose">
      <p>The studio also remembers your recent session details in your browser so it opens where you left off. No analytics or advertising cookies are set.</p>
    </div>
  </SimplePage>;
}
