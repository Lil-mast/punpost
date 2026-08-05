import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    username: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    role: v.union(
      v.literal("reader"),
      v.literal("author"),
      v.literal("admin")
    ),
    googleId: v.optional(v.string()),
    githubId: v.optional(v.string()),
    bio: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_username", ["username"])
    .index("by_google", ["googleId"])
    .index("by_github", ["githubId"]),

  posts: defineTable({
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
    publishedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    viewCount: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_author", ["authorId"])
    .index("by_status", ["status"])
    .index("by_published", ["status", "publishedAt"]),

  comments: defineTable({
    postId: v.id("posts"),
    authorId: v.id("users"),
    content: v.string(),
    parentId: v.optional(v.id("comments")),
    createdAt: v.number(),
    updatedAt: v.number(),
    isDeleted: v.boolean(),
  })
    .index("by_post", ["postId"])
    .index("by_author", ["authorId"])
    .index("by_parent", ["parentId"]),
});