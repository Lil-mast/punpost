"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { api } from "@/lib/api";
import { PageShell } from "@/components/page-shell";
import { SectionLabel } from "@/components/landing/SectionLabel";
import { fadeUp } from "@/components/landing/motion";

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
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPosts = async (cursorValue: string | null = null, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);

    try {
      const res = await api.get("/posts/", {
        params: cursorValue ? { cursor: cursorValue } : {},
      });

      const data = res.data;

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

  return (
    <PageShell wide>
      <motion.header
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="mb-14"
      >
        <SectionLabel>02 / EXPLORE</SectionLabel>
        <h1 className="mt-6 text-3xl font-bold tracking-tight md:text-5xl">
          Discover witty posts
        </h1>
        <p className="mt-4 max-w-md text-foreground/50">
          Sharp writing from the PunPost community — wordplay, punchlines, and clever takes.
        </p>
      </motion.header>

      {loading ? (
        <div className="divide-y divide-foreground/5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse bg-foreground/[0.03]" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="border border-dashed border-foreground/10 py-20 text-center">
          <p className="text-foreground/40">No published posts yet.</p>
          <Link
            href="/create"
            className="mt-4 inline-block text-sm text-foreground/70 transition-colors hover:text-foreground"
          >
            Write the first one →
          </Link>
        </div>
      ) : (
        <>
          <div className="divide-y divide-foreground/5 border-t border-foreground/5">
            {posts.map((post, i) => (
              <motion.div
                key={post.id}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                transition={{ delay: i * 0.04 }}
              >
                <Link
                  href={`/posts/${post.slug}`}
                  className="group flex flex-col gap-3 py-8 transition-colors hover:bg-foreground/[0.02] md:flex-row md:items-center md:gap-8 md:px-2"
                >
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-semibold tracking-tight transition-transform group-hover:translate-x-1 md:text-xl">
                      {post.title}
                    </h2>
                    {post.excerpt && (
                      <p className="mt-1 line-clamp-2 text-sm text-foreground/45">
                        {post.excerpt}
                      </p>
                    )}
                    {post.tags?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {post.tags.slice(0, 4).map((tag) => (
                          <span
                            key={tag}
                            className="text-[11px] uppercase tracking-wider text-foreground/35"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-foreground/35">
                    {post.view_count ?? 0} views
                  </span>
                  <ArrowUpRight className="h-5 w-5 shrink-0 text-foreground/25 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-foreground" />
                </Link>
              </motion.div>
            ))}
          </div>

          {nextCursor && (
            <div className="mt-12 text-center">
              <button
                type="button"
                onClick={() => fetchPosts(nextCursor, true)}
                disabled={loadingMore}
                className="rounded-full border border-foreground/10 px-6 py-2.5 text-sm transition-colors hover:border-foreground/25 disabled:opacity-50"
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </>
      )}
    </PageShell>
  );
}
