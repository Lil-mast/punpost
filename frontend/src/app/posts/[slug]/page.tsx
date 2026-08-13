"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";

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
      <main className="mx-auto max-w-2xl px-6 py-20 text-center text-zinc-500">
        Loading…
      </main>
    );
  }

  if (!post) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-20 text-center text-zinc-500">
        Post not found
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <motion.article
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-4xl font-bold leading-tight">{post.title}</h1>

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

        <div className="mt-10 prose prose-invert max-w-none whitespace-pre-wrap text-zinc-300 leading-relaxed">
          {post.content}
        </div>
      </motion.article>

      {/* Comments */}
      <section className="mt-16 border-t border-zinc-800 pt-10">
        <h2 className="text-xl font-semibold mb-6">
          Comments ({comments.length})
        </h2>

        <div className="space-y-6 mb-10">
          {comments.map((c) => (
            <div key={c.id} className="rounded-xl bg-zinc-900/60 p-4">
              <p className="text-zinc-300">{c.content}</p>
              <p className="mt-2 text-xs text-zinc-500">
                {new Date(c.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>

        {isLoggedIn() ? (
          <form onSubmit={handleSubmitComment} className="space-y-4">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment…"
              rows={3}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm focus:border-fuchsia-500 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-full bg-fuchsia-600 px-6 py-2 text-sm font-medium hover:bg-fuchsia-500 transition"
            >
              Post comment
            </button>
          </form>
        ) : (
          <p className="text-zinc-500 text-sm">
            <a href="/login" className="text-fuchsia-400 hover:underline">
              Log in
            </a>{" "}
            to leave a comment.
          </p>
        )}
      </section>
    </main>
  );
}