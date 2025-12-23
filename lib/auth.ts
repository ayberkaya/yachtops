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
      // [AUTH DEBUG] Log 1: JWT Callback Triggered
      console.log("[AUTH DEBUG] JWT Callback Triggered");
      
      // [AUTH DEBUG] Log 2: Secret Length (DO NOT log actual secret)
      console.log("[AUTH DEBUG] Secret Length:", process.env.SUPABASE_JWT_SECRET?.length || 0);
      
      // [AUTH DEBUG] Log 3: User present
      console.log("[AUTH DEBUG] User present:", !!user);
      
      // [AUTH DEBUG] Log 4: Existing Token present
      console.log("[AUTH DEBUG] Existing Token present:", !!token.supabaseAccessToken);
      
      // 1. Validate NextAuth token expiration
      if (token.exp && typeof token.exp === 'number') {
        const now = Math.floor(Date.now() / 1000);
        if (token.exp < now) return null as any;
      }

      // 2. Update token with user data on login
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

        if (rememberMe) {
          token.exp = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
        } else {
          token.exp = Math.floor(Date.now() / 1000) + (24 * 60 * 60);
        }
      }

      // 3. CRITICAL: Handle Supabase Access Token (Persistent Signing Logic)
      const jwtSecret = process.env.SUPABASE_JWT_SECRET;
      
      if (!jwtSecret) {
        console.error("❌ [JWT Callback] SUPABASE_JWT_SECRET is missing! This is a configuration error.");
        // If no secret and no existing token, we cannot proceed - this should never happen in production
        if (!token.supabaseAccessToken) {
          throw new Error("SUPABASE_JWT_SECRET is missing and no existing token found. Please configure SUPABASE_JWT_SECRET in your .env file.");
        }
        // Preserve existing token if available
        console.warn("⚠️ [JWT Callback] Using existing token, but cannot regenerate without JWT_SECRET.");
        return token;
      }

      // Step A: Check if token exists and is valid
      let shouldRegenerateToken = false;
      
      if (token.supabaseAccessToken) {
        try {
          // Verify token is not expired by decoding it
          const decoded = jwt.decode(token.supabaseAccessToken as string) as { exp?: number } | null;
          if (decoded && decoded.exp) {
            const now = Math.floor(Date.now() / 1000);
            const timeUntilExpiry = decoded.exp - now;
            // Regenerate if expires within 1 hour (refresh proactively)
            if (timeUntilExpiry < 3600) {
              console.log("🔄 [JWT Callback] Supabase token expires soon, regenerating...");
              shouldRegenerateToken = true;
            } else {
              console.log("✅ [JWT Callback] Existing Supabase token is valid (expires in", Math.floor(timeUntilExpiry / 3600), "hours)");
            }
          } else {
            // Token exists but can't decode expiration, regenerate to be safe
            console.log("⚠️ [JWT Callback] Cannot decode Supabase token expiration, regenerating...");
            shouldRegenerateToken = true;
          }
        } catch (error) {
          // Token exists but is invalid, regenerate
          console.log("⚠️ [JWT Callback] Supabase token decode failed, regenerating...", error);
          shouldRegenerateToken = true;
        }
      } else {
        // Token is missing, must generate
        console.log("🆕 [JWT Callback] Supabase token missing, generating new token...");
        // [AUTH DEBUG] Crucial: Log when attempting to sign NEW token
        console.log("[AUTH DEBUG] Attempting to sign NEW token...");
        shouldRegenerateToken = true;
      }

      // Step B: Generate new token if needed
      if (shouldRegenerateToken) {
        // Determine user data source (from user on login, or from token on refresh)
        const userId = user?.id || token.id;
        const userEmail = user?.email || token.email;
        const userName = user?.name || token.name;
        const yachtId = user?.yachtId || token.yachtId;

        if (!userId || !userEmail) {
          console.error("❌ [JWT Callback] Cannot generate Supabase token: missing userId or email");
          return token;
        }

        // Convert NextAuth ID to Supabase UUID format
        const supabaseUserId = getUuidFromUserId(userId as string);

        // Create payload for Supabase JWT
        const payload = {
          aud: "authenticated",
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days validity
          sub: supabaseUserId,
          email: userEmail,
          role: "authenticated",
          app_metadata: {
            provider: "email",
            providers: ["email"],
          },
          user_metadata: {
            name: userName,
            yacht_id: yachtId, // Critical for RLS policies
          },
        };

        // Sign the token
        try {
          token.supabaseAccessToken = jwt.sign(payload, jwtSecret);
          console.log("🎫 [JWT Callback] New Supabase token signed successfully (Length:", (token.supabaseAccessToken as string).length + ")");
        } catch (error) {
          // [AUTH DEBUG] Log specific error if signing fails
          console.error("[AUTH DEBUG] Token signing FAILED with error:", error);
          console.error("❌ [JWT Callback] Failed to sign Supabase token:", error);
          // If signing fails and no existing token, throw error
          if (!token.supabaseAccessToken) {
            throw new Error("Failed to generate Supabase access token. Check JWT_SECRET configuration.");
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      // [AUTH DEBUG] Log 1: Session Callback Triggered
      console.log("[AUTH DEBUG] Session Callback Triggered");
      
      // [AUTH DEBUG] Log 2: Token passed to session
      console.log("[AUTH DEBUG] Token passed to session:", !!token.supabaseAccessToken);
      
      if (!token || !token.id) return null as any;

      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = (token.email as string) || session.user.email;
        session.user.name = (token.name as string) || session.user.name;
        session.user.role = token.role as UserRole;
        session.user.yachtId = token.yachtId as string | null;
        (session.user as any).tenantId = (token as any).tenantId ?? token.yachtId ?? null;
        session.user.permissions = token.permissions as string | null | undefined;
        
        // Pass Supabase Access Token to session (for client-side use)
        if (!token.supabaseAccessToken) {
          console.error("❌ [Session Callback] token.supabaseAccessToken is missing! This should not happen if JWT_SECRET is configured.");
          throw new Error("Supabase access token is missing from JWT token. Please check your authentication configuration.");
        }
        session.supabaseAccessToken = token.supabaseAccessToken as string;
        console.log("✅ [Session Callback] Session Token Set (Length:", session.supabaseAccessToken.length + ")");
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