"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { setTokens } from "@/lib/auth";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password1, setPassword1] = useState("");
  const [password2, setPassword2] = useState("");
  const [role, setRole] = useState("reader");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api.post("/auth/registration/", {
        email,
        password1,
        password2,
        role,
      });

      // Auto-login after register
      const loginRes = await api.post("/auth/login/", { email, password: password1 });
      setTokens(loginRes.data.access, loginRes.data.refresh);
      router.push("/explore");
    } catch (err: any) {
      const data = err.response?.data;
      setError(
        data?.email?.[0] ||
        data?.password1?.[0] ||
        data?.non_field_errors?.[0] ||
        "Registration failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8"
      >
        <h1 className="text-2xl font-bold mb-6">Create account</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm focus:border-fuchsia-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">Password</label>
            <input
              type="password"
              value={password1}
              onChange={(e) => setPassword1(e.target.value)}
              required
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm focus:border-fuchsia-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">Confirm Password</label>
            <input
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              required
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm focus:border-fuchsia-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">I want to be a…</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm focus:border-fuchsia-500 focus:outline-none"
            >
              <option value="reader">Reader</option>
              <option value="author">Author</option>
            </select>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-fuchsia-600 py-2.5 text-sm font-medium hover:bg-fuchsia-500 transition disabled:opacity-50"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Already have an account?{" "}
          <Link href="/login" className="text-fuchsia-400 hover:underline">
            Sign in
          </Link>
        </p>
      </motion.div>
    </main>
  );
}