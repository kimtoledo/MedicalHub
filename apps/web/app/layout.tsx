import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ToothHub PH — Smart Dental Practice Management",
  description:
    "ToothHub PH is the all-in-one platform for Philippine dental clinics. Manage appointments, patient records, staff, and grow your practice online.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
