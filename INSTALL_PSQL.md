# psql Kurulum Kılavuzu (macOS)

psql, PostgreSQL veritabanına bağlanmak için kullanılan komut satırı aracıdır.

## 🚀 Yöntem 1: Homebrew ile (Önerilen)

### Adım 1: Homebrew Kurulumu (Eğer yoksa)

```bash
# Homebrew yüklü mü kontrol et
brew --version

# Eğer yoksa, Homebrew'i yükle:
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### Adım 2: PostgreSQL Client Kurulumu

```bash
# Sadece psql client'ı yükle (PostgreSQL server değil)
brew install libpq

# PATH'e ekle (zsh kullanıyorsanız)
echo 'export PATH="/opt/homebrew/opt/libpq/bin:$PATH"' >> ~/.zshrc

# Veya bash kullanıyorsanız
echo 'export PATH="/opt/homebrew/opt/libpq/bin:$PATH"' >> ~/.bash_profile

# Terminal'i yeniden başlat veya:
source ~/.zshrc
```

### Adım 3: Kurulumu Doğrula

```bash
psql --version
```

## 🚀 Yöntem 2: PostgreSQL Tam Paketi (Server + Client)

Eğer PostgreSQL server'ı da istiyorsanız:

```bash
brew install postgresql@15
# veya
brew install postgresql@16

# PATH'e ekle
echo 'export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

## 🚀 Yöntem 3: Postgres.app (GUI + psql)

1. https://postgresapp.com/ adresinden indirin
2. Uygulamayı Applications klasörüne sürükleyin
3. Postgres.app'i açın
4. psql otomatik olarak PATH'e eklenir

## ✅ Kurulum Sonrası Test

```bash
# psql versiyonunu kontrol et
psql --version

# Supabase'e bağlanmayı test et
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require"
```

## 🔧 Troubleshooting

### "psql: command not found" hatası

```bash
# PATH'i kontrol et
echo $PATH

# libpq'nun nerede olduğunu bul
brew --prefix libpq

# Manuel olarak PATH'e ekle (yukarıdaki adımları tekrar yap)
```

### Intel Mac vs Apple Silicon

**Apple Silicon (M1/M2/M3):**
```bash
export PATH="/opt/homebrew/opt/libpq/bin:$PATH"
```

**Intel Mac:**
```bash
export PATH="/usr/local/opt/libpq/bin:$PATH"
```

## 📝 Migration'ları psql ile Uygulama

Kurulum tamamlandıktan sonra:

```bash
cd helmops

# DATABASE_URL'i set et (direct connection kullan)
export DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require"

# Tüm RLS enable migration'larını uygula
for file in prisma/migrations/20250115000002*/migration.sql; do
  echo "Applying: $file"
  psql "$DATABASE_URL" -f "$file"
done

# Policies migration'larını uygula
for file in prisma/migrations/2025011500000[3-9]*/migration.sql; do
  echo "Applying: $file"
  psql "$DATABASE_URL" -f "$file"
done
```

## 🎯 Hızlı Komut

```bash
# Tek seferde yükle ve PATH'e ekle
brew install libpq && echo 'export PATH="/opt/homebrew/opt/libpq/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc
```

---

**Not:** Homebrew yoksa önce Homebrew'i yükleyin. En kolay ve yaygın yöntem budur.





