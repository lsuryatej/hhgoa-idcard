import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://hhgoa-idcard-zeta.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Frame in Goa — Hacker House Goa 2026",
  description:
    "Drop in a photo, get an HH Goa 2026 profile frame or builder pass, and post it to X. No login, no crop step.",
  keywords: [
    "Hacker House Goa",
    "HH Goa 2026",
    "Frame in Goa",
    "Builder Pass",
    "ID Card",
    "PFP Frame",
  ],
  icons: {
    icon: [
      { url: "/icon", type: "image/png", sizes: "32x32" },
      { url: "/brand/goa_hindi.svg", type: "image/svg+xml" },
    ],
    shortcut: "/icon",
    apple: [
      { url: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "Frame in Goa — Hacker House Goa 2026",
    description:
      "Drop in a photo, get an HH Goa 2026 profile frame or builder pass, and post it to X. No login, no crop step.",
    url: siteUrl,
    siteName: "Hacker House Goa 2026",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Hacker House Goa 2026 Frame & Builder ID Card Generator",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Frame in Goa — Hacker House Goa 2026",
    description:
      "Drop in a photo, get an HH Goa 2026 profile frame or builder pass, and post it to X.",
    images: ["/opengraph-image"],
  },
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
