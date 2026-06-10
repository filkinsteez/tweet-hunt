import type { Metadata, Viewport } from "next";
import "@fontsource/press-start-2p/400.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "./globals.css";

const SITE_DESCRIPTION = "A retro arcade game where tweets turn into target practice.";

export const metadata: Metadata = {
  title: "Tweet Hunt",
  description: SITE_DESCRIPTION,
  openGraph: {
    title: "Tweet Hunt",
    description: SITE_DESCRIPTION
  },
  twitter: {
    card: "summary",
    title: "Tweet Hunt",
    description: SITE_DESCRIPTION
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
