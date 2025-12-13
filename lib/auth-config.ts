import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "./db";
import { verifyPassword } from "./auth";
import { UserRole } from "@prisma/client";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email or Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          console.log("🔍 [AUTH] Authorize called with identifier:", credentials?.email);
          
          if (!credentials?.email || !credentials?.password) {
            console.log("❌ [AUTH] Missing credentials");
            return null;
          }

          const identifier = credentials.email as string;
          console.log("🔍 [AUTH] Looking up user by email or username:", identifier);
          const user = await db.user.findUnique({
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

          const resolvedUser =
            user ||
            (await db.user.findUnique({
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
            }));

          if (!resolvedUser) {
            console.log("❌ [AUTH] User not found:", identifier);
            return null; // NextAuth v5 will handle this
          }

          console.log("✅ [AUTH] User found:", resolvedUser.email, "Role:", resolvedUser.role);
          console.log("🔍 [AUTH] Password hash exists:", !!resolvedUser.passwordHash);

          if (resolvedUser.active === false) {
            console.log("❌ [AUTH] User inactive");
            return null;
          }

          console.log("🔐 [AUTH] Verifying password...");
          const isValid = await verifyPassword(
            credentials.password as string,
            resolvedUser.passwordHash
          );

          console.log("🔐 [AUTH] Password valid:", isValid);

          if (!isValid) {
            console.log("❌ [AUTH] Invalid password for:", identifier);
            return null; // NextAuth v5 will handle this
          }

          console.log("✅ [AUTH] Authorization successful for:", resolvedUser.email);
          const userObject = {
            id: resolvedUser.id,
            email: resolvedUser.email,
            username: resolvedUser.username,
            name: resolvedUser.name,
            role: resolvedUser.role,
            yachtId: resolvedUser.yachtId,
            tenantId: resolvedUser.yachtId, // alias tenant to yacht for multi-tenant isolation
            permissions: resolvedUser.permissions,
          };
          console.log("📤 [AUTH] Returning user object");
          return userObject;
        } catch (error) {
          console.error("❌ [AUTH] Auth error:", error);
          if (error instanceof Error) {
            console.error("❌ [AUTH] Error message:", error.message);
            console.error("❌ [AUTH] Error stack:", error.stack);
          }
          // Return null for any error - NextAuth v5 will handle it
          console.error("❌ [AUTH] Returning null due to error");
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      console.log("🔄 [AUTH] JWT callback called", { hasUser: !!user, tokenId: token.id });
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.yachtId = user.yachtId;
        token.tenantId = (user as any).tenantId ?? user.yachtId;
        token.permissions = user.permissions;
        console.log("✅ [AUTH] JWT token updated with user data");
      }
      return token;
    },
    async session({ session, token }) {
      console.log("🔄 [AUTH] Session callback called", { hasToken: !!token, tokenId: token.id });
      if (session.user && token.id) {
        // Fetch fresh user data from database to ensure name and other fields are up-to-date
        try {
          const freshUser = await db.user.findUnique({
            where: { id: token.id as string },
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              yachtId: true,
              permissions: true,
            },
          });

          if (freshUser) {
            session.user.id = freshUser.id;
            session.user.name = freshUser.name;
            session.user.email = freshUser.email;
            session.user.role = freshUser.role;
            session.user.yachtId = freshUser.yachtId;
            (session.user as any).tenantId = freshUser.yachtId;
            session.user.permissions = freshUser.permissions;
            console.log("✅ [AUTH] Session updated with fresh user data from database");
          } else {
            // Fallback to token data if user not found
            session.user.id = token.id as string;
            session.user.role = token.role as UserRole;
            session.user.yachtId = token.yachtId as string | null;
            (session.user as any).tenantId = (token as any).tenantId ?? token.yachtId ?? null;
            session.user.permissions = token.permissions as string | null | undefined;
            console.log("⚠️ [AUTH] User not found in database, using token data");
          }
        } catch (error) {
          console.error("❌ [AUTH] Error fetching fresh user data:", error);
          // Fallback to token data on error
          session.user.id = token.id as string;
          session.user.role = token.role as UserRole;
          session.user.yachtId = token.yachtId as string | null;
          (session.user as any).tenantId = (token as any).tenantId ?? token.yachtId ?? null;
          session.user.permissions = token.permissions as string | null | undefined;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "fallback-secret-for-development-only",
  trustHost: true, // Required for NextAuth v5 in development
  // Disable noisy debug logs by default; enable with NEXTAUTH_DEBUG=true if needed
  debug: process.env.NEXTAUTH_DEBUG === "true",
});

