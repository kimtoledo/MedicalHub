import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: "variable",
  variable: "--font-inter",
  display: "swap",
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:5001'),
  title: {
    default: "Dentra.ph — Smarter Dentistry. Better Care.",
    template: "%s | Dentra.ph",
  },
  description:
    "Dentra.ph is the all-in-one platform for Philippine dental clinics. Manage appointments, patient records, staff, and grow your practice online.",
  icons: {
    icon: "/brand/dentra-logo-icon.svg",
  },
  openGraph: {
    title: "Dentra.ph — Smarter Dentistry. Better Care.",
    description: "The all-in-one platform for Philippine dental clinics and dentists.",
    type: "website",
    siteName: "Dentra.ph",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${inter.className} antialiased`}>{children}</body>
    </html>
  );
}
