
import type { Metadata } from "next";
import "./globals.css";
import "./aniverse-immersive.css";

export const metadata: Metadata = {
  title: "ANIVERSE AI — Your Anime Universe",
  description:
    "Your personal anime universe: track episodes, manage watch queues, explore trending anime, and discover your next favorite series with AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
