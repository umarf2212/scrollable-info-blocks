import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  const description = "Finite, structured learning journeys delivered one focused block at a time.";

  return {
    metadataBase: new URL(origin),
    title: {
      default: "InfoBlocks — Scroll with somewhere to arrive",
      template: "%s · InfoBlocks",
    },
    description,
    applicationName: "InfoBlocks",
    keywords: ["microlearning", "AI agent orchestration", "graphs", "DSU", "minimum spanning tree"],
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
    openGraph: {
      title: "InfoBlocks — Scroll with somewhere to arrive",
      description,
      type: "website",
      url: origin,
      images: [{ url: `${origin}/og.png`, width: 1731, height: 909, alt: "InfoBlocks learning journeys for agent orchestration and graph algorithms" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "InfoBlocks — Scroll with somewhere to arrive",
      description,
      images: [`${origin}/og.png`],
    },
  };
}

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
