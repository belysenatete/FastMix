import type { Metadata } from "next";
import { SimplePage } from "@/components/site-chrome";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return <SimplePage label="Privacy" title="Your music stays yours" intro="FastMix uses Clerk to manage sign-in. Your sessions and audio are private to your account, and you can delete them from your library at any time.">
    <div className="prose">
      <p>When you request an AI mix or master, your audio is sent to our processing partner, RoEx, to create the result.</p>
      <p className="notice">A complete privacy notice covering audio processing, retention, deletion and providers will be published before launch.</p>
    </div>
  </SimplePage>;
}
