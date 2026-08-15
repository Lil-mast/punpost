"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { pricingPlans } from "@/components/landing/content";
import { SectionLabel } from "@/components/landing/SectionLabel";
import { fadeUp } from "@/components/landing/motion";
import { cn } from "@/lib/utils";

export function Pricing() {
  return (
    <section id="pricing" className="border-t border-foreground/5 px-6 py-32 md:px-12 md:py-48 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <SectionLabel>04 / PRICING</SectionLabel>

        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeUp}
          className="mt-8 text-3xl font-bold tracking-tight md:text-5xl"
        >
          Simple, honest pricing
        </motion.h2>

        <div className="mt-16 grid grid-cols-1 gap-px overflow-hidden border border-foreground/5 bg-foreground/5 md:grid-cols-3">
          {pricingPlans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={fadeUp}
              transition={{ delay: index * 0.08 }}
              className={cn(
                "flex flex-col bg-background p-8 md:p-10",
                plan.recommended && "ring-1 ring-inset ring-foreground/20"
              )}
            >
              <div className="flex items-baseline justify-between">
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                {plan.recommended && (
                  <span className="text-xs uppercase tracking-wider text-foreground/40">Popular</span>
                )}
              </div>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
                <span className="text-sm text-foreground/40">{plan.period}</span>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-foreground/50">{plan.description}</p>

              <ul className="mt-8 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="text-sm text-foreground/60">
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href={plan.cta.href}
                className={cn(
                  "mt-8 inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium transition-transform hover:-translate-y-0.5 active:scale-95",
                  plan.recommended
                    ? "bg-foreground text-background"
                    : "border border-foreground/10 text-foreground hover:border-foreground/20"
                )}
              >
                {plan.cta.label}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
