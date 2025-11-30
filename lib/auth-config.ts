import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { CredentialsSignin } from "next-auth";
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
          console.log("🔍 Authorize called with email:", credentials?.email);
          
          if (!credentials?.email || !credentials?.password) {
            console.log("❌ Missing credentials");
            return null;
          }

          console.log("🔍 Looking up user:", credentials.email);
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
            },
          });

          if (!user) {
            console.log("❌ User not found:", credentials.email);
            throw new CredentialsSignin("Invalid email or password");
          }

          console.log("✅ User found:", user.email, "Role:", user.role);

          console.log("🔐 Verifying password...");
          const isValid = await verifyPassword(
            credentials.password as string,
            user.passwordHash
          );

          console.log("🔐 Password valid:", isValid);

          if (!isValid) {
            console.log("❌ Invalid password");
            throw new CredentialsSignin("Invalid email or password");
          }

          console.log("✅ Authorization successful for:", user.email);
          const userObject = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            yachtId: user.yachtId,
            permissions: user.permissions,
          };
          console.log("📤 Returning user object:", JSON.stringify(userObject, null, 2));
          return userObject;
        } catch (error) {
          console.error("❌ Auth error:", error);
          if (error instanceof Error) {
            console.error("Error message:", error.message);
            console.error("Error stack:", error.stack);
          }
          // Re-throw CredentialsSignin errors
          if (error instanceof CredentialsSignin) {
            throw error;
          }
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.yachtId = user.yachtId;
        token.permissions = user.permissions;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.yachtId = token.yachtId as string | null;
        session.user.permissions = token.permissions as string | null | undefined;
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
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  trustHost: true, // Required for NextAuth v5 in development
});

