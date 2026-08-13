"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";

export default function CreatePostPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState("draft");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (typeof window !== "undefined" && !isLoggedIn()) {
    router.push("/login");
    return null;
  }

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

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold mb-8">Write a new post</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 focus:border-fuchsia-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={12}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 focus:border-fuchsia-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">Excerpt (optional)</label>
            <input
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 focus:border-fuchsia-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">
              Tags (comma separated)
            </label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="humor, writing, puns"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 focus:border-fuchsia-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 focus:border-fuchsia-500 focus:outline-none"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-fuchsia-600 px-8 py-2.5 text-sm font-medium hover:bg-fuchsia-500 transition disabled:opacity-50"
          >
            {loading ? "Publishing…" : "Publish"}
          </button>
        </form>
      </motion.div>
    </main>
  );
}