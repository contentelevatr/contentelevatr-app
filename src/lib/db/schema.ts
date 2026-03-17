import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  uniqueIndex,
  index,
  integer,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ──────────────────────────────────────────────────

export const workspaceTypeEnum = pgEnum("workspace_type", [
  "personal",
  "agency",
]);

export const workspaceRoleEnum = pgEnum("workspace_role", [
  "owner",
  "admin",
  "editor",
  "viewer",
]);

export const platformEnum = pgEnum("platform", [
  "linkedin",
  "twitter",
  "instagram",
  "threads",
  "medium",
]);

export const postStatusEnum = pgEnum("post_status", [
  "draft",
  "scheduled",
  "published",
  "failed",
]);

export const platformPostStatusEnum = pgEnum("platform_post_status", [
  "draft",
  "scheduled",
  "publishing",
  "published",
  "failed",
]);

export const commentStatusEnum = pgEnum("comment_status", [
  "pending",
  "replied",
  "ignored",
]);

export const subscriptionPlanEnum = pgEnum("subscription_plan", [
  "free",
  "pro",
  "agency",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "canceled",
  "past_due",
  "trialing",
  "incomplete",
]);

// ─── Helper columns ─────────────────────────────────────────

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
};

// ─── Tables ─────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkId: text("clerk_id").notNull().unique(),
  email: text("email").notNull(),
  name: text("name"),
  imageUrl: text("image_url"),
  ...timestamps,
});

export const workspaces = pgTable("workspaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  type: workspaceTypeEnum("type").notNull().default("personal"),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  ...timestamps,
});

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: workspaceRoleEnum("role").notNull().default("viewer"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("workspace_members_unique").on(
      table.workspaceId,
      table.userId
    ),
  ]
);

export const socialAccounts = pgTable(
  "social_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    platform: platformEnum("platform").notNull(),
    platformAccountId: text("platform_account_id").notNull(),
    accessTokenEnc: text("access_token_enc").notNull(),
    refreshTokenEnc: text("refresh_token_enc"),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    accountName: text("account_name"),
    accountAvatar: text("account_avatar"),
    ...timestamps,
  },
  (table) => [
    index("social_accounts_workspace_idx").on(table.workspaceId),
    uniqueIndex("social_accounts_platform_unique").on(
      table.workspaceId,
      table.platform,
      table.platformAccountId
    ),
  ]
);

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id),
    originalContent: text("original_content").notNull().default(""),
    status: postStatusEnum("status").notNull().default("draft"),
    ...timestamps,
  },
  (table) => [index("posts_workspace_idx").on(table.workspaceId)]
);

export const platformPosts = pgTable(
  "platform_posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    platform: platformEnum("platform").notNull(),
    platformContent: text("platform_content").notNull().default(""),
    status: platformPostStatusEnum("status").notNull().default("draft"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    platformPostId: text("platform_post_id"),
    errorMessage: text("error_message"),
    socialAccountId: uuid("social_account_id").references(
      () => socialAccounts.id
    ),
    ...timestamps,
  },
  (table) => [index("platform_posts_post_idx").on(table.postId)]
);

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    platformPostId: uuid("platform_post_id")
      .notNull()
      .references(() => platformPosts.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    platformCommentId: text("platform_comment_id").notNull(),
    authorName: text("author_name"),
    content: text("content").notNull(),
    aiReplyDraft: text("ai_reply_draft"),
    approvedReply: text("approved_reply"),
    status: commentStatusEnum("status").notNull().default("pending"),
    ...timestamps,
  },
  (table) => [
    index("comments_workspace_idx").on(table.workspaceId),
    index("comments_platform_post_idx").on(table.platformPostId),
  ]
);

export const analyticsSnapshots = pgTable(
  "analytics_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    platformPostId: uuid("platform_post_id")
      .notNull()
      .references(() => platformPosts.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    likes: integer("likes").notNull().default(0),
    commentsCount: integer("comments_count").notNull().default(0),
    shares: integer("shares").notNull().default(0),
    impressions: integer("impressions").notNull().default(0),
    snapshotAt: timestamp("snapshot_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    ...timestamps,
  },
  (table) => [
    index("analytics_workspace_idx").on(table.workspaceId),
    index("analytics_platform_post_idx").on(table.platformPostId),
  ]
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" })
      .unique(),
    stripeCustomerId: text("stripe_customer_id").unique(),
    stripeSubscriptionId: text("stripe_subscription_id").unique(),
    stripePriceId: text("stripe_price_id"),
    plan: subscriptionPlanEnum("plan").notNull().default("free"),
    status: subscriptionStatusEnum("status").notNull().default("active"),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [index("subscriptions_workspace_idx").on(table.workspaceId)]
);

// ─── Relations ──────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  workspaces: many(workspaces),
  memberships: many(workspaceMembers),
  posts: many(posts),
}));

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  owner: one(users, {
    fields: [workspaces.ownerId],
    references: [users.id],
  }),
  members: many(workspaceMembers),
  socialAccounts: many(socialAccounts),
  posts: many(posts),
  comments: many(comments),
  analyticsSnapshots: many(analyticsSnapshots),
  subscription: one(subscriptions, {
    fields: [workspaces.id],
    references: [subscriptions.workspaceId],
  }),
}));

export const workspaceMembersRelations = relations(
  workspaceMembers,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [workspaceMembers.workspaceId],
      references: [workspaces.id],
    }),
    user: one(users, {
      fields: [workspaceMembers.userId],
      references: [users.id],
    }),
  })
);

export const socialAccountsRelations = relations(
  socialAccounts,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [socialAccounts.workspaceId],
      references: [workspaces.id],
    }),
  })
);

export const postsRelations = relations(posts, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [posts.workspaceId],
    references: [workspaces.id],
  }),
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
  platformPosts: many(platformPosts),
}));

export const platformPostsRelations = relations(
  platformPosts,
  ({ one, many }) => ({
    post: one(posts, {
      fields: [platformPosts.postId],
      references: [posts.id],
    }),
    socialAccount: one(socialAccounts, {
      fields: [platformPosts.socialAccountId],
      references: [socialAccounts.id],
    }),
    comments: many(comments),
    analyticsSnapshots: many(analyticsSnapshots),
  })
);

export const commentsRelations = relations(comments, ({ one }) => ({
  platformPost: one(platformPosts, {
    fields: [comments.platformPostId],
    references: [platformPosts.id],
  }),
  workspace: one(workspaces, {
    fields: [comments.workspaceId],
    references: [workspaces.id],
  }),
}));

export const analyticsSnapshotsRelations = relations(
  analyticsSnapshots,
  ({ one }) => ({
    platformPost: one(platformPosts, {
      fields: [analyticsSnapshots.platformPostId],
      references: [platformPosts.id],
    }),
    workspace: one(workspaces, {
      fields: [analyticsSnapshots.workspaceId],
      references: [workspaces.id],
    }),
  })
);

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [subscriptions.workspaceId],
    references: [workspaces.id],
  }),
}));

// ─── Type exports ───────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type SocialAccount = typeof socialAccounts.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type PlatformPost = typeof platformPosts.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type AnalyticsSnapshot = typeof analyticsSnapshots.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
