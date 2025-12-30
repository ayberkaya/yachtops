# Phase 0: Baseline Analysis & Repo Map

**Date:** 2025-01-XX  
**Status:** ✅ Complete

## Project Stack

- **Framework:** Next.js 16.0.8 (App Router)
- **Build Tool:** Turbopack (enabled)
- **Runtime:** Node.js (default, no edge runtime detected)
- **Database:** PostgreSQL via Prisma 6.19.0
- **Storage:** Supabase Storage (receipts, documents, images)
- **Auth:** NextAuth.js v5 (beta.30) with custom credentials provider
- **UI:** Tailwind CSS 4 + shadcn/ui (Radix UI primitives)
- **State:** React Server Components (majority) + Client Components (96 files)
- **PWA:** Service Worker, offline support, push notifications

## Repo Map

### `/app` Routes (Critical Paths)

**Public Routes:**
- `/` - Landing page (static)
- `/contact` - Contact page (static)
- `/demo-request` - Demo request (static)
- `/fleet-solutions` - Fleet solutions (static)
- `/offline` - Offline fallback (static)
- `/manifest.webmanifest` - PWA manifest (static)

**Auth Routes:**
- `/auth/signin` - Sign in page (dynamic, client component)
- `/auth/signup` - Sign up page (dynamic, client component)

**Dashboard Routes (All Dynamic, Protected):**
- `/dashboard` - Main dashboard (Owner/Captain vs Crew)
- `/dashboard/expenses` - Expense list (critical)
- `/dashboard/expenses/[id]` - Expense detail
- `/dashboard/expenses/new` - Create expense (critical - receipt upload)
- `/dashboard/expenses/pending` - Pending approvals
- `/dashboard/expenses/reimbursable` - Reimbursable expenses
- `/dashboard/tasks` - Task management
- `/dashboard/trips` - Trip management
- `/dashboard/messages` - Messaging (real-time)
- `/dashboard/inventory/*` - Inventory management
- `/dashboard/maintenance` - Maintenance logs
- `/dashboard/shopping` - Shopping lists
- `/dashboard/documents/*` - Document management (receipts, vessel docs, crew docs)
- `/dashboard/cash` - Cash transactions
- `/dashboard/users` - User management
- `/dashboard/roles` - Role management
- `/dashboard/settings` - Settings

**Admin Routes:**
- `/admin` - Admin panel
- `/admin/owners` - Owner management
- `/admin/usage` - Usage analytics

**API Routes (95 total):**
- `/api/auth/[...nextauth]` - NextAuth handler
- `/api/expenses/*` - Expense CRUD + receipt upload
- `/api/messages/*` - Messaging + image upload
- `/api/tasks/*` - Task management
- `/api/trips/*` - Trip management
- `/api/documents/*` - Document uploads (vessel, crew, receipts)
- `/api/inventory/*` - Inventory management
- `/api/notifications/*` - Notifications
- `/api/push/*` - Push notification subscriptions
- `/api/usage/track` - Usage tracking
- `/api/performance` - Performance metrics

### `/components` Structure

**UI Primitives (`/components/ui`):**
- `button.tsx` - Button component (variants: default, destructive, outline, secondary, ghost, link)
- `input.tsx` - Input component
- `select.tsx` - Select component
- `dialog.tsx` - Dialog/Modal
- `table.tsx` - Table component
- `card.tsx` - Card component
- `badge.tsx` - Badge component
- `form.tsx` - Form wrapper (react-hook-form)
- `avatar.tsx`, `dropdown-menu.tsx`, `popover.tsx`, `accordion.tsx`, etc.

**Composed Components:**
- `/components/dashboard/*` - Dashboard-specific components (sidebar, navbar, widgets)
- `/components/expenses/*` - Expense forms, lists, detail views
- `/components/tasks/*` - Task management components
- `/components/messages/*` - Messaging components
- `/components/documents/*` - Document management
- `/components/inventory/*` - Inventory views
- `/components/trips/*` - Trip management
- `/components/pwa/*` - PWA components (service worker, offline, push)
- `/components/notifications/*` - Notification system
- `/components/users/*` - User management
- `/components/roles/*` - Role management
- `/components/admin/*` - Admin panel components

**Total:** 96 client components (`"use client"`), rest are Server Components

### `/lib` Utilities

**Core:**
- `db.ts` - Prisma Client singleton (server-only)
- `auth.ts` - Client-safe auth utilities
- `auth-server.ts` - Server-only auth functions (getCurrentUser, hashPassword, verifyPassword)
- `auth-config.ts` - NextAuth configuration
- `get-session.ts` - Session retrieval wrapper
- `tenant.ts` - Tenant/yacht ID extraction

**Data Layer:**
- `api-client.ts` - Offline-aware API client
- `api-cache.ts` - API response caching
- `api-error-handler.ts` - Error handling
- `offline-queue.ts` - Offline request queue
- `offline-storage.ts` - Offline data storage

**Storage:**
- `supabase-storage.ts` - Supabase Storage client (receipts, documents, images)
- `file-upload-security.ts` - File upload validation
- `file-url-helper.ts` - File URL generation (signed URLs)

**Business Logic:**
- `permissions.ts` - Permission checking
- `get-user-permissions.ts` - User permission resolution
- `tenant.ts` - Tenant scope utilities
- `trip-checklists.ts` - Trip checklist helpers
- `user-notes.ts` - User notes helpers

**Infrastructure:**
- `egress-logger.ts` - Egress logging
- `egress-middleware.ts` - Egress middleware
- `audit-log.ts` - Audit logging
- `usage-tracking.ts` - Usage event tracking
- `performance.ts` - Performance monitoring
- `request-instrumentation.ts` - Request instrumentation
- `notifications.ts` - Notification helpers
- `message-notifications.ts` - Message notification logic
- `notification-sound.ts` - Notification sounds

**Utilities:**
- `utils.ts` - General utilities (cn, etc.)
- `env-validation.ts` - Environment variable validation
- `form-data-preservation.ts` - Form data preservation

### Database Layer

**Prisma Schema:**
- 30+ models (User, Yacht, Expense, ExpenseReceipt, Task, Trip, Message, etc.)
- Proper indexes on foreign keys and query patterns
- Soft deletes (deletedAt) on many models
- RLS-ready structure (yachtId scoping)

**Connection:**
- Prisma Client singleton pattern (global instance in dev)
- Connection pooling via Supabase (DATABASE_URL + DIRECT_URL)
- Error handling for missing DATABASE_URL

**Query Patterns:**
- Most queries scoped by `yachtId` (tenant isolation)
- Includes for related data (e.g., `createdBy`, `category`, `trip`)
- Select statements to limit fields (performance)
- OrderBy and take/limit for pagination

### Upload Flow (Receipts)

**Flow:**
1. User uploads file in `ExpenseForm` (client component)
2. Form submits expense via `/api/expenses` (POST)
3. After expense creation, receipts uploaded via `/api/expenses/[id]/receipt` (POST)
4. File validated via `validateFileUpload()` (size, type, security)
5. File uploaded to Supabase Storage bucket `receipts`
6. Metadata stored in `ExpenseReceipt` table (bucket, path, mimeType, size)
7. `fileUrl` set to `null` (no base64 in DB)

**Storage:**
- Bucket: `receipts` (private)
- Path: `receipts/{yachtId}/{expenseId}/{filename}`
- Access: Signed URLs via `getFileUrl()` helper
- Limits: Enforced in `file-upload-security.ts`

### Middleware

**Location:** `/middleware.ts`
**Purpose:** Lightweight session cookie check for protected routes
**Behavior:**
- Checks for NextAuth session cookie
- Redirects `/dashboard/*` and `/admin/*` to `/auth/signin` if no session
- Skips `/auth/signin` to prevent loops
- Full auth validation happens in layout components (server-side)

### Build Output Analysis

**Build Status:** ✅ Successful
**Static Routes:** 7 (/, /contact, /demo-request, /fleet-solutions, /offline, /manifest.webmanifest, /_not-found)
**Dynamic Routes:** 54+ (all dashboard, admin, API routes)
**Middleware:** Proxy (deprecated convention warning)

**Observations:**
- No route size analysis in output (need bundle analyzer)
- All dashboard routes are dynamic (expected for auth)
- Build completes successfully with Turbopack
- No TypeScript errors

## Top 10 Performance Risks (P0)

1. **No Server-Side Caching** - Zero usage of `unstable_cache` or `cache()` for read-heavy data (expense categories, trips, users, yacht info)
2. **Repeated Session Calls** - `getSession()` called in both layout and page components (dashboard layout + every page)
3. **N+1 Query Patterns** - Dashboard widgets fetch separately; expense lists include relations but could batch better
4. **96 Client Components** - Many components marked `"use client"` unnecessarily; could split into server + small client islands
5. **No Dynamic Imports** - Heavy components (charts, editors, forms) not code-split
6. **Large Dashboard Queries** - Owner/Captain dashboard fetches 6+ separate queries (could combine or cache)
7. **No Image Optimization** - Receipt images served via Supabase signed URLs (no Next.js Image optimization)
8. **Middleware Overhead** - Cookie parsing on every request (minimal but could be optimized)
9. **No Request Deduplication** - Multiple components fetching same data (e.g., yacht info, user list)
10. **Bundle Size Unknown** - No bundle analyzer configured; can't identify heavy dependencies

## Top 10 Cleanup Risks (P1/P2)

1. **No Tests** - Zero test files found (.test.ts, .test.tsx)
2. **Duplicate Auth Logic** - Session validation repeated in layout + pages
3. **Unused Dependencies** - Need to audit package.json (e.g., `jspdf`, `web-push`, `@dnd-kit/*`)
4. **Legacy Files** - `test-auth.ts`, `test-authorize.ts` (2 files) - likely test files
5. **Empty/Unused Routes** - `/app/api/vessel-crew-documents` directory exists but may be empty
6. **Documentation Bloat** - 30+ markdown files in root (many may be outdated)
7. **Inconsistent Naming** - Mix of kebab-case and camelCase in some areas
8. **No TypeScript Strict Mode** - `strict: true` but could enable more strict checks
9. **Middleware Deprecation Warning** - Using deprecated `middleware.ts` convention
10. **No Lint/Typecheck Scripts** - `npm run lint` exists but no `typecheck` script

## Next Steps

Proceeding to Phase 1: Performance P0 Fixes

