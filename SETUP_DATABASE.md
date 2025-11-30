# Database Setup Guide

## Option 1: Docker (Recommended)

If you have Docker installed, run:

```bash
docker run --name yachtops-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=yachtops \
  -p 5432:5432 \
  -d postgres:16
```

Then update your `.env` file:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/yachtops?schema=public"
```

## Option 2: Local PostgreSQL

If you have PostgreSQL installed locally:

1. Create a database:
```bash
createdb yachtops
```

2. Update your `.env` file:
```env
DATABASE_URL="postgresql://your_username:your_password@localhost:5432/yachtops?schema=public"
```

## Option 3: Cloud Database (Supabase/Neon)

1. Create a free PostgreSQL database on [Supabase](https://supabase.com) or [Neon](https://neon.tech)
2. Copy the connection string
3. Update your `.env` file:
```env
DATABASE_URL="your_connection_string_here"
```

## After Setup

Run the migration:
```bash
cd yachtops
npx prisma migrate dev --name init
```

Then seed the database (optional):
```bash
npm run db:seed
```

