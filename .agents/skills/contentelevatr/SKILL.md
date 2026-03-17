---
name: contentelevatr
description: Rules and stack constraints for building the ContentElevatr
  micro SaaS. Load this skill for any task in this project.
---

# ContentElevatr — Project Skill

## What this product is
ContentElevatr is a social media management micro SaaS.
Tagline: "Create Once. Publish Everywhere. Grow Faster."
URL: https://www.contentelevatr.com
Contact: hello@contentelevatr.com

Two user types:
- Solo builders / creators — single personal workspace
- Agencies — multiple client workspaces, team roles (owner/admin/editor/viewer)

4 core features (in build order):
1. Single content → multi-platform text publisher
2. Smart scheduling with best-time AI suggestions
3. Engagement booster — AI comment replies with approval workflow
4. Platform-aware content reviewer (pre-publish AI audit per platform)

Platforms: LinkedIn, X (Twitter), Instagram, Threads, Medium

## Tech stack — non-negotiable
- Framework: Next.js 15, App Router, TypeScript strict
- Styling: Tailwind CSS + shadcn/ui (no other UI libraries)
- Auth: Clerk (webhooks sync to DB)
- Database: Supabase (PostgreSQL) + Drizzle ORM
- Jobs & scheduling: Trigger.dev v3 — ALWAYS use task() and schedules.task()
  Never use v2 defineJob() syntax
- Queue / cache / locks: Upstash Redis
- Payments: Stripe (subscriptions per workspace)
- Email: Resend
- AI in the app: Anthropic Claude API — model: claude-sonnet-4-20250514
- Hosting: Vercel (app), Supabase (DB), Trigger.dev Cloud (jobs)
- Package manager: pnpm

## Hard rules — enforce on every task
- TypeScript strict mode. Zero `any` types.
- App Router only. No Pages Router patterns ever.
- All DB queries via Drizzle ORM. No raw SQL strings.
- Every data query MUST be scoped by workspace_id. Never return cross-workspace data.
- All user input validated with zod before any DB write.
- Secrets live in .env.local only. Never hardcode. Never log tokens.
- Encrypt social account tokens with AES-256-GCM before storing in DB.
- All /dashboard routes protected by Clerk middleware.
- Dark mode must work. Use CSS variables, never hardcoded hex colors.
- Show loading skeletons, not spinners.
- Prefer server components. Use server actions for form mutations.
- Optimistic UI on all mutations.

## Folder structure
/app                    → Next.js App Router pages + layouts
/app/dashboard/...      → all authenticated app routes
/app/api/...            → API routes (webhooks, OAuth callbacks, AI)
/components/ui          → shadcn primitives ONLY
/components             → feature components
/lib/db                 → drizzle client + schema.ts
/lib/platforms          → one file per platform (linkedin.ts, twitter.ts, etc.)
/lib/ai                 → Claude API helpers
/lib/redis              → Upstash client
/trigger                → ALL Trigger.dev v3 job files
/middleware.ts          → Clerk auth protection

## Before installing any package
Ask the user for approval. Preferred packages already decided:
zod, date-fns, nuqs, sonner, @tanstack/react-query

## When in doubt
- Server component over client component
- Server action over API route for mutations
- Ask before making architectural decisions not covered here
    