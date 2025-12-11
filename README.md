# HelmOps - Helm Operations Management System

Production-ready helm operations management system for private and charter yachts.

## 🔗 Hızlı Link Paylaşımı

Karşı tarafa link göndermek için: **[SIMPLE-DEPLOY.md](./SIMPLE-DEPLOY.md)** dosyasına bakın.

**3 Adımda Link Hazır:**
1. GitHub'a push edin
2. Vercel'e deploy edin (2 dakika)
3. Link'i paylaşın ✅

## 🚀 Quick Start

### 1. Environment Setup

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/helmops?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"
```

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### 2. Database Setup

#### Option A: Local PostgreSQL (Docker)
```bash
docker run --name helmops-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=helmops -p 5432:5432 -d postgres:16
```

Then use:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/helmops?schema=public"
```

#### Option B: Cloud Database
- [Supabase](https://supabase.com) - Free PostgreSQL
- [Neon](https://neon.tech) - Serverless PostgreSQL

### 3. Run Migrations

```bash
npx prisma migrate dev --name init
```

### 4. Seed Database (Optional)

```bash
npm run db:seed
```

This creates:
- A yacht: "Sea Breeze"
- Owner: `owner@helmops.com` / `owner123`
- Captain: `captain@helmops.com` / `captain123`
- Crew: `crew@helmops.com` / `crew123`
- Expense categories
- Sample trip

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📋 Features

### ✅ Implemented (MVP)

- **Authentication & Authorization**
  - Email/password authentication
  - Role-based access control (OWNER, CAPTAIN, CREW)
  - Protected routes

- **Dashboards**
  - OWNER/CAPTAIN: Overview, pending expenses, recent expenses, upcoming trips
  - CREW: My tasks, my expenses, quick actions

- **Expense Management**
  - Expense category management (OWNER/CAPTAIN only)
  - Expense creation with full details
  - Expense list with filters (status, category, trip, date range, search)
  - Expense approval workflow (SUBMITTED → APPROVED/REJECTED)
  - Pending expenses review page
  - Multi-currency support with base currency conversion
  - VAT calculation
  - Reimbursable expenses tracking

### 🚧 Coming Soon

- Trips management (CRUD)
- Tasks management (CRUD)
- Receipt file upload
- Expense reporting (by category, by trip, reimbursable)
- Inventory management
- Maintenance logs
- Document management

## 🏗️ Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **Database:** PostgreSQL
- **ORM:** Prisma 7
- **Authentication:** NextAuth.js v5 (beta)
- **Forms:** React Hook Form + Zod
- **Date Handling:** date-fns

## 📁 Project Structure

```
helmops/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   └── dashboard/         # Protected dashboard pages
├── components/            # React components
│   ├── dashboard/        # Dashboard components
│   ├── expenses/         # Expense-related components
│   └── ui/               # shadcn/ui components
├── lib/                  # Utilities
│   ├── auth.ts          # Auth helpers
│   ├── auth-config.ts   # NextAuth configuration
│   └── db.ts            # Prisma client
├── prisma/              # Database
│   ├── schema.prisma    # Prisma schema
│   └── seed.ts          # Seed script
└── types/               # TypeScript types
```

## 🔐 Roles & Permissions

- **OWNER**: Full access, can manage users, approve expenses
- **CAPTAIN**: Can manage users, approve expenses, create trips/tasks
- **CREW**: Can create expenses, view assigned tasks, update task status

## 📱 PWA (Progressive Web App)

HelmOps bir PWA olarak çalışır ve cihazlara yüklenebilir.

### PWA Özellikleri

- ✅ Offline Support
- ✅ Install Prompt
- ✅ App Icons
- ✅ Standalone Mode
- ✅ Service Worker

### PWA Kurulumu

Detaylı kurulum için [PWA-SETUP.md](./PWA-SETUP.md) dosyasına bakın.

**Hızlı Başlangıç:**
1. Icon dosyalarını oluşturun (`public/icon-192.png`, `public/icon-512.png`)
2. `npm run build` ile production build oluşturun
3. HTTPS üzerinden deploy edin (Vercel/Netlify önerilir)
4. Tarayıcıdan "Install" butonuna tıklayın

## 📝 Notes

- The application is mobile-responsive and works as a PWA
- Expense module is the core feature and is fully functional
- Receipt upload functionality requires additional file storage setup (e.g., AWS S3, Cloudinary)
- PWA için icon dosyaları gereklidir (detaylar için PWA-SETUP.md)

## 🐛 Troubleshooting

### Prisma Client not found
```bash
npx prisma generate
```

### Database connection issues
- Check your `.env` file has correct `DATABASE_URL`
- Ensure PostgreSQL is running
- Verify connection string format

### NextAuth errors
- Ensure `NEXTAUTH_SECRET` is set in `.env`
- Check `NEXTAUTH_URL` matches your development URL

## 📄 License

Private project - All rights reserved
