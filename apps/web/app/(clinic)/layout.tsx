import type { Metadata, Viewport } from "next";
import ServiceWorkerRegistration from "@/components/app/ServiceWorkerRegistration";

export const metadata: Metadata = {
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#4c1d95",
};

export default function ClinicGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ServiceWorkerRegistration />
      {children}
    </>
  );
}
