import type { Metadata } from "next";
import { SimplePage } from "@/components/site-chrome";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return <SimplePage label="Terms" title="Terms of service" intro="FastMix is a product preview. Paid plans are not offered yet.">
    <div className="prose">
      <p>Only upload audio you own or have permission to use. Keep your own copies of important recordings; preview data may be reset.</p>
      <p className="notice">Final terms will be published before launch.</p>
    </div>
  </SimplePage>;
}
