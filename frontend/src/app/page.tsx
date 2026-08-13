"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="text-center"
      >
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-fuchsia-400 to-pink-500 bg-clip-text text-transparent">
            PunPost
          </span>
        </h1>
        <p className="mt-6 text-lg text-zinc-400 max-w-lg mx-auto">
          A bazaar of witty words. Write, share, and discover posts that actually make you smile.
        </p>

        <motion.div
          className="mt-12 flex flex-wrap gap-4 justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          <Link
            href="/explore"
            className="rounded-full bg-fuchsia-600 px-8 py-3 text-sm font-medium text-white hover:bg-fuchsia-500 transition"
          >
            Explore posts
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-zinc-700 px-8 py-3 text-sm font-medium text-zinc-300 hover:border-zinc-500 transition"
          >
            Start writing
          </Link>
        </motion.div>
      </motion.div>
    </main>
  );
}