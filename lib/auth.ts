import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "./db";
import { verifyPassword } from "./auth-server";
import { UserRole } from "@prisma/client";
import jwt from "jsonwebtoken"; // BU PAKETİ YÜKLEMEN GEREKEBİLİR: npm install jsonwebtoken @types/jsonwebtoken

// Re-export client-safe utilities
export { canManageUsers, canApproveExpenses, hasAnyRole, canManageRoles } from "./auth-utils";

// ID Dönüştürücü Fonksiyon (Deterministik)
import { createHash } from "crypto";
function getUuidFromUserId(userId: string): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(userId)) return userId;
  const hash = createHash('sha1').update(userId).digest('hex');
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    '5' + hash.substring(13, 16),
    '8' + hash.substring(17, 20),
    hash.substring(20, 32),
  ].join('-');
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email or Username", type: "text" },
        password: { label: "Password", type: "password" },
        rememberMe: { label: "Remember Me", type: "text" },
      },
      async authorize(credentials) {
        // ... (Senin mevcut authorize kodun aynen kalıyor) ...
        const debugMode = process.env.NEXTAUTH_DEBUG === "true" || process.env.DEBUG_AUTH === "1";
        
        try {
          if (!credentials?.email || !credentials?.password) return null;
          const identifier = credentials.email as string;

          let user = await db.user.findUnique({
            where: { email: identifier },
            select: { id: true, email: true, username: true, name: true, role: true, yachtId: true, passwordHash: true, permissions: true, active: true },
          });

          if (!user) {
            user = await db.user.findUnique({
              where: { username: identifier },
              select: { id: true, email: true, username: true, name: true, role: true, yachtId: true, passwordHash: true, permissions: true, active: true },
            });
          }

          if (!user || user.active === false) return null;

          const isValid = await verifyPassword(credentials.password as string, user.passwordHash);
          if (!isValid) return null;

          return {
            id: user.id,
            email: user.email,
            username: user.username,
            name: user.name,
            role: user.role,
            yachtId: user.yachtId,
            tenantId: user.yachtId,
            permissions: user.permissions,
            rememberMe: credentials.rememberMe === "true" || credentials.rememberMe === true,
          };
        } catch (error) {
          console.error("❌ [AUTH] Critical auth error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // 1. Standart Token İşlemleri (Mevcut kodun)
      if (token.exp && typeof token.exp === 'number') {
        const now = Math.floor(Date.now() / 1000);
        if (token.exp < now) return null as any;
      }

      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        token.yachtId = user.yachtId;
        token.tenantId = (user as any).tenantId ?? user.yachtId;
        token.permissions = user.permissions;
        const rememberMe = (user as any).rememberMe ?? false;
        token.rememberMe = rememberMe;

        // ---------------------------------------------------------
        // YENİ EKLENEN KISIM: SUPABASE TOKEN İMZALAMA
        // ---------------------------------------------------------
        
        // NextAuth ID'sini Supabase UUID formatına çevir
        const supabaseUserId = getUuidFromUserId(user.id);

        // Payload oluştur
        const payload = {
          aud: "authenticated", // Supabase'in beklediği audience
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 1 Hafta geçerli
          sub: supabaseUserId, // Çevrilmiş UUID
          email: user.email,
          role: "authenticated", // Supabase rolü
          app_metadata: {
            provider: "email",
            providers: ["email"],
          },
          user_metadata: {
            name: user.name,
            // Buraya RLS'de kullanacağımız kritik veriyi ekliyoruz!
            yacht_id: user.yachtId // Artık veritabanında "auth.jwt() ->> 'yacht_id'" diyerek erişebileceğiz
          },
        };
        
        // Token'ı imzala (JWT Secret ile)
        // NOT: .env dosyanda SUPABASE_JWT_SECRET tanımlı olmalı!
        if (process.env.SUPABASE_JWT_SECRET) {
          token.supabaseAccessToken = jwt.sign(payload, process.env.SUPABASE_JWT_SECRET);
        } else {
            console.error("⚠️ SUPABASE_JWT_SECRET eksik! Dosya yükleme çalışmayacak.");
        }
        // ---------------------------------------------------------

        if (rememberMe) {
          token.exp = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
        } else {
          token.exp = Math.floor(Date.now() / 1000) + (24 * 60 * 60);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (!token || !token.id) return null as any;

      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = (token.email as string) || session.user.email;
        session.user.name = (token.name as string) || session.user.name;
        session.user.role = token.role as UserRole;
        session.user.yachtId = token.yachtId as string | null;
        (session.user as any).tenantId = (token as any).tenantId ?? token.yachtId ?? null;
        session.user.permissions = token.permissions as string | null | undefined;
        
        // Supabase Token'ı Session'a ekle (Client tarafında kullanmak için)
        (session as any).supabaseAccessToken = token.supabaseAccessToken;
      }
      return session;
    },
  },
  // ... (Diğer ayarların aynen kalıyor) ...
  pages: { signIn: "/auth/signin" },
  session: { strategy: "jwt", maxAge: 24 * 60 * 60, updateAge: 60 * 60 },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "fallback-secret",
  trustHost: true,
  debug: process.env.NEXTAUTH_DEBUG === "true",
});