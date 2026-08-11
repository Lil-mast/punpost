import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listByPost = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .order("asc")
      .collect();

    // Filter out soft-deleted ones
    return comments.filter((c) => !c.isDeleted);
  },
});

export const getById = query({
  args: { id: v.id("comments") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    postId: v.id("posts"),
    authorId: v.id("users"),
    content: v.string(),
    parentId: v.optional(v.id("comments")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("comments", {
      postId: args.postId,
      authorId: args.authorId,
      content: args.content,
      parentId: args.parentId,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("comments"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Comment not found");

    await ctx.db.patch(args.id, {
      content: args.content,
      updatedAt: Date.now(),
    });
    return args.id;
  },
});

export const softDelete = mutation({
  args: { id: v.id("comments") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Comment not found");

    await ctx.db.patch(args.id, {
      isDeleted: true,
      updatedAt: Date.now(),
    });
    return true;
  },
});