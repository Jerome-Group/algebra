import type { Metadata } from "next";
import "./globals.css";
import "./algebra.css";
import "./laboratories.css";
import "./responsive.css";
import "katex/dist/katex.min.css";

const title = "Abstract Algebra";
const description =
  "A visual companion to groups, rings and representations. Rigorous mathematics, made tangible.";
const siteUrl = "https://algebra.jeromegroup.org";
const socialImage = {
  url: `${siteUrl}/og.png`,
  alt: "Abstract Algebra — Groups. Rings. Representations.",
  type: "image/png",
  width: 1734,
  height: 907,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  alternates: { canonical: siteUrl },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: title,
    title,
    description,
    images: [socialImage],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [socialImage],
  },
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: { url: "/logo.png", type: "image/png" },
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
