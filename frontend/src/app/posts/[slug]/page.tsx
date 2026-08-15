"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { api } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";
import { PageShell } from "@/components/page-shell";
import { SectionLabel } from "@/components/landing/SectionLabel";
import { fadeUp } from "@/components/landing/motion";

interface Post {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  tags: string[];
  created_at: number;
}

interface Comment {
  id: string;
  content: string;
  author_id: string;
  created_at: number;
}

export default function PostPage() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;

    Promise.all([
      api.get(`/posts/${slug}/`),
      api.get(`/posts/${slug}/comments/`),
    ])
      .then(([postRes, commentsRes]) => {
        setPost(postRes.data);
        setComments(commentsRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const res = await api.post(`/posts/${slug}/comments/`, {
        content: newComment,
      });
      setComments((prev) => [...prev, res.data]);
      setNewComment("");
    } catch (err) {
      console.error(err);
      alert("Failed to post comment. Are you logged in?");
    }
  };

  if (loading) {
    return (
      <PageShell>
        <p className="text-foreground/40">Loading…</p>
      </PageShell>
    );
  }

  if (!post) {
    return (
      <PageShell>
        <SectionLabel>POST</SectionLabel>
        <h1 className="mt-6 text-3xl font-bold tracking-tight">Post not found</h1>
        <Link
          href="/explore"
          className="mt-6 inline-block text-sm text-foreground/50 transition-colors hover:text-foreground"
        >
          ← Back to explore
        </Link>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <motion.article initial="hidden" animate="visible" variants={fadeUp}>
        <SectionLabel>POST</SectionLabel>
        <h1 className="mt-6 text-3xl font-bold leading-[1.1] tracking-tight md:text-5xl">
          {post.title}
        </h1>

        {post.tags?.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-3">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="text-[11px] uppercase tracking-wider text-foreground/35"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-12 whitespace-pre-wrap text-base leading-relaxed text-foreground/70 md:text-lg">
          {post.content}
        </div>
      </motion.article>

      <section className="mt-20 border-t border-foreground/5 pt-12">
        <SectionLabel>{`COMMENTS · ${comments.length}`}</SectionLabel>

        <div className="mt-8 divide-y divide-foreground/5">
          {comments.length === 0 && (
            <p className="py-6 text-sm text-foreground/35">No comments yet.</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="py-6">
              <p className="text-foreground/75">{c.content}</p>
              <p className="mt-2 text-xs text-foreground/30">
                {new Date(c.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>

        {isLoggedIn() ? (
          <form onSubmit={handleSubmitComment} className="mt-10 space-y-4">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment…"
              rows={3}
              className="w-full border border-foreground/10 bg-transparent px-4 py-3 text-sm outline-none transition-colors placeholder:text-foreground/30 focus:border-foreground/30"
            />
            <button
              type="submit"
              className="rounded-full bg-foreground px-6 py-2 text-sm font-medium text-background transition-transform hover:-translate-y-0.5"
            >
              Post comment
            </button>
          </form>
        ) : (
          <p className="mt-8 text-sm text-foreground/40">
            <Link href="/login" className="text-foreground/70 transition-colors hover:text-foreground">
              Log in
            </Link>{" "}
            to leave a comment.
          </p>
        )}
      </section>
    </PageShell>
  );
}
