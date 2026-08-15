"use client";

import { motion } from "framer-motion";
import { aboutContent } from "@/components/landing/content";
import { SectionLabel } from "@/components/landing/SectionLabel";
import { fadeUp } from "@/components/landing/motion";

export function About() {
  return (
    <section id="about" className="border-t border-foreground/5 px-6 py-32 md:px-12 md:py-48 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <SectionLabel>{aboutContent.label}</SectionLabel>

        <div className="mt-12 grid grid-cols-1 gap-12 md:grid-cols-2 md:gap-24">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            className="text-3xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl"
          >
            {aboutContent.statement}
          </motion.h2>

          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            transition={{ delay: 0.1 }}
            className="self-end text-base leading-relaxed text-foreground/60 md:text-lg"
          >
            {aboutContent.body}
          </motion.p>
        </div>
      </div>
    </section>
  );
}
