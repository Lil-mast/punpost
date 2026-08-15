"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowUpRight, PenLine, Compass, LogOut } from "lucide-react";
import { api } from "@/lib/api";
import { clearTokens, isLoggedIn } from "@/lib/auth";
import { PageShell } from "@/components/page-shell";
import { SectionLabel } from "@/components/landing/SectionLabel";
import { fadeUp } from "@/components/landing/motion";

interface UserMe {
  id: number;
  email: string;
  username: string;
  role: string;
  date_joined?: string;
}

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  status?: string;
  view_count?: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserMe | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }

    Promise.all([
      api.get("/users/me/"),
      api.get("/posts/", { params: { mine: true } }).catch(() => ({ data: [] })),
    ])
      .then(([meRes, postsRes]) => {
        setUser(meRes.data);
        const data = postsRes.data;
        const list = Array.isArray(data) ? data : data.page || [];
        setPosts(list.slice(0, 5));
      })
      .catch(() => {
        setError("Could not load your account. Try signing in again.");
        clearTokens();
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handleLogout = () => {
    clearTokens();
    router.push("/");
    router.refresh();
  };

  if (loading) {
    return (
      <PageShell>
        <p className="text-foreground/40">Loading dashboard…</p>
      </PageShell>
    );
  }

  if (error || !user) {
    return (
      <PageShell>
        <p className="text-foreground/50">{error || "Not signed in."}</p>
        <Link href="/login" className="mt-4 inline-block text-sm hover:text-foreground text-foreground/70">
          Go to login →
        </Link>
      </PageShell>
    );
  }

  return (
    <PageShell wide>
      <motion.div initial="hidden" animate="visible" variants={fadeUp}>
        <SectionLabel>DASHBOARD</SectionLabel>
        <h1 className="mt-6 text-3xl font-bold tracking-tight md:text-5xl">
          Welcome back{user.username ? `, ${user.username}` : ""}
        </h1>
        <p className="mt-3 text-foreground/50">{user.email}</p>
        <p className="mt-1 text-xs uppercase tracking-wider text-foreground/35">
          Role · {user.role}
        </p>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          <Link
            href="/create"
            className="group flex items-center justify-between border border-foreground/10 p-5 transition-colors hover:border-foreground/25 hover:bg-foreground/[0.02]"
          >
            <div>
              <PenLine className="mb-3 h-5 w-5 text-foreground/50" />
              <p className="font-medium">Write</p>
              <p className="mt-1 text-sm text-foreground/40">Start a new post</p>
            </div>
            <ArrowUpRight className="h-4 w-4 text-foreground/30 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>

          <Link
            href="/explore"
            className="group flex items-center justify-between border border-foreground/10 p-5 transition-colors hover:border-foreground/25 hover:bg-foreground/[0.02]"
          >
            <div>
              <Compass className="mb-3 h-5 w-5 text-foreground/50" />
              <p className="font-medium">Explore</p>
              <p className="mt-1 text-sm text-foreground/40">Browse the bazaar</p>
            </div>
            <ArrowUpRight className="h-4 w-4 text-foreground/30 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="group flex items-center justify-between border border-foreground/10 p-5 text-left transition-colors hover:border-foreground/25 hover:bg-foreground/[0.02]"
          >
            <div>
              <LogOut className="mb-3 h-5 w-5 text-foreground/50" />
              <p className="font-medium">Log out</p>
              <p className="mt-1 text-sm text-foreground/40">Clear this session</p>
            </div>
          </button>
        </div>

        <section className="mt-16 border-t border-foreground/5 pt-12">
          <SectionLabel>RECENT FROM EXPLORE</SectionLabel>
          <div className="mt-6 divide-y divide-foreground/5">
            {posts.length === 0 ? (
              <p className="py-8 text-sm text-foreground/40">
                No posts yet.{" "}
                <Link href="/create" className="text-foreground/70 hover:text-foreground">
                  Write the first one →
                </Link>
              </p>
            ) : (
              posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/posts/${post.slug}`}
                  className="group flex items-center justify-between py-5 transition-colors hover:bg-foreground/[0.02]"
                >
                  <div>
                    <p className="font-medium transition-transform group-hover:translate-x-1">
                      {post.title}
                    </p>
                    {post.excerpt && (
                      <p className="mt-1 line-clamp-1 text-sm text-foreground/40">
                        {post.excerpt}
                      </p>
                    )}
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-foreground/25" />
                </Link>
              ))
            )}
          </div>
        </section>
      </motion.div>
    </PageShell>
  );
}
