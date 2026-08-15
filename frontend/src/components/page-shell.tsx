"use client";

import { AnimatedRays } from "@/components/ui/animated-rays";
import { cn } from "@/lib/utils";

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
  /** Constrain content width; default max-w-3xl */
  wide?: boolean;
}

export function PageShell({ children, className, wide = false }: PageShellProps) {
  return (
    <div className="relative isolate min-h-[calc(100vh-4rem)]">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <AnimatedRays className="h-full min-h-full" fullPage />
      </div>
      <div
        className={cn(
          "relative mx-auto w-full px-6 py-12 md:px-12 md:py-16",
          wide ? "max-w-5xl" : "max-w-3xl",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
