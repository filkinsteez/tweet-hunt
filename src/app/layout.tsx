import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "tweet-hunt",
  description: "A retro arcade prototype for reviewing and deleting tweets through gameplay."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
