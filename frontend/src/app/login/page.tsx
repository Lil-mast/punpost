"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { setTokens } from "@/lib/auth";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { SectionLabel } from "@/components/landing/SectionLabel";
import { fadeUp } from "@/components/landing/motion";
import { SocialAuthButtons } from "@/components/social-auth-buttons";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/login/", { email, password });
      const access = res.data.access || res.data.access_token;
      const refresh = res.data.refresh || res.data.refresh_token;
      if (!access) {
        throw new Error("No access token returned");
      }
      setTokens(access, refresh);
      router.push("/dashboard");
    } catch (err: any) {
      const data = err.response?.data;
      setError(
        data?.non_field_errors?.[0] ||
          data?.email?.[0] ||
          data?.detail ||
          err.message ||
          "Login failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full border border-foreground/10 bg-transparent px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-foreground/30 focus:border-foreground/30";

  return (
    <PageShell className="flex min-h-[calc(100vh-5rem)] items-center justify-center py-16">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="mx-auto w-full max-w-md"
      >
        <SectionLabel>ACCOUNT</SectionLabel>
        <h1 className="mt-6 text-3xl font-bold tracking-tight md:text-4xl">Welcome back</h1>
        <p className="mt-3 text-sm text-foreground/50">Sign in to continue to PunPost</p>

        <div className="mt-10">
          <SocialAuthButtons mode="login" />
        </div>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-foreground/5" />
          </div>
          <div className="relative flex justify-center text-[11px] uppercase tracking-[0.2em]">
            <span className="bg-background px-3 text-foreground/35">or</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wider text-foreground/40">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wider text-foreground/40">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className={inputClass}
            />
          </div>

          {error && (
            <p className="border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-foreground py-2.5 text-sm font-medium text-background transition-transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-foreground/40">
          No account?{" "}
          <Link href="/register" className="text-foreground/70 transition-colors hover:text-foreground">
            Create one
          </Link>
        </p>
      </motion.div>
    </PageShell>
  );
}
