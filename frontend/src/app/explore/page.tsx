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
  const [cursor, setCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPosts = async (cursorValue: string | null = null, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);

    try {
      // For now we use a simple approach. 
      // If your Convex returns { page, continueCursor, isDone }
      const res = await api.get("/posts/", {
        params: cursorValue ? { cursor: cursorValue } : {},
      });

      const data = res.data;

      // Handle both plain array and paginated response
      if (Array.isArray(data)) {
        setPosts(data);
        setNextCursor(null);
      } else {
        const page = data.page || data;
        setPosts((prev) => (append ? [...prev, ...page] : page));
        setNextCursor(data.continueCursor || null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const loadMore = () => {
    if (nextCursor) {
      fetchPosts(nextCursor, true);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <h1 className="text-3xl font-bold">Explore</h1>
        <p className="mt-2 text-zinc-500">Discover the latest witty posts</p>
      </motion.div>

      {loading ? (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-36 animate-pulse rounded-2xl bg-zinc-900/80"
            />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 py-20 text-center">
          <p className="text-zinc-500">No published posts yet.</p>
          <Link
            href="/create"
            className="mt-4 inline-block text-fuchsia-400 hover:underline"
          >
            Write the first one →
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-5">
            {posts.map((post, i) => (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 hover:border-zinc-700 hover:bg-zinc-900/70 transition"
              >
                <Link href={`/posts/${post.slug}`}>
                  <h2 className="text-xl font-semibold group-hover:text-fuchsia-400 transition">
                    {post.title}
                  </h2>
                </Link>

                {post.excerpt && (
                  <p className="mt-2 text-zinc-400 line-clamp-2 leading-relaxed">
                    {post.excerpt}
                  </p>
                )}

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex flex-wrap gap-2">
                    {post.tags?.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <span className="text-xs text-zinc-600">
                    {post.view_count ?? 0} views
                  </span>
                </div>
              </motion.article>
            ))}
          </div>

          {nextCursor && (
            <div className="mt-10 text-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="rounded-full border border-zinc-700 px-6 py-2.5 text-sm hover:border-zinc-500 transition disabled:opacity-50"
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
}