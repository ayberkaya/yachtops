# 🔧 Supabase Connection Troubleshooting

Veritabanına erişilemiyor hatası alıyorsanız şunları kontrol edin:

## ✅ Kontrol Listesi

### 1. Supabase'de IP Allowlist Kontrolü

1. Supabase dashboard → Projeniz
2. Settings → Database
3. "Connection pooling" veya "Network restrictions" bölümüne gidin
4. **"Allow all IPs"** seçeneğini aktif edin (development için)
5. Veya Vercel IP'lerini allowlist'e ekleyin

### 2. Connection String Formatı

Supabase'de iki tür connection string var:

**Direct Connection (Port 5432):**
```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

**Pooler Connection (Port 6543 - Transaction mode):**
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

**Pooler Connection (Port 5432 - Session mode):**
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
```

### 3. Supabase'de Connection String Bulma

1. Supabase dashboard → Projeniz
2. Settings → Database
3. "Connection string" bölümünde:
   - **"URI"** formatını seçin
   - **"Transaction"** veya **"Session"** modunu seçin
   - Connection string'i kopyalayın

### 4. Vercel'de Environment Variable Güncelleme

1. Vercel dashboard → Projeniz → Settings → Environment Variables
2. `DATABASE_URL` değerini Supabase'den aldığınız connection string ile güncelleyin
3. **Önemli:** `[YOUR_PASSWORD]` yerine gerçek şifrenizi yazın
4. "Save" → "Redeploy"

## 🔍 Test Etme

Local'de test etmek için:

```bash
# Connection string'i test et
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

## 🐛 Yaygın Sorunlar

### Sorun: "Can't reach database server"

**Çözüm:**
- Supabase'de IP allowlist'i kontrol edin
- "Allow all IPs" seçeneğini aktif edin
- Connection string'in doğru olduğundan emin olun

### Sorun: "Authentication failed"

**Çözüm:**
- Şifrenin doğru olduğundan emin olun
- Connection string'de `[YOUR_PASSWORD]` placeholder'ını gerçek şifre ile değiştirin

### Sorun: "Connection timeout"

**Çözüm:**
- Pooler connection string kullanmayı deneyin (port 6543)
- Supabase'de database'in aktif olduğundan emin olun

