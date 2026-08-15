"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";
import { PageShell } from "@/components/page-shell";
import { SectionLabel } from "@/components/landing/SectionLabel";
import { fadeUp } from "@/components/landing/motion";

export default function CreatePostPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState("draft");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    setReady(true);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/posts/", {
        title,
        content,
        excerpt: excerpt || undefined,
        status,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });

      router.push(`/posts/${res.data.slug}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to create post");
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <PageShell>
        <p className="text-foreground/40">Checking session…</p>
      </PageShell>
    );
  }

  const inputClass =
    "w-full border border-foreground/10 bg-transparent px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-foreground/30 focus:border-foreground/30";

  return (
    <PageShell>
      <motion.div initial="hidden" animate="visible" variants={fadeUp}>
        <SectionLabel>WRITE</SectionLabel>
        <h1 className="mt-6 text-3xl font-bold tracking-tight md:text-5xl">
          Write a new post
        </h1>
        <p className="mt-3 max-w-md text-sm text-foreground/50">
          Craft something sharp. Drafts stay private until you publish.
        </p>

        <form onSubmit={handleSubmit} className="mt-12 space-y-8">
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wider text-foreground/40">
              Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wider text-foreground/40">
              Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={14}
              className={`${inputClass} leading-relaxed`}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wider text-foreground/40">
              Excerpt (optional)
            </label>
            <input
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-wider text-foreground/40">
                Tags
              </label>
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="humor, writing, puns"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-wider text-foreground/40">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={inputClass}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>

          {error && (
            <p className="border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-foreground px-8 py-2.5 text-sm font-medium text-background transition-transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            {loading ? "Publishing…" : status === "published" ? "Publish" : "Save draft"}
          </button>
        </form>
      </motion.div>
    </PageShell>
  );
}
