import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
const publicBasePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const description = "Finite, structured learning journeys delivered one focused block at a time.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "InfoBlocks — Scroll with somewhere to arrive",
    template: "%s · InfoBlocks",
  },
  description,
  applicationName: "InfoBlocks",
  keywords: ["microlearning", "AI agent orchestration", "graphs", "DSU", "minimum spanning tree"],
  icons: {
    icon: `${publicBasePath}/favicon.svg`,
    shortcut: `${publicBasePath}/favicon.svg`,
  },
  openGraph: {
    title: "InfoBlocks — Scroll with somewhere to arrive",
    description,
    type: "website",
    url: siteUrl,
    images: [{ url: `${siteUrl}/og.png`, width: 1731, height: 909, alt: "InfoBlocks learning journeys for agent orchestration and graph algorithms" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "InfoBlocks — Scroll with somewhere to arrive",
    description,
    images: [`${siteUrl}/og.png`],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F3F1EC" },
    { media: "(prefers-color-scheme: dark)", color: "#0D100E" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
