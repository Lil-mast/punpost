"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface AnimatedRaysProps {
  className?: string;
  children?: React.ReactNode;
  /** Softer full-page mask instead of top-right hero spotlight */
  fullPage?: boolean;
}

export function AnimatedRays({
  className = "",
  children,
  fullPage = false,
}: AnimatedRaysProps) {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkDark = () => document.documentElement.classList.contains("dark");
    setIsDark(checkDark());

    const observer = new MutationObserver(() => setIsDark(checkDark()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  if (!mounted) {
    return (
      <div className={cn("relative h-full w-full overflow-hidden", className)} aria-hidden>
        {children}
      </div>
    );
  }

  const stripes = `repeating-linear-gradient(
        100deg,
        var(--stripe-color) 0%,
        var(--stripe-color) 7%,
        transparent 10%,
        transparent 12%,
        var(--stripe-color) 16%
    )`;
  const rainbow = `repeating-linear-gradient(
        100deg,
        #60a5fa 10%,
        #e879f9 15%,
        #60a5fa 20%,
        #5eead4 25%,
        #60a5fa 30%
    )`;

  const mask = fullPage
    ? "radial-gradient(ellipse at 50% 20%, black 25%, transparent 75%)"
    : "radial-gradient(ellipse at 100% 0%, black 40%, transparent 70%)";

  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)}>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `${stripes}, ${rainbow}`,
          backgroundSize: "300%, 200%",
          backgroundPosition: "50% 50%, 50% 50%",
          filter: isDark
            ? "blur(10px) opacity(50%) saturate(200%)"
            : "blur(10px) invert(100%)",
          maskImage: mask,
          WebkitMaskImage: mask,
        }}
      >
        <div
          className="absolute inset-0 animate-aurora-bg"
          style={{
            backgroundImage: `${stripes}, ${rainbow}`,
            backgroundSize: "200%, 100%",
            backgroundAttachment: "fixed",
            mixBlendMode: "difference",
          }}
        />
      </div>

      {children}
    </div>
  );
}

export default AnimatedRays;
