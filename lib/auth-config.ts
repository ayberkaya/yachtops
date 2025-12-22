import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "./db";
import { verifyPassword } from "./auth-server";
import { UserRole } from "@prisma/client";

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
        const debugMode = process.env.NEXTAUTH_DEBUG === "true" || process.env.DEBUG_AUTH === "1";
        
        try {
          if (debugMode) {
            console.log("🔍 [AUTH] Authorize called with identifier:", credentials?.email);
          }
          
          if (!credentials?.email || !credentials?.password) {
            console.error("❌ [AUTH] Missing credentials - email or password not provided");
            return null;
          }

          const identifier = credentials.email as string;
          if (debugMode) {
            console.log("🔍 [AUTH] Looking up user by email or username:", identifier);
          }
          
          // Enhanced error handling for database queries
          let user;
          try {
            user = await db.user.findUnique({
              where: {
                // allow login with email or username
                email: identifier,
                // username handled below via fallback query
              },
              select: {
                id: true,
                email: true,
                username: true,
                name: true,
                role: true,
                yachtId: true,
                passwordHash: true,
                permissions: true,
                active: true,
              },
            });
          } catch (dbError) {
            console.error("❌ [AUTH] Database query error (email lookup):", dbError instanceof Error ? dbError.message : String(dbError));
            if (dbError instanceof Error) {
              console.error("❌ [AUTH] Database error stack:", dbError.stack);
            }
            throw dbError; // Re-throw to be caught by outer catch
          }

          let resolvedUser = user;
          
          // Fallback to username lookup if email lookup failed
          if (!resolvedUser) {
            try {
              resolvedUser = await db.user.findUnique({
                where: { username: identifier },
                select: {
                  id: true,
                  email: true,
                  username: true,
                  name: true,
                  role: true,
                  yachtId: true,
                  passwordHash: true,
                  permissions: true,
                  active: true,
                },
              });
            } catch (dbError) {
              console.error("❌ [AUTH] Database query error (username lookup):", dbError instanceof Error ? dbError.message : String(dbError));
              throw dbError; // Re-throw to be caught by outer catch
            }
          }

          if (!resolvedUser) {
            console.error(`❌ [AUTH] User not found: ${identifier} (checked both email and username)`);
            return null; // NextAuth v5 will handle this
          }

          if (debugMode) {
            console.log("✅ [AUTH] User found:", resolvedUser.email, "Role:", resolvedUser.role);
          }

          if (resolvedUser.active === false) {
            console.error(`❌ [AUTH] User inactive: ${resolvedUser.email}`);
            return null;
          }

          const isValid = await verifyPassword(
            credentials.password as string,
            resolvedUser.passwordHash
          );

          if (!isValid) {
            console.error(`❌ [AUTH] Invalid password for: ${identifier}`);
            return null; // NextAuth v5 will handle this
          }

          if (debugMode) {
            console.log("✅ [AUTH] Authorization successful for:", resolvedUser.email);
          }
          const userObject = {
            id: resolvedUser.id,
            email: resolvedUser.email,
            username: resolvedUser.username,
            name: resolvedUser.name,
            role: resolvedUser.role,
            yachtId: resolvedUser.yachtId,
            tenantId: resolvedUser.yachtId, // alias tenant to yacht for multi-tenant isolation
            permissions: resolvedUser.permissions,
            rememberMe: credentials.rememberMe === "true" || credentials.rememberMe === true,
          };
          return userObject;
        } catch (error) {
          // Always log errors, not just in debug mode
          console.error("❌ [AUTH] Critical auth error:", error);
          if (error instanceof Error) {
            console.error("❌ [AUTH] Error message:", error.message);
            console.error("❌ [AUTH] Error stack:", error.stack);
            // Check for common Prisma errors
            if (error.message.includes("PrismaClient")) {
              console.error("❌ [AUTH] Prisma Client error - ensure Prisma Client is generated: npx prisma generate");
            }
            if (error.message.includes("connection") || error.message.includes("timeout")) {
              console.error("❌ [AUTH] Database connection error - check DATABASE_URL");
            }
            if (error.message.includes("relation") && error.message.includes("does not exist")) {
              console.error("❌ [AUTH] Database table missing - run migrations: npx prisma migrate deploy");
            }
          }
          // Return null for any error - NextAuth v5 will handle it
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Always check token expiration first
      if (token.exp && typeof token.exp === 'number') {
        const now = Math.floor(Date.now() / 1000);
        if (token.exp < now) {
          // Token expired, return null to invalidate session
          if (process.env.NEXTAUTH_DEBUG === "true") {
            console.log("❌ [AUTH] Token expired, invalidating session");
          }
          return null as any;
        }
      }

      // If token exists but has no expiration, set a default (shouldn't happen, but safety check)
      if (token && !token.exp) {
        // If no expiration set, default to 24 hours (session cookie)
        token.exp = Math.floor(Date.now() / 1000) + (24 * 60 * 60);
      }

      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        token.yachtId = user.yachtId;
        token.tenantId = (user as any).tenantId ?? user.yachtId;
        token.permissions = user.permissions;
        // Get rememberMe from user object (passed via credentials in signIn)
        const rememberMe = (user as any).rememberMe ?? false;
        token.rememberMe = rememberMe;
        // Set token expiration based on rememberMe
        // If rememberMe is false, token expires in 24 hours (session cookie - expires when browser closes)
        // If rememberMe is true, token expires in 30 days (persistent cookie)
        if (rememberMe) {
          token.exp = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // 30 days
          // Set cookie maxAge for persistent cookie
          if (typeof (token as any).cookieMaxAge === 'undefined') {
            (token as any).cookieMaxAge = 30 * 24 * 60 * 60; // 30 days in seconds
          }
        } else {
          token.exp = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 24 hours
          // No cookie maxAge - session cookie (expires when browser closes)
          (token as any).cookieMaxAge = undefined;
        }
      }
      // Handle session updates
      if (trigger === "update" && session) {
        if (session.rememberMe !== undefined) {
          token.rememberMe = session.rememberMe;
          if (session.rememberMe) {
            token.exp = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
          } else {
            token.exp = Math.floor(Date.now() / 1000) + (24 * 60 * 60);
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      try {
        // If token is null or expired, return null session
        if (!token || !token.id) {
          return null as any;
        }

        // Check if token is expired
        if (token.exp && typeof token.exp === 'number') {
          const now = Math.floor(Date.now() / 1000);
          if (token.exp < now) {
            return null as any;
          }
        }

        if (session.user && token.id) {
          // Use token data directly - no DB query needed for performance
          // Token already contains all necessary user data from JWT callback
          session.user.id = token.id as string;
          session.user.email = (token.email as string) || session.user.email;
          session.user.name = (token.name as string) || session.user.name;
          session.user.role = token.role as UserRole;
          session.user.yachtId = token.yachtId as string | null;
          (session.user as any).tenantId = (token as any).tenantId ?? token.yachtId ?? null;
          session.user.permissions = token.permissions as string | null | undefined;
          
          // Only fetch from DB if critical data is missing (shouldn't happen normally)
          const hasAllData = token.id && token.role && (token.email || session.user.email);
          if (!hasAllData && db && typeof db.user?.findUnique === 'function') {
            try {
              const freshUser = await Promise.race([
                db.user.findUnique({
                  where: { id: token.id as string },
                  select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    yachtId: true,
                    permissions: true,
                  },
                }),
                new Promise<null>((resolve) => 
                  setTimeout(() => resolve(null), 2000)
                ),
              ]);
              
              if (freshUser) {
                session.user.id = freshUser.id;
                session.user.name = freshUser.name;
                session.user.email = freshUser.email;
                session.user.role = freshUser.role;
                session.user.yachtId = freshUser.yachtId;
                (session.user as any).tenantId = freshUser.yachtId;
                session.user.permissions = freshUser.permissions;
              }
            } catch (error) {
              console.error("❌ [AUTH] Error fetching user data:", error);
            }
          }
        }
        return session;
      } catch (error) {
        // Ultimate fallback - ensure we always return a valid session
        console.error("❌ [AUTH] Critical error in session callback:", error);
        if (session.user && token.id) {
          session.user.id = token.id as string;
          session.user.role = (token.role as UserRole) || UserRole.CREW;
          session.user.yachtId = (token.yachtId as string | null) || null;
          (session.user as any).tenantId = (token as any).tenantId ?? token.yachtId ?? null;
          session.user.permissions = (token.permissions as string | null | undefined) || null;
        }
        return session;
      }
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
    // maxAge is set to 24 hours for session cookies (when rememberMe is false)
    // When rememberMe is true, token.exp is set to 30 days in JWT callback
    maxAge: 24 * 60 * 60, // 24 hours (session cookie - expires when browser closes)
    updateAge: 60 * 60, // Update session every 1 hour to check expiration
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        // By default, no maxAge - session cookie (expires when browser closes)
        // When rememberMe is true, we'll handle it via token expiration
      },
    },
  },
  secret: (() => {
    const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
    if (!secret) {
      if (process.env.NODE_ENV === "production") {
        throw new Error(
          "NEXTAUTH_SECRET or AUTH_SECRET must be set in production environment. " +
          "Generate one with: openssl rand -base64 32"
        );
      }
      console.warn(
        "⚠️ [SECURITY] NEXTAUTH_SECRET not set. Using fallback secret for development only. " +
        "This MUST be set in production!"
      );
      return "fallback-secret-for-development-only";
    }
    return secret;
  })(),
  trustHost: true, // Required for NextAuth v5 in development
  // Disable noisy debug logs by default; enable with NEXTAUTH_DEBUG=true if needed
  debug: process.env.NEXTAUTH_DEBUG === "true",
});

