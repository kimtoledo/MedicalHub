import Image from "next/image";

type DentraLogoProps = {
  className?: string;
  variant?: "primary" | "white" | "icon";
};

const logoSources = {
  primary: "/brand/dentra-logo-primary-horizontal.svg",
  white: "/brand/dentra-logo-white.svg",
  icon: "/brand/dentra-logo-icon.svg",
} as const;

export default function DentraLogo({
  className = "h-10 w-auto",
  variant = "primary",
}: DentraLogoProps) {
  return (
    <Image
      src={logoSources[variant]}
      alt={variant === "icon" ? "Dentra.ph" : "Dentra.ph — Smarter Dentistry. Better Care."}
      width={variant === "icon" ? 512 : 1200}
      height={variant === "icon" ? 512 : 320}
      className={className}
      priority
    />
  );
}
