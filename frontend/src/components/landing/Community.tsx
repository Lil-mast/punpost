"use client";

import { motion } from "framer-motion";
import { communityMembers } from "@/components/landing/content";
import { SectionLabel } from "@/components/landing/SectionLabel";
import { fadeUp } from "@/components/landing/motion";

export function Community() {
  return (
    <section id="community" className="border-t border-foreground/5 px-6 py-32 md:px-12 md:py-48 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <SectionLabel>03 / COMMUNITY</SectionLabel>

        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeUp}
          className="mt-8 text-3xl font-bold tracking-tight md:text-5xl"
        >
          Writers who get it
        </motion.h2>

        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeUp}
          transition={{ delay: 0.1 }}
          className="mt-4 max-w-xl text-foreground/50"
        >
          Join a community of sharp minds who appreciate craft, wit, and the perfect turn of phrase.
        </motion.p>

        <div className="mt-16 grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3 md:grid-cols-4">
          {communityMembers.map((name, index) => (
            <motion.div
              key={name}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              transition={{ delay: index * 0.04 }}
              className="text-lg font-medium text-foreground/40 transition-opacity hover:opacity-100 md:text-xl"
            >
              {name}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
