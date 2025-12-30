## Production deployment checklist (Vercel + Supabase)

### Vercel (Environment Variables)
- **Required (app will fail fast in production if missing)**:
  - **`DATABASE_URL`**: Supabase Postgres connection string (pooler recommended for serverless).
  - **`NEXTAUTH_URL`**: your production URL (e.g., `https://your-domain.com`).
  - **`NEXTAUTH_SECRET`**: **>= 32 chars** (`openssl rand -base64 32`).
  - **`SUPABASE_JWT_SECRET`**: Supabase JWT signing secret (required for generating RLS-compatible access tokens).

- **Recommended**:
  - **`DIRECT_URL`**: non-pooled direct DB URL for migrations (if using it).
  - **Sentry**: `SENTRY_AUTH_TOKEN`, `SENTRY_DSN` (and related vars if you use them).
  - **Email/SMTP** (if sending emails): host/user/pass + from address vars used by your mailer.
  - **Push notifications**: VAPID public/private key vars (see `helmops/scripts/generate-vapid-keys.js`).

### Supabase (Database + RLS)
- **Run DB migrations** (choose one path):
  - **Prisma migrations**: `npx prisma migrate deploy` (from `helmops/`)
  - **Supabase SQL migrations**: apply files under `helmops/supabase/migrations/` (Supabase CLI / dashboard SQL editor).

- **RLS policies are mandatory for production isolation**:
  - Review/apply:
    - `helmops/RLS_BATCH_MIGRATIONS.sql`
    - `helmops/FIX_STORAGE_RLS_POLICIES.sql`
    - `helmops/scripts/verify-rls.sql`
  - Then verify:
    - `helmops/scripts/verify-isolation.ts`

### Supabase Storage (Buckets + Policies)
- Ensure required buckets exist (receipts/docs/message attachments/etc.)
- Ensure Storage RLS policies are applied (see `helmops/FIX_STORAGE_RLS_POLICIES.sql`)

### Versioning / Stability
- This repo currently uses **Next.js canary** (`next@16.1.1-canary.*`). For production, pin to a stable release (ideally **Next.js 15** per project standard) and run a clean install.
- Prisma shows a migration warning about `package.json#prisma`; you can keep current setup or migrate seed config into `prisma.config.ts` when upgrading to Prisma 7.


