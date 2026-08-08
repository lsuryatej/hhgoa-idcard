import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Frame in Goa — Hacker House Goa 2026",
  description:
    "Drop in a photo, get an HH Goa 2026 profile frame or builder pass, and post it to X. No login, no crop step.",
  openGraph: {
    title: "Frame in Goa — Hacker House Goa 2026",
    description:
      "Drop in a photo, get an HH Goa 2026 profile frame or builder pass, and post it to X.",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#0b6839",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="tape" />
        {children}
        <div className="tape" style={{ marginTop: 40 }} />
      </body>
    </html>
  );
}
