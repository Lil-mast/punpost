import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listPublished = query({
  args: {
    paginationOpts: v.optional(
      v.object({
        numItems: v.number(),
        cursor: v.union(v.string(), v.null()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const q = ctx.db
      .query("posts")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .order("desc");

    if (args.paginationOpts) {
      return await q.paginate(args.paginationOpts);
    }
    return await q.take(20);
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("posts")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    slug: v.string(),
    content: v.string(),
    excerpt: v.optional(v.string()),
    coverImage: v.optional(v.string()),
    authorId: v.id("users"),
    status: v.union(
      v.literal("draft"),
      v.literal("published"),
      v.literal("archived")
    ),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("posts", {
      ...args,
      publishedAt: args.status === "published" ? now : undefined,
      createdAt: now,
      updatedAt: now,
      viewCount: 0,
    });
  },
});