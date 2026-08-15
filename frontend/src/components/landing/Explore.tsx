"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { explorePosts } from "@/components/landing/content";
import { SectionLabel } from "@/components/landing/SectionLabel";
import { fadeUp } from "@/components/landing/motion";

export function Explore() {
  return (
    <section id="explore" className="border-t border-foreground/5 px-6 py-32 md:px-12 md:py-48 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <SectionLabel>02 / EXPLORE</SectionLabel>

        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeUp}
          className="mt-8 text-3xl font-bold tracking-tight md:text-5xl"
        >
          Featured writing
        </motion.h2>

        <div className="mt-16 divide-y divide-foreground/5">
          {explorePosts.map((post, index) => (
            <motion.div
              key={post.title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={fadeUp}
              transition={{ delay: index * 0.05 }}
            >
              <Link
                href={post.href}
                className="group flex flex-col gap-4 py-8 transition-colors hover:bg-foreground/[0.02] md:flex-row md:items-center md:gap-8 md:px-4"
              >
                <span className="w-20 shrink-0 text-sm text-foreground/40">{post.date}</span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold transition-transform group-hover:translate-x-1 md:text-xl">
                    {post.title}
                  </h3>
                  <p className="mt-1 text-sm text-foreground/50">{post.description}</p>
                </div>
                <span className="shrink-0 text-xs uppercase tracking-wider text-foreground/40">
                  {post.status}
                </span>
                <ArrowUpRight className="h-5 w-5 shrink-0 text-foreground/30 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-foreground" />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
