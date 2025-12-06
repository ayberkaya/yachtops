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
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          console.log("🔍 [AUTH] Authorize called with email:", credentials?.email);
          
          if (!credentials?.email || !credentials?.password) {
            console.log("❌ [AUTH] Missing credentials");
            return null;
          }

          console.log("🔍 [AUTH] Looking up user:", credentials.email);
          const user = await db.user.findUnique({
            where: { email: credentials.email as string },
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              yachtId: true,
              passwordHash: true,
              permissions: true,
              active: true,
            },
          });

          if (!user) {
            console.log("❌ [AUTH] User not found:", credentials.email);
            return null; // NextAuth v5 will handle this
          }

          console.log("✅ [AUTH] User found:", user.email, "Role:", user.role);
          console.log("🔍 [AUTH] Password hash exists:", !!user.passwordHash);

          if (user.active === false) {
            console.log("❌ [AUTH] User inactive");
            return null;
          }

          console.log("🔐 [AUTH] Verifying password...");
          const isValid = await verifyPassword(
            credentials.password as string,
            user.passwordHash
          );

          console.log("🔐 [AUTH] Password valid:", isValid);

          if (!isValid) {
            console.log("❌ [AUTH] Invalid password for:", credentials.email);
            return null; // NextAuth v5 will handle this
          }

          console.log("✅ [AUTH] Authorization successful for:", user.email);
          const userObject = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            yachtId: user.yachtId,
            tenantId: user.yachtId, // alias tenant to yacht for multi-tenant isolation
            permissions: user.permissions,
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
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.yachtId = token.yachtId as string | null;
        (session.user as any).tenantId = (token as any).tenantId ?? token.yachtId ?? null;
        session.user.permissions = token.permissions as string | null | undefined;
        console.log("✅ [AUTH] Session updated with user data");
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

