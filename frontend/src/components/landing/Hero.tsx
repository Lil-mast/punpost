"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ImageTrail } from "@/components/ui/image-trail";
import { heroContent, trailImages } from "@/components/landing/content";
import { getMotionVariants, staggerContainer } from "@/components/landing/motion";

export function Hero() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointerQuery = window.matchMedia("(pointer: coarse)");
    const update = () => {
      setReducedMotion(motionQuery.matches);
      setIsCoarsePointer(pointerQuery.matches);
    };
    update();
    motionQuery.addEventListener("change", update);
    pointerQuery.addEventListener("change", update);
    return () => {
      motionQuery.removeEventListener("change", update);
      pointerQuery.removeEventListener("change", update);
    };
  }, []);

  const motionVariant = getMotionVariants(reducedMotion);
  const containerVariants = reducedMotion ? {} : staggerContainer;

  return (
    <section id="home" className="relative min-h-screen w-full">
      <ImageTrail
        className="min-h-screen w-full"
        images={trailImages}
        maxItems={6}
        threshold={90}
        rotationRange={28}
        imageClassName="w-24 opacity-80"
        overlayClassName="z-[1]"
        disabled={reducedMotion || isCoarsePointer}
      >
        <div className="relative z-10 flex min-h-screen w-full flex-col items-center justify-center px-6 py-28 text-center md:px-12">
          <motion.div
            className="mx-auto flex max-w-2xl flex-col items-center"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.p
              variants={motionVariant}
              className="mb-5 text-[11px] uppercase tracking-[0.22em] text-foreground/40"
            >
              {heroContent.eyebrow}
            </motion.p>

            <motion.h1
              variants={motionVariant}
              className="font-sans text-[clamp(2.25rem,5.5vw,4.5rem)] font-bold leading-[1.05] tracking-tight"
            >
              {heroContent.headline.map((line, i) => (
                <span
                  key={line}
                  className={`block ${i === heroContent.accentLine ? "text-foreground/50" : ""}`}
                >
                  {line}
                </span>
              ))}
            </motion.h1>

            <motion.p
              variants={motionVariant}
              className="mt-6 max-w-md text-sm leading-relaxed text-foreground/55 md:text-base"
            >
              {heroContent.description}
            </motion.p>

            <motion.div
              variants={motionVariant}
              className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:gap-6"
            >
              <Link
                href={heroContent.primaryCta.href}
                className="group inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-transform hover:-translate-y-0.5 active:scale-95"
              >
                {heroContent.primaryCta.label}
              </Link>
              <Link
                href={heroContent.secondaryCta.href}
                className="text-sm text-foreground/50 transition-colors hover:text-foreground"
              >
                {heroContent.secondaryCta.label}
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </ImageTrail>
    </section>
  );
}
