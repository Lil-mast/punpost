"use client";

import { NotchNavbar } from "@/components/notch-navbar";
import { PunPostLogo } from "@/components/landing/PunPostLogo";
import { Hero } from "@/components/landing/Hero";
import { About } from "@/components/landing/About";
import { Explore } from "@/components/landing/Explore";
import { Community } from "@/components/landing/Community";
import { Pricing } from "@/components/landing/Pricing";
import { Footer } from "@/components/landing/Footer";
import { AnimatedRays } from "@/components/ui/animated-rays";

export default function HomePage() {
  return (
    <>
      <NotchNavbar variant="landing" logo={<PunPostLogo />} />
      <div className="relative isolate">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <AnimatedRays className="h-full min-h-full" fullPage />
        </div>
        <main>
          <Hero />
          <About />
          <Explore />
          <Community />
          <Pricing />
        </main>
        <Footer />
      </div>
    </>
  );
}
