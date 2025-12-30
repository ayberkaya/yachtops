# Vercel Environment Variables Checklist

## 🔴 CRITICAL - Authentication için gerekli

Bu environment variable'lar **mutlaka** Vercel'de tanımlı olmalı, yoksa authentication çalışmaz:

### 1. NextAuth Configuration
```env
NEXTAUTH_SECRET=your-secret-key-here-min-32-chars
NEXTAUTH_URL=https://helmops.com
```

**Nasıl oluşturulur:**
```bash
# NEXTAUTH_SECRET oluştur
openssl rand -base64 32
```

**Önemli:**
- `NEXTAUTH_SECRET` en az 32 karakter olmalı
- `NEXTAUTH_URL` production URL'iniz olmalı (https://helmops.com)
- Local'de `http://localhost:3000` kullanabilirsiniz

### 2. Database Connection
```env
DATABASE_URL=postgresql://user:password@host:5432/database?schema=public
```

**Önemli:**
- Supabase kullanıyorsanız, Supabase Dashboard'dan connection string'i alın
- Connection string'de SSL parametreleri olabilir: `?sslmode=require`

### 3. Supabase (Opsiyonel ama önerilir)
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
```

**Önemli:**
- `SUPABASE_JWT_SECRET` Supabase Dashboard → Settings → API → JWT Secret'tan alınır
- Bu değişkenler RLS (Row Level Security) için gerekli

## 🟡 IMPORTANT - Feature'lar için gerekli

Bu environment variable'lar eksikse bazı feature'lar çalışmaz:

### 4. OpenAI (Voice Task için)
```env
OPENAI_API_KEY=sk-...
```

**Önemli:**
- Voice Task (Premium) feature'ı için gerekli
- Authentication sorununa neden olmaz, sadece voice task çalışmaz

### 5. Email (Opsiyonel)
```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
SMTP_FROM=noreply@helmops.com
```

## ✅ Vercel'de Nasıl Eklenir?

1. Vercel Dashboard'a gidin
2. Projenizi seçin
3. **Settings** → **Environment Variables**
4. Her bir variable'ı ekleyin:
   - **Name**: Variable adı (örn: `NEXTAUTH_SECRET`)
   - **Value**: Variable değeri
   - **Environment**: Production, Preview, Development (hepsini seçin)

## 🔍 Kontrol Listesi

Production'da authentication çalışması için şunlar **mutlaka** olmalı:

- [ ] `NEXTAUTH_SECRET` (en az 32 karakter)
- [ ] `NEXTAUTH_URL` (https://helmops.com)
- [ ] `DATABASE_URL` (PostgreSQL connection string)

Opsiyonel ama önerilir:

- [ ] `SUPABASE_JWT_SECRET`
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`

Feature'lar için:

- [ ] `OPENAI_API_KEY` (Voice Task için)

## 🚨 Sorun Giderme

### "Could not authenticate user" hatası alıyorsanız:

1. **NEXTAUTH_SECRET kontrolü:**
   ```bash
   # Local'de test edin
   echo $NEXTAUTH_SECRET
   # Vercel'de de aynı değer olmalı
   ```

2. **NEXTAUTH_URL kontrolü:**
   - Production'da: `https://helmops.com`
   - Local'de: `http://localhost:3000`
   - **Önemli:** Trailing slash olmamalı!

3. **Database bağlantısı:**
   - Vercel logs'da database connection error'ları var mı kontrol edin
   - `DATABASE_URL` doğru mu?

4. **Vercel'de redeploy:**
   - Environment variable ekledikten sonra **mutlaka redeploy** yapın
   - Vercel → Deployments → Redeploy

## 📝 Notlar

- Environment variable'ları ekledikten sonra **mutlaka redeploy** yapın
- Production ve Preview environment'ları için ayrı ayrı ekleyin
- Sensitive variable'ları asla commit etmeyin (`.env.local` gitignore'da olmalı)

