# YachtOps - Setup Instructions

## Initial Setup

### 1. Environment Variables

Create a `.env` file in the root directory with the following:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/yachtops?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here-change-in-production"
```

**Important:** 
- Replace `user`, `password`, and `localhost:5432` with your PostgreSQL connection details
- Generate a secure `NEXTAUTH_SECRET` for production (you can use: `openssl rand -base64 32`)

### 2. Database Setup

#### Option A: Local PostgreSQL (Docker)

If you have Docker installed, you can run:

```bash
docker run --name yachtops-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=yachtops -p 5432:5432 -d postgres:16
```

Then update your `.env`:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/yachtops?schema=public"
```

#### Option B: Cloud Database (Supabase/Neon)

1. Create a free PostgreSQL database on [Supabase](https://supabase.com) or [Neon](https://neon.tech)
2. Copy the connection string to your `.env` file

### 3. Run Database Migrations

```bash
npx prisma migrate dev --name init
```

This will:
- Create the database schema
- Generate the Prisma Client

### 4. Generate Prisma Client

If needed separately:

```bash
npx prisma generate
```

### 5. Seed Initial Data (Optional)

You can create a seed script later to add an initial OWNER user. For now, you'll create users through the sign-up flow.

### 6. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Project Structure

```
yachtops/
├── app/                    # Next.js App Router pages and routes
├── components/             # React components
│   └── ui/                # shadcn/ui components
├── lib/                   # Utilities and helpers
│   ├── db.ts              # Prisma client instance
│   ├── auth.ts            # Auth helpers and role checks
│   └── utils.ts           # General utilities
├── prisma/
│   └── schema.prisma      # Database schema
├── types/                 # TypeScript type definitions
└── public/                # Static assets
```

## Next Steps

After setup, you'll need to implement:

1. **Authentication** - NextAuth.js setup with credentials provider
2. **Layout & Navigation** - Protected routes and role-based layouts
3. **Dashboards** - Separate views for OWNER/CAPTAIN and CREW
4. **Expense Module** - The core feature with full CRUD
5. **Trips & Tasks** - Basic management features

## Database Models

The schema includes:

- **User** - Authentication and role management
- **Yacht** - Yacht information
- **Trip** - Charter/voyage tracking
- **Task** - Crew task management
- **ExpenseCategory** - Expense categorization
- **Expense** - Detailed expense tracking with receipts
- **ExpenseReceipt** - Receipt file attachments

All models include proper relations, foreign keys, and cascading behavior.

