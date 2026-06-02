import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "dura — crash-proof AI agents",
  description:
    "Durable execution for AI agents. Make any agent's actions atomic, exactly-once, and rollback-able. When an agent crashes mid-task, dura resumes it — no double-charges, no corrupted state.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="bg-ink text-white antialiased font-sans">{children}</body>
    </html>
  );
}
