import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  href?: string;
  className?: string;
  logoClassName?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  variant?: "default" | "onDark";
}

export function BrandLogo({
  href = "/",
  className,
  logoClassName,
  titleClassName,
  subtitleClassName,
  variant = "default",
}: BrandLogoProps) {
  const titleColor = variant === "onDark" ? "text-white" : "text-gray-900";
  const subtitleColor = variant === "onDark" ? "text-white/60" : "text-gray-400";

  return (
    <Link href={href} className={cn("flex items-center gap-3", className)}>
      <div className={cn("relative w-9 h-9 shrink-0", logoClassName)}>
        <Image
          src="/images/logo.png"
          alt="HireGen AI"
          fill
          sizes="36px"
          className="object-contain"
          priority
        />
      </div>
      <div className="leading-tight">
        <p className={cn("font-extrabold text-[15px]", titleColor, titleClassName)}>
          HireGen <span className="text-[#6c47ff]">AI</span>
        </p>
        <p className={cn("text-[11px]", subtitleColor, subtitleClassName)}>
          AI-Powered Interview Question Generator
        </p>
      </div>
    </Link>
  );
}

