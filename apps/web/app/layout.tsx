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
  title: "Dentra.ph — Smarter Dentistry. Better Care.",
  description:
    "Dentra.ph is the all-in-one platform for Philippine dental clinics. Manage appointments, patient records, staff, and grow your practice online.",
  icons: {
    icon: "/brand/dentra-logo-icon.svg",
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
