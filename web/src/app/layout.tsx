import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "FastMix - Your sound, shaped faster",
    template: "%s | FastMix",
  },
  description:
    "Shape your mix with a clear workflow, useful guidance, and a studio built for independent artists.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full"><ClerkProvider>{children}</ClerkProvider></body>
    </html>
  );
}
