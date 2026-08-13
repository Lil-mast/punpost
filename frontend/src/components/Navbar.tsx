"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { isLoggedIn, clearTokens } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const router = useRouter();
  const loggedIn = isLoggedIn();

  const handleLogout = () => {
    clearTokens();
    router.push("/");
    router.refresh();
  };

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md"
    >
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <Link href="/" className="text-xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-fuchsia-400 to-pink-500 bg-clip-text text-transparent">
            PunPost
          </span>
        </Link>

        <div className="flex items-center gap-6 text-sm">
          <Link href="/explore" className="text-zinc-400 hover:text-white transition">
            Explore
          </Link>

          {loggedIn ? (
            <>
              <Link
                href="/create"
                className="rounded-full bg-fuchsia-600 px-4 py-1.5 text-white hover:bg-fuchsia-500 transition"
              >
                Write
              </Link>
              <button
                onClick={handleLogout}
                className="text-zinc-400 hover:text-white transition"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-fuchsia-600 px-4 py-1.5 text-white hover:bg-fuchsia-500 transition"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </motion.nav>
  );
}