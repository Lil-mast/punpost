"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { api } from "@/lib/api";

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  tags: string[];
  published_at?: number;
  view_count: number;
}

export default function ExplorePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/posts/")
      .then((res) => setPosts(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold mb-10"
      >
        Explore
      </motion.h1>

      {loading ? (
        <p className="text-zinc-500">Loading posts…</p>
      ) : posts.length === 0 ? (
        <p className="text-zinc-500">No published posts yet. Be the first!</p>
      ) : (
        <div className="space-y-6">
          {posts.map((post, i) => (
            <motion.article
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 hover:border-zinc-700 transition"
            >
              <Link href={`/posts/${post.slug}`}>
                <h2 className="text-xl font-semibold hover:text-fuchsia-400 transition">
                  {post.title}
                </h2>
              </Link>

              {post.excerpt && (
                <p className="mt-2 text-zinc-400 line-clamp-2">{post.excerpt}</p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {post.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-zinc-800 px-3 py-0.5 text-xs text-zinc-400"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </motion.article>
          ))}
        </div>
      )}
    </main>
  );
}